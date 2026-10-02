import type { PaymentMethod } from "./Payment.js";

/**
 * Level 1 of the OCR ladder (apps/api/CLAUDE.md, "OCR — nunca síncrono"):
 * the primary model reading a receipt. The ladder's later tiers (level 2,
 * another model family) write the same shape with their own tier number.
 */
export const RECEIPT_EXTRACTION_TIER_PRIMARY = 1;

/**
 * One field the model read off the receipt, with its own confidence (0–1).
 * `value` is `null` when the field is not on the image or not legible —
 * never a guess. The confidence is the model's own report, not a calibrated
 * probability: what a given number means in practice is measured against
 * the hand-checked sample (docs/OCR-AVALIACAO.md), and the threshold that
 * escalates to level 2 belongs to that measurement, not to this type.
 */
export type ReceiptExtractedField =
  /** Paid amount in PEN cents — converted from the printed decimal as
   * text, never through a float. */
  | { field: "amount_cents"; value: number | null; confidence: number }
  /** As printed, before `normalizeOperationNumber` — the guard normalizes
   * at comparison time, the reading keeps what the image says. */
  | { field: "operation_number"; value: string | null; confidence: number }
  /** `detail` carries the free-text label only when `value` is `other`
   * (CLAUDE.md §4 glossary). */
  | { field: "payment_method"; value: PaymentMethod | null; detail: string | null; confidence: number }
  | { field: "payer_name"; value: string | null; confidence: number }
  /** ISO 8601 in UTC. Receipts print Lima local time; the conversion
   * happens once, in the extractor. */
  | { field: "paid_at"; value: string | null; confidence: number };

export type ReceiptExtractedFieldName = ReceiptExtractedField["field"];

/** What one model call produced, plus who produced it — CLAUDE.md requires
 * `model_name` and `model_version` on every extraction for audit. */
export interface ReceiptExtraction {
  /** The model id the call asked for (e.g. `gemini-3.1-flash-lite`). */
  modelName: string;
  /** The exact version the provider reports having served — what an audit
   * compares across months, since an alias can move under the same name. */
  modelVersion: string | null;
  fields: ReceiptExtractedField[];
}

/** Why an extraction produced no fields. Coarse on purpose: the provider's
 * error text can echo request content, so it never reaches the row. */
export type ReceiptExtractionFailureReason =
  /** Timeout, 429, 5xx, network — retried with the same model (level 1r)
   * until the attempts ran out. */
  | "provider_unavailable"
  /** The provider answered, but not with the structured shape asked for. */
  | "invalid_response"
  | "unexpected_error";

export class ReceiptExtractionError extends Error {
  constructor(
    public readonly reason: ReceiptExtractionFailureReason,
    /** The provider's HTTP status, when it answered with one — logged so a
     * config error (bad key, retired model id) is findable, never stored. */
    public readonly providerStatus: number | null = null,
  ) {
    super(`receipt extraction failed: ${reason}`);
    this.name = "ReceiptExtractionError";
  }
}

/** The processed (downscaled, greyscale, EXIF-stripped) receipt image — the
 * only version that exists by the time a receipt is extracted. */
export interface ReceiptImage {
  bytes: Uint8Array;
  contentType: string;
}

/** The model behind a tier. Throws `ReceiptExtractionError` on failure; the
 * caller decides whether to retry. */
export interface IReceiptExtractor {
  readonly modelName: string;
  extract(image: ReceiptImage): Promise<ReceiptExtraction>;
}

export function findExtractedField<TName extends ReceiptExtractedFieldName>(
  extraction: ReceiptExtraction,
  name: TName,
): Extract<ReceiptExtractedField, { field: TName }> | undefined {
  return extraction.fields.find(
    (field): field is Extract<ReceiptExtractedField, { field: TName }> => field.field === name,
  );
}
