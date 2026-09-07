import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import { NotFoundError } from "../shared/base/errors/NotFoundError.js";
import { UnableToProcessEntryError } from "../shared/base/errors/UnableToProcessEntryError.js";
import type { IAuditLogRepository } from "./ports/IAuditLogRepository.js";
import type { IStaffPasswordResetRepository } from "./ports/IStaffPasswordResetRepository.js";
import type { IStaffPasswordSetter } from "./ports/IStaffPasswordSetter.js";

export interface CompleteStaffPasswordResetInput {
  token: string;
  password: string;
}

export interface CompleteStaffPasswordResetOutput {
  userId: string;
}

/**
 * Sets the new password and closes the link out — same non-atomic,
 * two-system shape `CompleteStaffInviteUseCase` accepts for the same reason
 * (the password write goes through Better Auth's own tables, separate from
 * this table's own transaction).
 */
export class CompleteStaffPasswordResetUseCase extends BaseUseCase<
  CompleteStaffPasswordResetInput,
  CompleteStaffPasswordResetOutput
> {
  constructor(
    private readonly staffPasswordResetRepository: IStaffPasswordResetRepository,
    private readonly staffPasswordSetter: IStaffPasswordSetter,
    private readonly auditLogRepository: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: CompleteStaffPasswordResetInput): Promise<CompleteStaffPasswordResetOutput> {
    const reset = await this.staffPasswordResetRepository.findByToken(input.token);
    if (!reset) {
      throw new NotFoundError({
        reason: "staff_password_reset.not_found",
        message: "No password reset with this token.",
      });
    }
    if (reset.status !== "pending") {
      throw new UnableToProcessEntryError({
        reason: "staff_password_reset.not_pending",
        message: `Password reset is ${reset.status}, not pending.`,
      });
    }
    if (reset.expiresAt.getTime() < Date.now()) {
      throw new UnableToProcessEntryError({
        reason: "staff_password_reset.expired",
        message: "Password reset has expired.",
      });
    }

    await this.staffPasswordSetter.setPassword(reset.userId, input.password);
    await this.staffPasswordResetRepository.markCompleted(reset.id);

    await this.auditLogRepository.append({
      actorId: reset.userId,
      action: "staff.password_reset_completed",
      targetId: reset.userId,
      metadata: {},
      at: new Date(),
    });

    return { userId: reset.userId };
  }
}
