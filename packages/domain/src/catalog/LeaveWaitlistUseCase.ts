import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import type { IAuditLogRepository } from "../identity/ports/IAuditLogRepository.js";
import { WaitlistEntryNotFoundError } from "./errors.js";
import type { IWaitlistRepository } from "./ports/IWaitlistRepository.js";
import type { StaffWaitlistLeaveReason, WaitlistEntry } from "./WaitlistEntry.js";

export interface LeaveWaitlistInput {
  actorId: string;
  entryId: string;
  /** 'enrolled' is never chosen here — the manual enrollment writes it. */
  reason: StaffWaitlistLeaveReason;
}

/** Staff takes a student out of a waitlist, with the reason. Marked, never deleted. */
export class LeaveWaitlistUseCase extends BaseUseCase<LeaveWaitlistInput, WaitlistEntry> {
  constructor(
    private readonly waitlist: IWaitlistRepository,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: LeaveWaitlistInput): Promise<WaitlistEntry> {
    const entry = await this.waitlist.findById(input.entryId);
    if (!entry) throw new WaitlistEntryNotFoundError();

    entry.leave(input.reason);
    await this.waitlist.leave(entry);

    await this.auditLog.append({
      actorId: input.actorId,
      action: "catalog.waitlist.left",
      targetId: entry.id,
      metadata: { classGroupId: entry.classGroupId, reason: input.reason },
      at: entry.updatedAt,
    });

    return entry;
  }
}
