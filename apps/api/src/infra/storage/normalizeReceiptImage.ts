import { fileTypeFromBuffer } from "file-type";
import heicConvert from "heic-convert";
import sharp from "sharp";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/heic", "image/heif"]);

/** apps/api/CLAUDE.md, "Pré-processar sempre": downscale ~1000px. */
const TARGET_WIDTH = 1000;
const JPEG_QUALITY = 82;

export type NormalizeReceiptImageResult =
  | { ok: true; buffer: Buffer; contentType: "image/jpeg" }
  | { ok: false; reason: "invalid_file_type" | "decode_failed" };

/**
 * apps/api/CLAUDE.md, "Pré-processar sempre": downscale ~1000px, escala de
 * cinza, strip EXIF, converter HEIC. Runs only inside the normalize worker,
 * never the request/response path (CLAUDE.md §6) — this is the one place in
 * the whole feature where the file's bytes actually pass through a process,
 * and it happens off the request that would otherwise fall over under
 * volume.
 *
 * The accept/reject decision is made here, from the bytes themselves — a
 * client can claim any `Content-Type` at upload time, but sniffing magic
 * bytes after the fact is the only check a renamed extension or a forged
 * header cannot spoof.
 *
 * `.rotate()` with no arguments auto-orients from the EXIF orientation tag
 * before sharp drops the rest of it — otherwise a portrait iPhone photo
 * would come out sideways the moment its metadata is gone. Sharp strips all
 * other metadata by default; `.withMetadata()` is never called here.
 */
export async function normalizeReceiptImage(raw: Buffer): Promise<NormalizeReceiptImageResult> {
  const detected = await fileTypeFromBuffer(raw);
  if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
    return { ok: false, reason: "invalid_file_type" };
  }

  try {
    const isHeic = detected.mime === "image/heic" || detected.mime === "image/heif";
    // heic-convert bundles its own WASM HEIF decoder rather than depending on
    // the host's libvips being built with libheif — the same photo has to
    // decode the same way on a laptop and on the Fly.io image (CLAUDE.md §1,
    // "uma foto HEIC de iPhone é convertida com sucesso").
    const decodable = isHeic ? Buffer.from(await heicConvert({ buffer: raw, format: "JPEG", quality: 0.92 })) : raw;

    const buffer = await sharp(decodable)
      .rotate()
      .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
      .grayscale()
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    return { ok: true, buffer, contentType: "image/jpeg" };
  } catch {
    return { ok: false, reason: "decode_failed" };
  }
}
