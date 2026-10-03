import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import type { IAuditLogRepository } from "../identity/ports/IAuditLogRepository.js";
import { ReceiptAmountToleranceCentsSchema } from "./PlatformSettings.js";
import { InvalidPlatformSettingError } from "./errors.js";
import type { IPlatformSettingsRepository } from "./ports/IPlatformSettingsRepository.js";

export interface UpdateReceiptAmountToleranceInput {
  actorId: string;
  cents: number;
}

/**
 * How far above the plan price a receipt is still green (OOC-21,
 * apps/api/CLAUDE.md: "Tolerância de validação configurável no backoffice").
 * Applies to the next validation; a verdict already recorded keeps the
 * tolerance it was decided with (`receipt_uploads.validation_detail`).
 *
 * Audited: this number decides which receipts the reviewer sees as green.
 */
export class UpdateReceiptAmountToleranceUseCase extends BaseUseCase<
  UpdateReceiptAmountToleranceInput,
  { receiptAmountToleranceCents: number }
> {
  constructor(
    private readonly settings: IPlatformSettingsRepository,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: UpdateReceiptAmountToleranceInput): Promise<{ receiptAmountToleranceCents: number }> {
    if (!ReceiptAmountToleranceCentsSchema.safeParse(input.cents).success) {
      throw new InvalidPlatformSettingError({ path: "cents" });
    }

    const before = await this.settings.get();
    if (before.receiptAmountToleranceCents === input.cents) {
      return { receiptAmountToleranceCents: input.cents };
    }

    await this.settings.setReceiptAmountToleranceCents(input.cents, input.actorId);

    await this.auditLog.append({
      actorId: input.actorId,
      action: "platform_settings.receipt_amount_tolerance_cents",
      targetId: "receipt_amount_tolerance_cents",
      metadata: { from: before.receiptAmountToleranceCents, to: input.cents },
      at: new Date(),
    });

    return { receiptAmountToleranceCents: input.cents };
  }
}
