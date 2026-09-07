import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import { NotFoundError } from "../shared/base/errors/NotFoundError.js";
import { UnableToProcessEntryError } from "../shared/base/errors/UnableToProcessEntryError.js";
import type { IAuditLogRepository } from "./ports/IAuditLogRepository.js";
import type { IStaffInviteRepository, StaffInvite } from "./ports/IStaffInviteRepository.js";

const INVITE_TTL_DAYS = 7;

export interface RenewStaffInviteInput {
  actorId: string;
  inviteId: string;
}

export interface RenewStaffInviteOutput {
  invite: StaffInvite;
}

/**
 * Bumps a pending invite's expiry, same token — a decision the invite screen's
 * "copiar el enlace" already leans on (the token is stored plain, CLAUDE.md
 * decision recorded on `staff_invites.token`), so there is nothing to
 * regenerate, only the expiry to extend.
 */
export class RenewStaffInviteUseCase extends BaseUseCase<RenewStaffInviteInput, RenewStaffInviteOutput> {
  constructor(
    private readonly staffInviteRepository: IStaffInviteRepository,
    private readonly auditLogRepository: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: RenewStaffInviteInput): Promise<RenewStaffInviteOutput> {
    const invite = await this.staffInviteRepository.findById(input.inviteId);
    if (!invite) {
      throw new NotFoundError({
        reason: "staff_invite.not_found",
        message: `No invite with id ${input.inviteId}`,
      });
    }
    if (invite.status !== "pending") {
      throw new UnableToProcessEntryError({
        reason: "staff_invite.not_pending",
        message: `Invite ${input.inviteId} is ${invite.status}, not pending.`,
      });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

    await this.staffInviteRepository.renew(invite.id, expiresAt);

    await this.auditLogRepository.append({
      actorId: input.actorId,
      action: "staff.invite_renewed",
      targetId: invite.id,
      metadata: {},
      at: new Date(),
    });

    return { invite: { ...invite, expiresAt } };
  }
}
