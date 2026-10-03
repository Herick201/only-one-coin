import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import type { IAuditLogRepository } from "../identity/ports/IAuditLogRepository.js";
import { ReceiptRejectBelowPercentSchema } from "./PlatformSettings.js";
import { InvalidPlatformSettingError } from "./errors.js";
import type { IPlatformSettingsRepository } from "./ports/IPlatformSettingsRepository.js";

export interface UpdateReceiptRejectBelowPercentInput {
  actorId: string;
  percent: number;
}

/**
 * Where the traffic light turns red (OOC-21): below this percentage of the
 * expected amount, rejection is suggested to the reviewer — never applied.
 * Applies to the next validation. Audited like every setting.
 */
export class UpdateReceiptRejectBelowPercentUseCase extends BaseUseCase<
  UpdateReceiptRejectBelowPercentInput,
  { receiptRejectBelowPercent: number }
> {
  constructor(
    private readonly settings: IPlatformSettingsRepository,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: UpdateReceiptRejectBelowPercentInput): Promise<{ receiptRejectBelowPercent: number }> {
    if (!ReceiptRejectBelowPercentSchema.safeParse(input.percent).success) {
      throw new InvalidPlatformSettingError({ path: "percent" });
    }

    const before = await this.settings.get();
    if (before.receiptRejectBelowPercent === input.percent) {
      return { receiptRejectBelowPercent: input.percent };
    }

    await this.settings.setReceiptRejectBelowPercent(input.percent, input.actorId);

    await this.auditLog.append({
      actorId: input.actorId,
      action: "platform_settings.receipt_reject_below_percent",
      targetId: "receipt_reject_below_percent",
      metadata: { from: before.receiptRejectBelowPercent, to: input.percent },
      at: new Date(),
    });

    return { receiptRejectBelowPercent: input.percent };
  }
}
