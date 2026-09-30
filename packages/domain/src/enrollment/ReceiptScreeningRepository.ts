import type { ReceiptExifFacts, ReceiptFraudSignal } from "./ReceiptScreening.js";

/** A receipt upload ready to be screened: normalized (so its fingerprint
 * exists), attached to a payment by the submit, and not screened yet. */
export interface ReceiptScreeningSubject {
  receiptUploadId: string;
  paymentId: string;
  exif: ReceiptExifFacts | null;
}

/** Another payment's receipt that looks like the subject. `identical` is
 * the same file byte for byte; `similar` is perceptually close — the
 * threshold is the fingerprint's business, not the domain's. */
export interface ReceiptLookalike {
  receiptUploadId: string;
  paymentId: string;
  match: { kind: "identical" } | { kind: "similar"; distance: number };
}

/**
 * The screening's view of `receipt_uploads`. Only receipts already attached
 * to a payment count as "used": a photo uploaded in a checkout whose hold
 * ran out, and uploaded again in the next one, is the same person trying
 * again — not a second use of the receipt.
 */
export interface IReceiptScreeningRepository {
  /** `null` when the row is unknown, not normalized yet, not attached to a
   * payment yet, or already screened — every case where there is nothing to
   * do right now. */
  findSubject(receiptUploadId: string): Promise<ReceiptScreeningSubject | null>;

  /** Receipts of *other* payments that match the subject, closest first. */
  findLookalikes(subject: ReceiptScreeningSubject): Promise<ReceiptLookalike[]>;

  /** Stamps the screening on the row (once — a second call is a no-op) and,
   * with `routeToReview`, moves the payment `pending → under_review`: the
   * human queue (apps/api/CLAUDE.md, OCR ladder level 3). A payment already
   * past `pending` keeps its status. */
  recordScreening(params: {
    receiptUploadId: string;
    paymentId: string;
    signals: ReceiptFraudSignal[];
    routeToReview: boolean;
  }): Promise<void>;
}
