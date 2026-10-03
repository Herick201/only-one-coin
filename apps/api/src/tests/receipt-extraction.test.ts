import { describe, expect, it } from "vitest";
import {
  ExtractReceiptUseCase,
  RECEIPT_EXTRACTION_TIER_PRIMARY,
  ReceiptExtractionError,
  type IReceiptExtractionRepository,
  type IReceiptExtractor,
  type IReceiptImageReader,
  type ReceiptExtraction,
  type ReceiptExtractionFailureReason,
  type ReceiptExtractionSubject,
  type ReceiptImage,
} from "@ooc/domain";

/**
 * OCR level 1 (OOC-20) at the domain level: fakes, no Postgres, no model.
 * The SQL half is DrizzleReceiptExtractionRepository.integration.test.ts;
 * the model's answer → fields conversion is packages/ocr/tests.
 */

const SUBJECT: ReceiptExtractionSubject = {
  receiptUploadId: "018f2b5c-6200-7000-8000-000000000001",
  paymentId: "018f2b5c-6200-7000-8000-000000000002",
  processedObjectKey: "receipts/processed/hold/upload.jpg",
};

const READING: ReceiptExtraction = {
  modelName: "gemini-3.1-flash-lite",
  modelVersion: "gemini-3.1-flash-lite-001",
  fields: [
    { field: "amount_cents", value: 15000, confidence: 0.97 },
    { field: "operation_number", value: "08312457", confidence: 0.92 },
    { field: "payment_method", value: "yape", detail: null, confidence: 0.99 },
    { field: "payer_name", value: null, confidence: 0 },
    { field: "paid_at", value: "2026-10-02T14:30:00.000Z", confidence: 0.9 },
  ],
};

class FakeRepository implements IReceiptExtractionRepository {
  readings: { subject: ReceiptExtractionSubject; tier: number; extraction: ReceiptExtraction }[] = [];
  failures: { subject: ReceiptExtractionSubject; tier: number; modelName: string; reason: ReceiptExtractionFailureReason }[] = [];
  askedTiers: number[] = [];

  constructor(private readonly subject: ReceiptExtractionSubject | null) {}

  findSubject(_receiptUploadId: string, tier: number): Promise<ReceiptExtractionSubject | null> {
    this.askedTiers.push(tier);
    return Promise.resolve(this.subject);
  }

  recordExtraction(params: { subject: ReceiptExtractionSubject; tier: number; extraction: ReceiptExtraction }): Promise<void> {
    this.readings.push(params);
    return Promise.resolve();
  }

  recordFailure(params: {
    subject: ReceiptExtractionSubject;
    tier: number;
    modelName: string;
    reason: ReceiptExtractionFailureReason;
  }): Promise<void> {
    this.failures.push(params);
    return Promise.resolve();
  }
}

class FakeImages implements IReceiptImageReader {
  readKeys: string[] = [];
  read(objectKey: string): Promise<Uint8Array> {
    this.readKeys.push(objectKey);
    return Promise.resolve(new Uint8Array([0xff, 0xd8, 0xff]));
  }
}

class FakeExtractor implements IReceiptExtractor {
  readonly modelName = "gemini-3.1-flash-lite";
  images: ReceiptImage[] = [];
  constructor(private readonly outcome: ReceiptExtraction | Error) {}
  extract(image: ReceiptImage): Promise<ReceiptExtraction> {
    this.images.push(image);
    return this.outcome instanceof Error ? Promise.reject(this.outcome) : Promise.resolve(this.outcome);
  }
}

describe("ExtractReceiptUseCase.run", () => {
  it("reads the processed image, asks the model, records the reading at tier 1", async () => {
    const repository = new FakeRepository(SUBJECT);
    const images = new FakeImages();
    const extractor = new FakeExtractor(READING);

    const { extraction } = await new ExtractReceiptUseCase(repository, images, extractor).run({
      receiptUploadId: SUBJECT.receiptUploadId,
    });

    expect(extraction).toEqual(READING);
    expect(images.readKeys).toEqual([SUBJECT.processedObjectKey]);
    expect(extractor.images[0]!.contentType).toBe("image/jpeg");
    expect(repository.askedTiers).toEqual([RECEIPT_EXTRACTION_TIER_PRIMARY]);
    expect(repository.readings).toEqual([{ subject: SUBJECT, tier: RECEIPT_EXTRACTION_TIER_PRIMARY, extraction: READING }]);
  });

  it("does nothing — no download, no model call — when there is nothing to read", async () => {
    const repository = new FakeRepository(null);
    const images = new FakeImages();
    const extractor = new FakeExtractor(READING);

    const { extraction } = await new ExtractReceiptUseCase(repository, images, extractor).run({
      receiptUploadId: SUBJECT.receiptUploadId,
    });

    expect(extraction).toBeNull();
    expect(images.readKeys).toEqual([]);
    expect(extractor.images).toEqual([]);
  });

  it("lets a model failure through, recording nothing, so the worker retries", async () => {
    const repository = new FakeRepository(SUBJECT);
    const useCase = new ExtractReceiptUseCase(
      repository,
      new FakeImages(),
      new FakeExtractor(new ReceiptExtractionError("provider_unavailable", 429)),
    );

    await expect(useCase.run({ receiptUploadId: SUBJECT.receiptUploadId })).rejects.toBeInstanceOf(ReceiptExtractionError);
    expect(repository.readings).toEqual([]);
    expect(repository.failures).toEqual([]);
  });
});

describe("ExtractReceiptUseCase.recordFailure", () => {
  it.each([
    [new ReceiptExtractionError("provider_unavailable", 503), "provider_unavailable"],
    [new ReceiptExtractionError("invalid_response"), "invalid_response"],
    [new Error("bucket down"), "unexpected_error"],
  ] as const)("records %s as %s, with the model that failed", async (error, reason) => {
    const repository = new FakeRepository(SUBJECT);
    const useCase = new ExtractReceiptUseCase(repository, new FakeImages(), new FakeExtractor(READING));

    expect(await useCase.recordFailure({ receiptUploadId: SUBJECT.receiptUploadId, error })).toBe(reason);
    expect(repository.failures).toEqual([
      { subject: SUBJECT, tier: RECEIPT_EXTRACTION_TIER_PRIMARY, modelName: "gemini-3.1-flash-lite", reason },
    ]);
  });

  it("records nothing when the receipt already has a row at the tier", async () => {
    const repository = new FakeRepository(null);
    const useCase = new ExtractReceiptUseCase(repository, new FakeImages(), new FakeExtractor(READING));

    expect(await useCase.recordFailure({ receiptUploadId: SUBJECT.receiptUploadId, error: new Error("x") })).toBeNull();
    expect(repository.failures).toEqual([]);
  });
});
