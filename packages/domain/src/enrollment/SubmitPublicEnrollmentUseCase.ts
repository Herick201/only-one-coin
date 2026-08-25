import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import { GuardianRequiredForMinorError } from "../student/errors.js";
import { Guardian, type CreateGuardianDTO } from "../student/Guardian.js";
import { Student, type CreateStudentDTO } from "../student/Student.js";
import { Enrollment } from "./Enrollment.js";
import { ClassGroupNotFoundError, StudentBelowMinimumAgeError } from "./errors.js";
import { Payment, type PaymentMethod } from "./Payment.js";
import type { IPublicEnrollmentRepository, SubmitPublicEnrollmentResult } from "./PublicEnrollmentRepository.js";

export interface SubmitPublicEnrollmentInput {
  classGroupId: string;
  planId: string;
  student: CreateStudentDTO;
  guardian: Omit<CreateGuardianDTO, "studentId"> | null;
  /** Resolved by the route from the request itself (CLAUDE.md §8) — never
   * trusted from the body. Required exactly when `guardian` is. */
  consent: { version: string; ip: string } | null;
  payment: {
    method: PaymentMethod;
    methodDetail: string | null;
    operationNumber: string;
    idempotencyKey: string;
  };
}

export type SubmitPublicEnrollmentOutput = SubmitPublicEnrollmentResult;

/**
 * The public checkout's submit (`docs/ROADMAP.md` Sessões 20–24, reduced
 * slice — no real hold, no upload, no OCR yet, all tracked separately). One
 * call, one transaction at the repository boundary: register the student
 * (and guardian, if a minor), claim the seat, create the enrollment and its
 * payment `pending`.
 *
 * Price and the course's minimum age are resolved here from the server's
 * own read of the class group and plan — never accepted from the client
 * (CLAUDE.md §5).
 */
export class SubmitPublicEnrollmentUseCase extends BaseUseCase<
  SubmitPublicEnrollmentInput,
  SubmitPublicEnrollmentOutput
> {
  constructor(private readonly repository: IPublicEnrollmentRepository) {
    super();
  }

  async run(input: SubmitPublicEnrollmentInput): Promise<SubmitPublicEnrollmentOutput> {
    const student = Student.create(input.student);

    if (student.isMinor && !input.guardian) {
      throw new GuardianRequiredForMinorError();
    }

    const context = await this.repository.findContext({
      classGroupId: input.classGroupId,
      planId: input.planId,
    });

    if (!context) {
      throw new ClassGroupNotFoundError();
    }

    if (student.ageInYears < context.courseMinAge) {
      throw new StudentBelowMinimumAgeError();
    }

    const guardian = input.guardian ? Guardian.create({ ...input.guardian, studentId: student.id }) : null;

    const enrollment = Enrollment.createFromPublicCheckout({
      studentId: student.id,
      classGroupId: input.classGroupId,
      planPriceId: context.planPriceId,
    });

    const payment = Payment.createFromPublicCheckout({
      enrollmentId: enrollment.id,
      idempotencyKey: input.payment.idempotencyKey,
      method: input.payment.method,
      methodDetail: input.payment.methodDetail,
      amountCents: context.amountCents,
      operationNumber: input.payment.operationNumber,
    });

    return this.repository.submit({
      student,
      guardian,
      consent:
        guardian && input.consent
          ? { version: input.consent.version, acceptedAt: new Date(), ip: input.consent.ip }
          : null,
      enrollment,
      payment,
    });
  }
}
