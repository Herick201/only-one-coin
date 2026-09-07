import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import { NotFoundError } from "../shared/base/errors/NotFoundError.js";
import { UnableToProcessEntryError } from "../shared/base/errors/UnableToProcessEntryError.js";
import type { IAuditLogRepository } from "./ports/IAuditLogRepository.js";
import type { IStaffInviteRepository } from "./ports/IStaffInviteRepository.js";

export interface CancelStaffInviteInput {
  actorId: string;
  inviteId: string;
}

export class CancelStaffInviteUseCase extends BaseUseCase<CancelStaffInviteInput, void> {
  constructor(
    private readonly staffInviteRepository: IStaffInviteRepository,
    private readonly auditLogRepository: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: CancelStaffInviteInput): Promise<void> {
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

    await this.staffInviteRepository.markCancelled(invite.id);

    await this.auditLogRepository.append({
      actorId: input.actorId,
      action: "staff.invite_cancelled",
      targetId: invite.id,
      metadata: {},
      at: new Date(),
    });
  }
}
