import type { IPlatformSettingsRepository } from "../platform/ports/IPlatformSettingsRepository.js";
import { DEFAULT_LOCALE } from "../notification/EmailNotification.js";
import { paymentApprovedEmails } from "../notification/enrollmentEmails.js";
import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import type { IEnrollmentEmailContextLookup } from "./EnrollmentEmailContextLookup.js";
import { decideReceiptVerdict, type ReceiptVerdictOutcome } from "./ReceiptValidation.js";
import type {
  IReceiptValidationRepository,
  ReceiptAutoApproval,
  ReceiptValidationEffect,
  ReceiptValidationSubject,
} from "./ReceiptValidationRepository.js";

/** `audit_log.actor_id` of an approval nobody clicked. Text, no FK — the
 * column already holds Better Auth ids, which are text too. */
export const RECEIPT_VALIDATION_ACTOR = "system:receipt-validation";

export interface ValidateReceiptInput {
  receiptUploadId: string;
}

export interface ValidateReceiptOutput {
  /** `null` when there was nothing to validate. */
  outcome: ReceiptVerdictOutcome | null;
  effect: ReceiptValidationEffect | null;
}

/**
 * The receipt traffic light (OOC-21, ROADMAP Sessão 27), run by the
 * `receipt-validate` worker once a receipt is both screened and read.
 * Compares the amount read with the payment's frozen price under the
 * backoffice's settings, then hands the verdict to the repository.
 *
 * Green settles the payment on its own — the same seat, e-mail and audit
 * trail as `SettlePaymentUseCase`, signed by `RECEIPT_VALIDATION_ACTOR` —
 * but only out of `pending`: a payment the screening already sent to review
 * is a person's to decide. Red only suggests: rejecting hands back a seat,
 * and an OCR misreading must never do that to someone who paid in full.
 */
export class ValidateReceiptUseCase extends BaseUseCase<ValidateReceiptInput, ValidateReceiptOutput> {
  constructor(
    private readonly repository: IReceiptValidationRepository,
    private readonly settings: IPlatformSettingsRepository,
    private readonly emailContextLookup: IEnrollmentEmailContextLookup,
  ) {
    super();
  }

  async run(input: ValidateReceiptInput): Promise<ValidateReceiptOutput> {
    const subject = await this.repository.findSubject(input.receiptUploadId);
    if (!subject) {
      return { outcome: null, effect: null };
    }

    const current = await this.settings.get();
    const settings = {
      toleranceCents: current.receiptAmountToleranceCents,
      rejectBelowPercent: current.receiptRejectBelowPercent,
    };

    const outcome = decideReceiptVerdict({
      expectedCents: subject.expectedCents,
      declaredOperationNumber: subject.declaredOperationNumber,
      readAmountCents: subject.readAmountCents,
      readOperationNumber: subject.readOperationNumber,
      declaredMethod: subject.declaredMethod,
      readMethod: subject.readMethod,
      settings,
    });

    const approval =
      outcome.verdict === "approve" && subject.paymentStatus === "pending" ? await this.approval(subject, outcome) : null;

    const effect = await this.repository.record({
      subject,
      outcome,
      detail: { reason: outcome.reason, expectedCents: subject.expectedCents, readCents: subject.readAmountCents, ...settings },
      approval,
    });

    return { outcome, effect };
  }

  /** Built before the transaction, like `SettlePaymentUseCase` does; the
   * repository drops it if the payment moved in the meantime. */
  private async approval(subject: ReceiptValidationSubject, outcome: ReceiptVerdictOutcome): Promise<ReceiptAutoApproval> {
    const context = await this.emailContextLookup.find({
      studentId: subject.studentId,
      classGroupId: subject.classGroupId,
    });

    return {
      notifications: context ? paymentApprovedEmails({ paymentId: subject.paymentId, ...context }, DEFAULT_LOCALE) : [],
      audit: {
        actorId: RECEIPT_VALIDATION_ACTOR,
        action: "payment.auto_approved",
        targetId: subject.paymentId,
        metadata: { enrollmentId: subject.enrollmentId, receiptUploadId: subject.receiptUploadId, reason: outcome.reason },
        at: new Date(),
      },
    };
  }
}
