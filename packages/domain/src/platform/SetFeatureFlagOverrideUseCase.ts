import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import { isOwnerEmail } from "../identity/Role.js";
import { NotAPlatformOwnerError } from "./errors.js";
import type { IAuditLogRepository } from "../identity/ports/IAuditLogRepository.js";
import type { IFeatureFlagOverrideRepository } from "./ports/IFeatureFlagOverrideRepository.js";

export interface SetFeatureFlagOverrideInput {
  actorId: string;
  actorEmail: string;
  key: string;
  /** `null` hands the flag back to the value declared in code. */
  enabled: boolean | null;
}

export interface SetFeatureFlagOverrideOutput {
  key: string;
  enabled: boolean | null;
}

/**
 * The one way a feature flag moves from the panel (CLAUDE.md §5).
 *
 * Two things make this a usecase rather than an update on a settings screen:
 * the owners-only rule is checked here, where a second caller cannot forget
 * it, and every change is appended to `audit_log`. Turning a section off is
 * how a screen disappears for every student at once — there is no version of
 * that which should be untraceable.
 *
 * No fresh re-authentication, unlike a promotion: this changes what exists,
 * not who may do what, and it is reversible in one click by the same person.
 */
export class SetFeatureFlagOverrideUseCase extends BaseUseCase<
  SetFeatureFlagOverrideInput,
  SetFeatureFlagOverrideOutput
> {
  constructor(
    private readonly overrides: IFeatureFlagOverrideRepository,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: SetFeatureFlagOverrideInput): Promise<SetFeatureFlagOverrideOutput> {
    if (!isOwnerEmail(input.actorEmail)) {
      throw new NotAPlatformOwnerError();
    }

    const before = await this.overrides.find(input.key);

    if (input.enabled === null) {
      await this.overrides.clear(input.key);
    } else {
      await this.overrides.set(input.key, input.enabled, input.actorId);
    }

    await this.auditLog.append({
      actorId: input.actorId,
      action: "feature_flag.override",
      // The flag key is the target: `audit_log.target_id` is text, and the
      // thing acted on here is the flag itself, not a row's uuid.
      targetId: input.key,
      metadata: { from: before ? before.enabled : null, to: input.enabled },
      at: new Date(),
    });

    return { key: input.key, enabled: input.enabled };
  }
}
