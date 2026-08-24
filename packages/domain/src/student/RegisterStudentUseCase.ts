import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import { GuardianRequiredForMinorError } from "./errors.js";
import { Guardian, type CreateGuardianDTO } from "./Guardian.js";
import type { IGuardianRepository } from "./GuardianRepository.js";
import { Student, type CreateStudentDTO } from "./Student.js";
import type { IStudentRepository } from "./StudentRepository.js";

export interface RegisterStudentInput {
  student: CreateStudentDTO;
  /** Optional in general; required when the computed age is under
   * Student.MAJORITY_AGE (CLAUDE.md §1). Never carries consent — the
   * guardian record is created with consent pending. */
  guardian: Omit<CreateGuardianDTO, "studentId"> | null;
}

export interface RegisterStudentOutput {
  student: Student;
  guardian: Guardian | null;
}

/**
 * Manual backoffice registration (`admin`/`coordinator`, CLAUDE.md §1) — the
 * counterpart to the manual enrollment exception: this usecase only ever
 * creates the person record, it never enrolls anyone.
 */
export class RegisterStudentUseCase extends BaseUseCase<RegisterStudentInput, RegisterStudentOutput> {
  constructor(
    private readonly studentRepository: IStudentRepository,
    private readonly guardianRepository: IGuardianRepository,
  ) {
    super();
  }

  async run(input: RegisterStudentInput): Promise<RegisterStudentOutput> {
    const student = Student.create(input.student);

    if (student.isMinor && !input.guardian) {
      throw new GuardianRequiredForMinorError();
    }

    const createdStudent = await this.studentRepository.create(student);

    if (!input.guardian) {
      return { student: createdStudent, guardian: null };
    }

    const guardian = Guardian.create({ ...input.guardian, studentId: createdStudent.id });
    const createdGuardian = await this.guardianRepository.create(guardian);

    return { student: createdStudent, guardian: createdGuardian };
  }
}
