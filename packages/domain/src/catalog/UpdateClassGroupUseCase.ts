import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import type { IAuditLogRepository } from "../identity/ports/IAuditLogRepository.js";
import type { ClassGroup, UpdateClassGroupDTO } from "./ClassGroup.js";
import { CatalogClassGroupNotFoundError, CourseNotFoundError } from "./errors.js";
import type { IClassGroupRepository } from "./ports/IClassGroupRepository.js";
import type { ICourseRepository } from "./ports/ICourseRepository.js";

export interface UpdateClassGroupInput {
  actorId: string;
  id: string;
  patch: UpdateClassGroupDTO;
}

/**
 * Edits a class group. Capacity under the seats taken is refused by the
 * repository's conditional UPDATE, not here — the seats move under us.
 */
export class UpdateClassGroupUseCase extends BaseUseCase<UpdateClassGroupInput, ClassGroup> {
  constructor(
    private readonly courses: ICourseRepository,
    private readonly classGroups: IClassGroupRepository,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: UpdateClassGroupInput): Promise<ClassGroup> {
    const group = await this.classGroups.findById(input.id);
    if (!group || group.isDeleted) throw new CatalogClassGroupNotFoundError();

    if (input.patch.courseId !== undefined && input.patch.courseId !== group.courseId) {
      const course = await this.courses.findById(input.patch.courseId);
      if (!course || course.isDeleted) throw new CourseNotFoundError();
    }

    const changed = group.update(input.patch);
    if (changed.length === 0) return group;

    const saved = await this.classGroups.update(group);

    await this.auditLog.append({
      actorId: input.actorId,
      action: "catalog.class_group.updated",
      targetId: group.id,
      metadata: { fields: changed },
      at: saved.updatedAt,
    });

    return saved;
  }
}
