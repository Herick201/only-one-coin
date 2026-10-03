import type { AuditLogEntry } from "../identity/ports/IAuditLogRepository.js";
import type { EmailNotification } from "../notification/EmailNotification.js";
import type { PaymentMethod, PaymentStatus } from "./Payment.js";
import type { ReceiptValidationSettings, ReceiptVerdictOutcome, ReceiptVerdictReason } from "./ReceiptValidation.js";

/** A receipt ready for the traffic light: screened (level 0) and read at
 * level 1 — the reading may be a failure — and not validated yet. */
export interface ReceiptValidationSubject {
  receiptUploadId: string;
  paymentId: string;
  enrollmentId: string;
  studentId: string;
  classGroupId: string;
  paymentStatus: PaymentStatus;
  /** `payments.amount_cents` — the price frozen at enrollment, never today's. */
  expectedCents: number;
  /** What the person typed at checkout. */
  declaredOperationNumber: string | null;
  /** `null` when the reading failed or found no amount. */
  readAmountCents: number | null;
  readOperationNumber: string | null;
  /** `payments.method` — what the person declared at checkout. */
  declaredMethod: PaymentMethod;
  /** `null` when the reading failed or found no usable method. */
  readMethod: PaymentMethod | null;
}

/** Stored with the verdict (`receipt_uploads.validation_detail`): what it was
 * decided with, so a later settings change never makes it unexplainable. */
export interface ReceiptValidationDetail extends ReceiptValidationSettings {
  reason: ReceiptVerdictReason;
  expectedCents: number;
  readCents: number | null;
}

/** What recording the verdict did to the payment. */
export type ReceiptValidationEffect =
  /** Green, latest upload, payment was `pending`: approved, seat confirmed. */
  | "approved"
  /** Not green (or green that could not approve), latest upload, payment
   * was `pending`: moved to `under_review`. */
  | "routed_to_review"
  /** Verdict recorded; the payment was not `pending` or this is not its
   * latest upload, so it was left alone. */
  | "none"
  /** Another delivery already recorded a verdict — nothing written. */
  | "already_validated";

export interface ReceiptAutoApproval {
  notifications: EmailNotification[];
  audit: AuditLogEntry;
}

export interface IReceiptValidationRepository {
  /** `null` when the upload is unknown, not attached to a payment, not
   * screened, has no level-1 row, or is already validated. */
  findSubject(receiptUploadId: string): Promise<ReceiptValidationSubject | null>;

  /**
   * One transaction: stamps the verdict once (`validated_at is null`), then
   * — only for the payment's latest upload and only while the payment is
   * still `pending` — approves (when `approval` is given and the seat was
   * not released: payment `approved`, seat `reserved → confirmed`, outbox,
   * audit) or moves the payment to `under_review`.
   */
  record(params: {
    subject: ReceiptValidationSubject;
    outcome: ReceiptVerdictOutcome;
    detail: ReceiptValidationDetail;
    approval: ReceiptAutoApproval | null;
  }): Promise<ReceiptValidationEffect>;
}
