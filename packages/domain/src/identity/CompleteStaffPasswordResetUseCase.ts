import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import { NotFoundError } from "../shared/base/errors/NotFoundError.js";
import { UnableToProcessEntryError } from "../shared/base/errors/UnableToProcessEntryError.js";
import type { IAuditLogRepository } from "./ports/IAuditLogRepository.js";
import type { IStaffPasswordResetRepository } from "./ports/IStaffPasswordResetRepository.js";
import type { IStaffPasswordSetter } from "./ports/IStaffPasswordSetter.js";
import type { IStaffSessionRevoker } from "./ports/IStaffSessionRevoker.js";

export interface CompleteStaffPasswordResetInput {
  token: string;
  password: string;
}

export interface CompleteStaffPasswordResetOutput {
  userId: string;
  /** Sessions that were still open on the account and are now closed. */
  sessionsClosed: number;
}

/**
 * Sets the new password and closes the link out — same non-atomic,
 * two-system shape `CompleteStaffInviteUseCase` accepts for the same reason
 * (the password write goes through Better Auth's own tables, separate from
 * this table's own transaction).
 *
 * Every open session on the account is closed once the password changes
 * (OOC-30). Whoever resets is signed out by definition, so there is no
 * session to keep — and if the reset is happening because somebody else got
 * the old password, a session they opened with it must not outlive it. Same
 * stance as `ChangeOwnPasswordUseCase`, which keeps only the caller's own.
 */
export class CompleteStaffPasswordResetUseCase extends BaseUseCase<
  CompleteStaffPasswordResetInput,
  CompleteStaffPasswordResetOutput
> {
  constructor(
    private readonly staffPasswordResetRepository: IStaffPasswordResetRepository,
    private readonly staffPasswordSetter: IStaffPasswordSetter,
    private readonly staffSessionRevoker: IStaffSessionRevoker,
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
    const sessionsClosed = await this.staffSessionRevoker.revokeAll(reset.userId);

    await this.auditLogRepository.append({
      actorId: reset.userId,
      action: "staff.password_reset_completed",
      targetId: reset.userId,
      metadata: { sessionsClosed },
      at: new Date(),
    });

    return { userId: reset.userId, sessionsClosed };
  }
}
