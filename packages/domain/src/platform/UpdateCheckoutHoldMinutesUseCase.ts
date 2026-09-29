import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import type { IAuditLogRepository } from "../identity/ports/IAuditLogRepository.js";
import { CheckoutHoldMinutesSchema } from "./PlatformSettings.js";
import { InvalidPlatformSettingError } from "./errors.js";
import type { IPlatformSettingsRepository } from "./ports/IPlatformSettingsRepository.js";

export interface UpdateCheckoutHoldMinutesInput {
  actorId: string;
  minutes: number;
}

/**
 * How long the public checkout holds a seat while the person goes off to pay
 * (apps/api/CLAUDE.md, "Dois relógios" — "configuráveis no backoffice, nunca
 * constante no código"). Applies to holds claimed from now on; a hold already
 * running keeps the expiry it was given.
 *
 * Every change is appended to `audit_log`: too short and people who already
 * paid lose their seat, too long and a class group looks full while nobody is
 * buying — either way somebody will ask who moved it.
 */
export class UpdateCheckoutHoldMinutesUseCase extends BaseUseCase<
  UpdateCheckoutHoldMinutesInput,
  { checkoutHoldMinutes: number }
> {
  constructor(
    private readonly settings: IPlatformSettingsRepository,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: UpdateCheckoutHoldMinutesInput): Promise<{ checkoutHoldMinutes: number }> {
    if (!CheckoutHoldMinutesSchema.safeParse(input.minutes).success) {
      throw new InvalidPlatformSettingError({ path: "checkoutHoldMinutes" });
    }

    const before = await this.settings.get();
    if (before.checkoutHoldMinutes === input.minutes) {
      return { checkoutHoldMinutes: input.minutes };
    }

    await this.settings.setCheckoutHoldMinutes(input.minutes, input.actorId);

    await this.auditLog.append({
      actorId: input.actorId,
      action: "platform_settings.checkout_hold_minutes",
      // The setting is the target — `audit_log.target_id` is text, and the
      // thing acted on here is a named parameter, not a row's uuid.
      targetId: "checkout_hold_minutes",
      metadata: { from: before.checkoutHoldMinutes, to: input.minutes },
      at: new Date(),
    });

    return { checkoutHoldMinutes: input.minutes };
  }
}
