import type { IPlatformSettingsRepository } from "../platform/ports/IPlatformSettingsRepository.js";
import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import { decideReceiptVerdict, type ReceiptVerdictOutcome } from "./ReceiptValidation.js";
import type { IReceiptValidationRepository, ReceiptValidationEffect } from "./ReceiptValidationRepository.js";

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
 * It only validates — approvals are never automatic (owner, 03/10/2026).
 * Green leaves the payment `pending` with the verdict on it; yellow and red
 * send it to `under_review`. Whoever approves or rejects is a person in
 * Payments (`SettlePaymentUseCase`).
 */
export class ValidateReceiptUseCase extends BaseUseCase<ValidateReceiptInput, ValidateReceiptOutput> {
  constructor(
    private readonly repository: IReceiptValidationRepository,
    private readonly settings: IPlatformSettingsRepository,
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

    const effect = await this.repository.record({
      subject,
      outcome,
      detail: { reason: outcome.reason, expectedCents: subject.expectedCents, readCents: subject.readAmountCents, ...settings },
    });

    return { outcome, effect };
  }
}
