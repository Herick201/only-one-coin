import { createHash } from "node:crypto";
import type { ReceiptExifFacts } from "@ooc/domain";
import exifr from "exifr";
import sharp from "sharp";

/**
 * The receipt's fingerprint (OOC-22): what the screening compares one
 * receipt against every other with. Computed in the normalize worker, the
 * one place the bytes pass through a process (apps/api/CLAUDE.md, "Upload").
 */
export interface ReceiptFingerprint {
  /** Of the raw upload — a byte-identical resend matches exactly. */
  sha256: string;
  /** 64-bit DCT perceptual hash of the whole normalized image, as the signed
   * bigint Postgres stores. */
  phash: bigint;
  /** The same hash over sub-rectangles of the image (`CROP_BOXES`). */
  crops: bigint[];
}

/**
 * Two hashes this close (Hamming distance, out of 64 bits) are "the same
 * picture" for the screening. Measured on synthetic Yape-style screenshots
 * (src/tests/receipt-fingerprint.test.ts, three fonts): recompression,
 * brightness, resizing and top/bottom crops up to 20% land at 0–6; a bank
 * transfer lands at ~22. What no threshold can do is tell two Yape receipts
 * apart — another student, even another price, lands at 0–4, because the
 * layout dominates a 32×32 hash — and a crop outside `CROP_BOXES` (past 20%,
 * or side trims between steps) drifts to 10–16. That is why `similar_image` is
 * evidence for the reviewer and never routes a payment (decision
 * 30/09/2026, packages/domain/src/enrollment/ReceiptScreening.ts).
 */
export const SIMILAR_IMAGE_MAX_DISTANCE = 6;

/**
 * Fractions trimmed from (top, bottom, sides) of the stored image. A resend
 * that was cropped is, give or take half a step, one of these rectangles of
 * the original — so its whole-image hash lands near one of the original's
 * crop hashes. Screenshots are cropped mostly top and bottom (status bar,
 * navigation bar), hence the finer vertical steps — 5%, not 10%: at 10% a
 * status-bar crop (~5%) fell right between two steps and drifted to 8–10
 * with some fonts; sides are trimmed symmetrically, since a one-sided
 * side crop of a centred receipt layout is rare. The whole image (0, 0, 0) is `phash`, not repeated here.
 */
const CROP_BOXES: ReadonlyArray<readonly [top: number, bottom: number, sides: number]> = [0, 0.05, 0.1, 0.15, 0.2]
  .flatMap((top) => [0, 0.05, 0.1, 0.15, 0.2].flatMap((bottom) => [0, 0.08].map((sides) => [top, bottom, sides] as const)))
  .filter(([top, bottom, sides]) => top + bottom + sides > 0);

const HASH_INPUT = 32;
const HASH_BITS_SIDE = 8;

/** cos((2x + 1) · u · π / 2N), precomputed for the 8 lowest frequencies. */
const COSINES: number[][] = Array.from({ length: HASH_BITS_SIDE }, (_, u) =>
  Array.from({ length: HASH_INPUT }, (_, x) => Math.cos(((2 * x + 1) * u * Math.PI) / (2 * HASH_INPUT))),
);

/** `normalized` is the worker's output (greyscale, ≤1000px JPEG); `raw` is
 * the upload as it arrived, before any of that. */
export async function fingerprintReceiptImage(raw: Buffer, normalized: Buffer): Promise<ReceiptFingerprint> {
  const { width, height } = await sharp(normalized).metadata();
  if (!width || !height) {
    throw new Error("Normalized receipt image has no dimensions");
  }

  const crops: bigint[] = [];
  for (const [top, bottom, sides] of CROP_BOXES) {
    const left = Math.round(width * sides);
    const cropTop = Math.round(height * top);
    const cropWidth = width - 2 * left;
    const cropHeight = height - cropTop - Math.round(height * bottom);
    crops.push(
      await perceptualHash(
        sharp(normalized).extract({ left, top: cropTop, width: cropWidth, height: cropHeight }),
      ),
    );
  }

  return {
    sha256: createHash("sha256").update(raw).digest("hex"),
    phash: await perceptualHash(sharp(normalized)),
    crops,
  };
}

