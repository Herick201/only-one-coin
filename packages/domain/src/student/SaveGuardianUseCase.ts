import type { IAuditLogRepository } from "../identity/ports/IAuditLogRepository.js";
import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import { StudentNotFoundError } from "./errors.js";
import { Guardian, type CreateGuardianDTO } from "./Guardian.js";
import type { IGuardianRepository } from "./GuardianRepository.js";
import type { IStudentRepository } from "./StudentRepository.js";

export interface SaveGuardianInput {
  actorId: string;
  studentId: string;
  guardian: Omit<CreateGuardianDTO, "studentId">;
}

/**
 * Corrects the student's guardian, or puts one on file when there is none —
 * the registration that went in without a guardian and only later learned
 * the student's age (OOC-74). One guardian per student, so this writes over
 * the existing one rather than adding a second.
 *
 * Consent is never part of it: a guardian added here starts with consent
 * pending, exactly like one added at registration, and the guardian is the
 * one who clears it (Ley 29733, CLAUDE.md §8). The audit line names fields,
 * never values — see `UpdateStudentUseCase`.
 */
export class SaveGuardianUseCase extends BaseUseCase<SaveGuardianInput, Guardian> {
  constructor(
    private readonly students: IStudentRepository,
    private readonly guardians: IGuardianRepository,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: SaveGuardianInput): Promise<Guardian> {
    const student = await this.students.findById(input.studentId);
    if (!student) throw new StudentNotFoundError();

    const existing = await this.guardians.findByStudentId(student.id);

    if (!existing) {
      const created = await this.guardians.create(Guardian.create({ ...input.guardian, studentId: student.id }));
      await this.auditLog.append({
        actorId: input.actorId,
        action: "student.guardian_added",
        targetId: student.id,
        at: created.updatedAt,
      });
      return created;
    }

    const changed = existing.rewrite(input.guardian);
    if (changed.length === 0) return existing;

    const saved = await this.guardians.update(existing);
    await this.auditLog.append({
      actorId: input.actorId,
      action: "student.guardian_updated",
      targetId: student.id,
      metadata: { fields: changed },
      at: saved.updatedAt,
    });
    return saved;
  }
}
