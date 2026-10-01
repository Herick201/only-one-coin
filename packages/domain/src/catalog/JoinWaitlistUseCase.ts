import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import type { IAuditLogRepository } from "../identity/ports/IAuditLogRepository.js";
import {
  CatalogClassGroupNotFoundError,
  ClassGroupNotFullError,
  WaitlistAlreadyEnrolledError,
  WaitlistStudentNotFoundError,
} from "./errors.js";
import type { IClassGroupRepository } from "./ports/IClassGroupRepository.js";
import type { IWaitlistRepository } from "./ports/IWaitlistRepository.js";
import { WaitlistEntry } from "./WaitlistEntry.js";

export interface JoinWaitlistInput {
  actorId: string;
  classGroupId: string;
  studentId: string;
}

/**
 * Staff queues a student on a full class group (OOC-35). Only a full one has a
 * queue: a class group with a seat left is enrolled into, not waited on. The
 * same student waits once per class group while still waiting — the
 * repository answers that from the partial unique index.
 */
export class JoinWaitlistUseCase extends BaseUseCase<JoinWaitlistInput, WaitlistEntry> {
  constructor(
    private readonly classGroups: IClassGroupRepository,
    private readonly waitlist: IWaitlistRepository,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: JoinWaitlistInput): Promise<WaitlistEntry> {
    const group = await this.classGroups.findById(input.classGroupId);
    if (!group || group.isDeleted) throw new CatalogClassGroupNotFoundError();
    if (!group.isFull) throw new ClassGroupNotFullError();

    const standing = await this.waitlist.studentStanding(input.studentId, input.classGroupId);
    if (standing === "missing") throw new WaitlistStudentNotFoundError();
    if (standing === "enrolled") throw new WaitlistAlreadyEnrolledError();

    const entry = await this.waitlist.join(
      WaitlistEntry.join({ classGroupId: input.classGroupId, studentId: input.studentId }),
    );

    await this.auditLog.append({
      actorId: input.actorId,
      action: "catalog.waitlist.joined",
      targetId: entry.id,
      metadata: { classGroupId: entry.classGroupId, studentId: entry.studentId },
      at: entry.createdAt,
    });

    return entry;
  }
}
