import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import {
  SIMILAR_IMAGE_MAX_DISTANCE,
  fingerprintDistance,
  fingerprintReceiptImage,
  readExifFacts,
  type ReceiptFingerprint,
} from "@/infra/storage/fingerprintReceiptImage.js";
import { normalizeReceiptImage } from "@/infra/storage/normalizeReceiptImage.js";

/**
 * OOC-22's acceptance criterion — "the same receipt, resent cropped or
 * slightly altered, is caught" — measured on synthetic Yape-style
 * screenshots run through the real normalize step, the same bytes the worker
 * fingerprints. These numbers are what SIMILAR_IMAGE_MAX_DISTANCE was picked
 * from; if the hash changes, this suite says whether the threshold still
 * holds.
 *
 * Every case runs once per font: the SVG fixtures are rendered by librsvg
 * with whatever fonts the machine has, so the "same" receipt is a different
 * image on a Windows laptop and on the Ubuntu CI runner (which has no
 * Arial). Running several fonts everywhere is what keeps a margin that only
 * holds for one rendering from passing locally and failing in CI — which is
 * exactly how the original 10%-step crop grid slipped through.
 */

const FONTS = ["Arial", "DejaVu Sans", "monospace"];

interface ReceiptDrawing {
  amount: string;
  operation: string;
  time: string;
  recipient?: string;
}

function yapeScreenshot(font: string, receipt: ReceiptDrawing): Buffer {
  const recipient = receipt.recipient ?? "INGLES POR UN SOL SAC";
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1480">
    <rect width="720" height="1480" fill="#742284"/>
    <text x="30" y="40" font-size="26" fill="#fff" font-family="${font}">${receipt.time}</text>
    <rect x="600" y="18" width="80" height="28" rx="6" fill="#fff"/>
    <rect x="40" y="220" width="640" height="900" rx="30" fill="#fff"/>
    <text x="360" y="330" font-size="44" text-anchor="middle" fill="#742284" font-family="${font}">Yapeaste!</text>
    <text x="360" y="470" font-size="96" text-anchor="middle" fill="#222" font-family="${font}" font-weight="bold">S/ ${receipt.amount}</text>
    <text x="360" y="580" font-size="36" text-anchor="middle" fill="#222" font-family="${font}">${recipient}</text>
    <text x="360" y="680" font-size="28" text-anchor="middle" fill="#555" font-family="${font}">30 sep. 2026 - ${receipt.time}</text>
    <text x="120" y="820" font-size="26" fill="#555" font-family="${font}">Nro. de operacion</text>
    <text x="600" y="820" font-size="26" text-anchor="end" fill="#222" font-family="${font}">${receipt.operation}</text>
    <rect x="0" y="1400" width="720" height="80" fill="#000"/>
  </svg>`);
}

function bankTransfer(font: string): Buffer {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1300">
    <rect width="1080" height="1300" fill="#fff"/>
    <rect width="1080" height="200" fill="#002a8d"/>
    <text x="60" y="130" font-size="64" fill="#ff7800" font-family="${font}">BCP</text>
    <text x="60" y="360" font-size="40" fill="#222" font-family="${font}">Constancia de transferencia</text>
    <text x="60" y="520" font-size="36" fill="#555" font-family="${font}">Monto</text>
    <text x="1020" y="520" font-size="36" text-anchor="end" fill="#222" font-family="${font}">S/ 150.00</text>
    <text x="60" y="620" font-size="36" fill="#555" font-family="${font}">Operacion</text>
    <text x="1020" y="620" font-size="36" text-anchor="end" fill="#222" font-family="${font}">00451267</text>
  </svg>`);
}

/** What the worker does: raw → normalize → fingerprint. */
async function fingerprint(raw: Buffer): Promise<ReceiptFingerprint> {
  const normalized = await normalizeReceiptImage(raw);
  if (!normalized.ok) {
    throw new Error(`fixture failed to normalize: ${normalized.reason}`);
  }
  return fingerprintReceiptImage(raw, normalized.buffer);
}

async function png(svg: Buffer): Promise<Buffer> {
  return sharp(svg).png().toBuffer();
}

async function crop(image: Buffer, box: { left: number; top: number; right: number; bottom: number }): Promise<Buffer> {
  const { width, height } = await sharp(image).metadata();
  return sharp(image)
    .extract({
      left: box.left,
      top: box.top,
      width: width! - box.left - box.right,
      height: height! - box.top - box.bottom,
    })
    .png()
    .toBuffer();
}

