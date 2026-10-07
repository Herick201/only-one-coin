import type { IAuditLogRepository } from "../identity/ports/IAuditLogRepository.js";
import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import { GuardianRequiredForMinorError, StudentAlreadyRegisteredError, StudentNotFoundError } from "./errors.js";
import type { IGuardianRepository } from "./GuardianRepository.js";
import type { CreateStudentDTO, Student } from "./Student.js";
import type { IStudentRepository } from "./StudentRepository.js";

export interface UpdateStudentInput {
  actorId: string;
  studentId: string;
  /** The whole record as the form holds it — the usecase works out what changed. */
  student: CreateStudentDTO;
}

/**
 * A staff correction to the student file (OOC-74) — the only path that
 * rewrites name, document and birth date; the public checkout only ever
 * refreshes contact (decision of 21/09/2026).
 *
 * Held to the same rules as registration: a document that moves onto another
 * person's file is refused (one person, one record), and a birth date that
 * makes the student a minor needs a guardian on file first. The audit line
 * names the fields that changed, never their values — `audit_log` is
 * append-only, and a person's old document copied into it could never be
 * erased on request (Ley 29733).
 */
export class UpdateStudentUseCase extends BaseUseCase<UpdateStudentInput, Student> {
  constructor(
    private readonly students: IStudentRepository,
    private readonly guardians: IGuardianRepository,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: UpdateStudentInput): Promise<Student> {
    const student = await this.students.findById(input.studentId);
    if (!student) throw new StudentNotFoundError();

    const changed = student.rewrite(input.student);
    if (changed.length === 0) return student;

    if (changed.includes("nationalIdType") || changed.includes("nationalId")) {
      const holder = await this.students.findByNationalId({
        nationalIdType: student.nationalIdType,
        nationalId: student.nationalId,
      });
      if (holder && holder.id !== student.id) throw new StudentAlreadyRegisteredError();
    }

    if (student.isMinor && !(await this.guardians.findByStudentId(student.id))) {
      throw new GuardianRequiredForMinorError();
    }

    const saved = await this.students.update(student);

    await this.auditLog.append({
      actorId: input.actorId,
      action: "student.updated",
      targetId: student.id,
      metadata: { fields: changed },
      at: saved.updatedAt,
    });

    return saved;
  }
}
