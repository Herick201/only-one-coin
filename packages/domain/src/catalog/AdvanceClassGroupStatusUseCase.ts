import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import type { IAuditLogRepository } from "../identity/ports/IAuditLogRepository.js";
import type { ClassGroup, ClassGroupStatus } from "./ClassGroup.js";
import { CatalogClassGroupNotFoundError } from "./errors.js";
import type { IClassGroupRepository } from "./ports/IClassGroupRepository.js";

export interface AdvanceClassGroupStatusInput {
  actorId: string;
  id: string;
  to: ClassGroupStatus;
}

/** Moves a class group one step forward, by a person's decision — never by a date. */
export class AdvanceClassGroupStatusUseCase extends BaseUseCase<AdvanceClassGroupStatusInput, ClassGroup> {
  constructor(
    private readonly classGroups: IClassGroupRepository,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: AdvanceClassGroupStatusInput): Promise<ClassGroup> {
    const group = await this.classGroups.findById(input.id);
    if (!group || group.isDeleted) throw new CatalogClassGroupNotFoundError();

    const from = group.advanceTo(input.to);
    const saved = await this.classGroups.update(group);

    await this.auditLog.append({
      actorId: input.actorId,
      action: "catalog.class_group.status_changed",
      targetId: group.id,
      metadata: { from, to: input.to },
      at: saved.updatedAt,
    });

    return saved;
  }
}