describe.each(FONTS)("rendered in %s", (font) => {
  let original: Buffer;
  let originalPrint: ReceiptFingerprint;

  beforeAll(async () => {
    original = await png(yapeScreenshot(font, { amount: "150.00", operation: "08312457", time: "10:42" }));
    originalPrint = await fingerprint(original);
  });

  describe("a resend of the same receipt is similar", () => {
    const alterations: Array<[string, () => Promise<Buffer>]> = [
      ["the same file re-encoded as JPEG", () => sharp(original).jpeg({ quality: 70 }).toBuffer()],
      ["brighter and recompressed", () => sharp(original).modulate({ brightness: 1.12 }).jpeg({ quality: 60 }).toBuffer()],
      ["resized down (forwarded through a chat app)", () => sharp(original).resize({ width: 480 }).jpeg({ quality: 75 }).toBuffer()],
      ["a sliver cropped off the top (2%)", () => crop(original, { left: 0, top: 30, right: 0, bottom: 0 })],
      ["status bar cropped off (top 5%)", () => crop(original, { left: 0, top: 74, right: 0, bottom: 0 })],
      ["cropped at the top between two grid steps (7%)", () => crop(original, { left: 0, top: 100, right: 0, bottom: 0 })],
      ["status and navigation bars cropped off", () => crop(original, { left: 0, top: 80, right: 0, bottom: 80 })],
      ["cropped harder at the top than the bottom", () => crop(original, { left: 0, top: 260, right: 0, bottom: 60 })],
    ];

    it.each(alterations)("%s", async (_label, alter) => {
      const resent = await fingerprint(await alter());
      expect(fingerprintDistance(resent, originalPrint)).toBeLessThanOrEqual(SIMILAR_IMAGE_MAX_DISTANCE);
      // Symmetric: the order the two arrive in does not matter.
      expect(fingerprintDistance(originalPrint, resent)).toBeLessThanOrEqual(SIMILAR_IMAGE_MAX_DISTANCE);
    });

    it("a byte-identical resend has the same sha256", async () => {
      expect((await fingerprint(original)).sha256).toBe(originalPrint.sha256);
    });

    it("any alteration changes the sha256 — that is what the perceptual hash is for", async () => {
      const recompressed = await fingerprint(await sharp(original).jpeg({ quality: 70 }).toBuffer());
      expect(recompressed.sha256).not.toBe(originalPrint.sha256);
    });
  });

  describe("a different receipt is not similar", () => {
    it("a bank transfer", async () => {
      const other = await fingerprint(await png(bankTransfer(font)));
      expect(fingerprintDistance(other, originalPrint)).toBeGreaterThan(SIMILAR_IMAGE_MAX_DISTANCE);
    });

  });

  /**
   * The measurements behind the decision of 30/09/2026: similar_image is
   * recorded for the reviewer and never routes a payment on its own, and the
   * hard block is the operation number. These pin today's behaviour — if a
   * better hash moves them, update the tests and revisit the decision
   * (apps/api/CLAUDE.md, "Antifraude do comprovante").
   */
  describe("the known limits of the perceptual hash", () => {
    it("two different students paying the same price by Yape look the same", async () => {
      // Only the time and the operation number differ — text far too small to
      // survive a 32×32 downscale. A unique index on the pHash would refuse
      // the second honest student.
      const otherStudent = await fingerprint(
        await png(yapeScreenshot(font, { amount: "150.00", operation: "19976320", time: "18:05" })),
      );
      expect(otherStudent.sha256).not.toBe(originalPrint.sha256);
      expect(fingerprintDistance(otherStudent, originalPrint)).toBeLessThanOrEqual(SIMILAR_IMAGE_MAX_DISTANCE);
    });

    it("even a different price by Yape looks the same — the layout dominates the hash", async () => {
      const otherPrice = await fingerprint(
        await png(yapeScreenshot(font, { amount: "290.00", operation: "55501234", time: "09:12" })),
      );
      expect(fingerprintDistance(otherPrice, originalPrint)).toBeLessThanOrEqual(SIMILAR_IMAGE_MAX_DISTANCE);
    });

    it.each([
      ["cropped to the card, top and bottom", { left: 0, top: 200, right: 0, bottom: 330 }],
      ["cropped around the card on all sides", { left: 30, top: 180, right: 30, bottom: 300 }],
    ])("a heavy crop outside CROP_BOXES drifts out of range: %s", async (_label, box) => {
      // What still catches this resend is the operation number on it, which
      // no crop removes (OperationNumberAlreadyUsedError).
      const cropped = await fingerprint(await crop(original, box));
      expect(fingerprintDistance(cropped, originalPrint)).toBeGreaterThan(SIMILAR_IMAGE_MAX_DISTANCE);
    });
  });

});

describe("readExifFacts", () => {
  let original: Buffer;

  beforeAll(async () => {
    original = await png(yapeScreenshot("Arial", { amount: "150.00", operation: "08312457", time: "10:42" }));
  });

  it("is null for a screenshot with no metadata", async () => {
    expect(await readExifFacts(original)).toBeNull();
  });

  it("reads Software and the two dates when the file carries them", async () => {
    const edited = await sharp(original)
      .jpeg()
      .withExif({
        IFD0: { Software: "Adobe Photoshop 25.0", DateTime: "2026:09:30 12:00:00" },
        IFD2: { DateTimeOriginal: "2026:09:29 10:42:00" },
      })
      .toBuffer();

    const facts = await readExifFacts(edited);
    expect(facts?.software).toBe("Adobe Photoshop 25.0");
    expect(facts?.capturedAt).not.toBeNull();
    expect(facts?.modifiedAt).not.toBeNull();
    expect(Date.parse(facts!.modifiedAt!) - Date.parse(facts!.capturedAt!)).toBe(26 * 60 * 60 * 1000 - 42 * 60 * 1000);
  });

  it("is null for bytes that are not an image at all", async () => {
    expect(await readExifFacts(Buffer.from("not an image"))).toBeNull();
  });
});
