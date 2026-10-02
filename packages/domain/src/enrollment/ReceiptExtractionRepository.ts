import type { ReceiptExtraction, ReceiptExtractionFailureReason } from "./ReceiptExtraction.js";

/** A receipt ready to be read: normalized, attached to a payment by the
 * submit, and with no reading yet at the tier being asked for. */
export interface ReceiptExtractionSubject {
  receiptUploadId: string;
  paymentId: string;
  processedObjectKey: string;
}

/**
 * The extraction's view of `receipt_uploads` + `payment_receipts`. A receipt
 * is only read once it is attached to a payment: a photo from a checkout
 * whose hold ran out never becomes a payment, and reading it would be a
 * model call nobody needs.
 */
export interface IReceiptExtractionRepository {
  /** `null` when the row is unknown, not normalized, not attached to a
   * payment, or already has a row at `tier` — every case where there is
   * nothing to do. */
  findSubject(receiptUploadId: string, tier: number): Promise<ReceiptExtractionSubject | null>;

  /** Writes the reading once per (receipt, tier) — a second call is a
   * no-op. Never changes the payment's status: deciding on the reading is
   * the validation step's job (ROADMAP Sessão 27), not the reader's. */
  recordExtraction(params: {
    subject: ReceiptExtractionSubject;
    tier: number;
    extraction: ReceiptExtraction;
  }): Promise<void>;

  /** Writes the row with no fields and the reason, once per (receipt, tier)
   * — so the receipt stops being offered and a reviewer sees why there is
   * no reading. */
  recordFailure(params: {
    subject: ReceiptExtractionSubject;
    tier: number;
    modelName: string;
    reason: ReceiptExtractionFailureReason;
  }): Promise<void>;
}

/** Reads the processed receipt image from the bucket. */
export interface IReceiptImageReader {
  read(objectKey: string): Promise<Uint8Array>;
}