/**
 * The classic DCT pHash: shrink to 32×32 greyscale, take the 8×8 lowest
 * frequencies of the 2-D DCT, one bit per coefficient above their median
 * (the DC term excluded from the median, as it only measures brightness).
 */
export async function perceptualHash(image: sharp.Sharp): Promise<bigint> {
  const pixels = await image
    .greyscale()
    .resize(HASH_INPUT, HASH_INPUT, { fit: "fill" })
    .raw()
    .toBuffer();

  const coefficients: number[] = [];
  for (let u = 0; u < HASH_BITS_SIDE; u++) {
    for (let v = 0; v < HASH_BITS_SIDE; v++) {
      let sum = 0;
      for (let y = 0; y < HASH_INPUT; y++) {
        const rowCos = COSINES[v]![y]!;
        for (let x = 0; x < HASH_INPUT; x++) {
          sum += pixels[y * HASH_INPUT + x]! * COSINES[u]![x]! * rowCos;
        }
      }
      coefficients.push(sum);
    }
  }

  const sorted = coefficients.slice(1).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)]!;

  let hash = 0n;
  coefficients.forEach((coefficient, bit) => {
    if (coefficient > median) {
      hash |= 1n << BigInt(bit);
    }
  });

  // Postgres bigint is signed; the bit pattern is what matters.
  return BigInt.asIntN(64, hash);
}

/**
 * How far apart two receipts are: the closest of whole-vs-whole,
 * whole-vs-each-crop of the other, both ways round — the new receipt may be
 * a crop of the old one, or the old one a crop of the new. The SQL in
 * `DrizzleReceiptScreeningRepository.findLookalikes` is this function; the
 * two change together.
 */
export function fingerprintDistance(a: Pick<ReceiptFingerprint, "phash" | "crops">, b: Pick<ReceiptFingerprint, "phash" | "crops">): number {
  return Math.min(
    hammingDistance(a.phash, b.phash),
    ...b.crops.map((crop) => hammingDistance(a.phash, crop)),
    ...a.crops.map((crop) => hammingDistance(crop, b.phash)),
  );
}

export function hammingDistance(a: bigint, b: bigint): number {
  let diff = BigInt.asUintN(64, a ^ b);
  let count = 0;
  while (diff !== 0n) {
    count += Number(diff & 1n);
    diff >>= 1n;
  }
  return count;
}

/**
 * The EXIF fields the screening reads, from the raw upload — the normalize
 * step strips everything after this. `null` when the file carries no EXIF
 * (every screenshot and every photo forwarded through WhatsApp), which is
 * never a signal on its own. GPS and device identifiers are never read.
 */
export async function readExifFacts(raw: Buffer): Promise<ReceiptExifFacts | null> {
  let tags: Record<string, unknown> | undefined;
  try {
    tags = (await exifr.parse(raw, { pick: ["Software", "DateTimeOriginal", "ModifyDate"] })) as
      | Record<string, unknown>
      | undefined;
  } catch {
    // Malformed metadata is not the receipt's problem — the image already
    // decoded (normalizeReceiptImage), so screening just goes without it.
    return null;
  }

  if (!tags) {
    return null;
  }

  const facts: ReceiptExifFacts = {
    software: typeof tags.Software === "string" ? tags.Software : null,
    capturedAt: isoOrNull(tags.DateTimeOriginal),
    modifiedAt: isoOrNull(tags.ModifyDate),
  };

  return facts.software === null && facts.capturedAt === null && facts.modifiedAt === null ? null : facts;
}

function isoOrNull(value: unknown): string | null {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString() : null;
}
