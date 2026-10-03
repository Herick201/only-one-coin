import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import { CurrentPasswordIncorrectError, NewPasswordRejectedError } from "./errors.js";
import type { IAuditLogRepository } from "./ports/IAuditLogRepository.js";
import type { IFreshAuthVerifier } from "./ports/IFreshAuthVerifier.js";
import type { IStaffPasswordSetter } from "./ports/IStaffPasswordSetter.js";
import type { IStaffSessionRevoker } from "./ports/IStaffSessionRevoker.js";
import { meetsStaffPasswordPolicy } from "./StaffPasswordPolicy.js";

export interface ChangeOwnPasswordInput {
  /** Always the session's own user — never an id from the request body. */
  userId: string;
  /** The session the change is made from; it stays open, every other one closes. */
  sessionToken: string;
  currentPassword: string;
  newPassword: string;
}

export interface ChangeOwnPasswordOutput {
  changedAt: Date;
  otherSessionsClosed: number;
}

/**
 * A staff member changing their own password from the account screen (OOC-31).
 *
 * The current password is asked again even with the session open: an
 * unattended, unlocked screen should not be enough to lock the owner out of
 * their own account.
 *
 * Every other open session is closed after the change. Changing a password
 * is most often a reaction to suspecting someone else has it, and a session
 * that survives the change keeps that someone in. The session the change was
 * made from stays open — logging the person out for doing the right thing
 * would only teach them not to.
 *
 * Same non-atomic, two-system shape as `CompleteStaffPasswordResetUseCase`:
 * the password and the sessions live in Better Auth's tables, the audit entry
 * in ours.
 */
export class ChangeOwnPasswordUseCase extends BaseUseCase<ChangeOwnPasswordInput, ChangeOwnPasswordOutput> {
  constructor(
    private readonly freshAuthVerifier: IFreshAuthVerifier,
    private readonly staffPasswordSetter: IStaffPasswordSetter,
    private readonly staffSessionRevoker: IStaffSessionRevoker,
    private readonly auditLogRepository: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: ChangeOwnPasswordInput): Promise<ChangeOwnPasswordOutput> {
    if (!meetsStaffPasswordPolicy(input.newPassword)) {
      throw new NewPasswordRejectedError({ reason: "staff_password.too_weak" });
    }
    if (input.newPassword === input.currentPassword) {
      throw new NewPasswordRejectedError({ reason: "staff_password.unchanged" });
    }

    const isCurrentPassword = await this.freshAuthVerifier.verify(input.userId, input.currentPassword);
    if (!isCurrentPassword) {
      throw new CurrentPasswordIncorrectError();
    }

    await this.staffPasswordSetter.setPassword(input.userId, input.newPassword);
    const otherSessionsClosed = await this.staffSessionRevoker.revokeOthers(input.userId, input.sessionToken);

    const changedAt = new Date();
    await this.auditLogRepository.append({
      actorId: input.userId,
      action: "staff.password_changed",
      targetId: input.userId,
      metadata: { otherSessionsClosed },
      at: changedAt,
    });

    return { changedAt, otherSessionsClosed };
  }
}
