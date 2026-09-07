import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import { NotFoundError } from "../shared/base/errors/NotFoundError.js";
import { UnableToProcessEntryError } from "../shared/base/errors/UnableToProcessEntryError.js";
import type { IAuditLogRepository } from "./ports/IAuditLogRepository.js";
import type { IStaffAccountProvisioner } from "./ports/IStaffAccountProvisioner.js";
import type { IStaffInviteRepository } from "./ports/IStaffInviteRepository.js";

export interface CompleteStaffInviteInput {
  token: string;
  password: string;
}

export interface CompleteStaffInviteOutput {
  userId: string;
  email: string;
}

/**
 * Turns a pending invite into a real account. Not wrapped in one DB
 * transaction — the account is provisioned through Better Auth's own
 * connection, separate from the one `staffInviteRepository`/`auditLogRepository`
 * write through, so a crash between `provision` and `markCompleted` is a real,
 * accepted gap. `apps/api/src/scripts/seed-admin.ts` already lives with the
 * exact same two-step, non-atomic shape for the same reason.
 */
export class CompleteStaffInviteUseCase extends BaseUseCase<CompleteStaffInviteInput, CompleteStaffInviteOutput> {
  constructor(
    private readonly staffInviteRepository: IStaffInviteRepository,
    private readonly staffAccountProvisioner: IStaffAccountProvisioner,
    private readonly auditLogRepository: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: CompleteStaffInviteInput): Promise<CompleteStaffInviteOutput> {
    const invite = await this.staffInviteRepository.findByToken(input.token);
    if (!invite) {
      throw new NotFoundError({
        reason: "staff_invite.not_found",
        message: "No invite with this token.",
      });
    }
    if (invite.status !== "pending") {
      throw new UnableToProcessEntryError({
        reason: "staff_invite.not_pending",
        message: `Invite is ${invite.status}, not pending.`,
      });
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      throw new UnableToProcessEntryError({
        reason: "staff_invite.expired",
        message: "Invite has expired.",
      });
    }

    const { userId } = await this.staffAccountProvisioner.provision({
      email: invite.email,
      name: `${invite.firstName} ${invite.lastName}`.trim(),
      password: input.password,
      role: invite.role,
    });

    await this.staffInviteRepository.markCompleted(invite.id, userId);

    await this.auditLogRepository.append({
      actorId: userId,
      action: "staff.invite_completed",
      targetId: userId,
      metadata: { role: invite.role },
      at: new Date(),
    });

    return { userId, email: invite.email };
  }
}
