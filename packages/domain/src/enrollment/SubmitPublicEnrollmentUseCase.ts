import type { Locale } from "../notification/EmailNotification.js";
import { enrollmentReceivedEmails } from "../notification/enrollmentEmails.js";
import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import { GuardianRequiredForMinorError } from "../student/errors.js";
import { Guardian, type CreateGuardianDTO } from "../student/Guardian.js";
import { Student, type CreateStudentDTO } from "../student/Student.js";
import { Enrollment } from "./Enrollment.js";
import { ClassGroupNotFoundError, SeatHoldExpiredError, StudentBelowMinimumAgeError } from "./errors.js";
import { Payment, type PaymentMethod } from "./Payment.js";
import type { IPublicEnrollmentRepository, SubmitPublicEnrollmentResult } from "./PublicEnrollmentRepository.js";
import type { ISeatHoldRepository } from "./SeatHoldRepository.js";

export interface SubmitPublicEnrollmentInput {
  /** The hold claimed when the checkout settled on the class group. Its seat
   * becomes this enrollment's — the submit never takes a second one. */
  seatHoldId: string;
  classGroupId: string;
  planId: string;
  student: CreateStudentDTO;
  guardian: Omit<CreateGuardianDTO, "studentId"> | null;
  /** Resolved by the route from the request itself (CLAUDE.md §8) — never
   * trusted from the body. Required exactly when `guardian` is. */
  consent: { version: string; ip: string } | null;
  /** The language the person filled the form in — the one their e-mails
   * are written in (CLAUDE.md §4). */
  locale: Locale;
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
 * slice — no upload, no OCR yet, both tracked separately). One call, one
 * transaction at the repository boundary: register the student (and guardian,
 * if a minor), consume the seat hold, create the enrollment and its payment
 * `pending`, and queue the "enrollment received" e-mail in the outbox.
 *
 * Price and the course's minimum age are resolved here from the server's
 * own read of the class group and plan — never accepted from the client
 * (CLAUDE.md §5). The channel comes from the seat hold, recorded at first
 * access — never from this request either.
 */
export class SubmitPublicEnrollmentUseCase extends BaseUseCase<
  SubmitPublicEnrollmentInput,
  SubmitPublicEnrollmentOutput
> {
  constructor(
    private readonly repository: IPublicEnrollmentRepository,
    private readonly seatHolds: ISeatHoldRepository,
  ) {
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

    // Read whatever the hold's status: the origin on it never changes, and an
    // idempotent retry arrives here with the hold its first attempt already
    // consumed. Whether the seat can still be taken is the repository's call,
    // inside the transaction and against the database clock.
    const hold = await this.seatHolds.find(input.seatHoldId);
    if (!hold || hold.classGroupId !== input.classGroupId) {
      throw new SeatHoldExpiredError();
    }

    const guardian = input.guardian ? Guardian.create({ ...input.guardian, studentId: student.id }) : null;

    const enrollment = Enrollment.createFromPublicCheckout({
      studentId: student.id,
      classGroupId: input.classGroupId,
      planPriceId: context.planPriceId,
      origin: hold.origin,
    });

    const payment = Payment.createFromPublicCheckout({
      enrollmentId: enrollment.id,
      idempotencyKey: input.payment.idempotencyKey,
      method: input.payment.method,
      methodDetail: input.payment.methodDetail,
      amountCents: context.amountCents,
      operationNumber: input.payment.operationNumber,
    });

    const notifications = enrollmentReceivedEmails(
      {
        enrollmentId: enrollment.id,
        student,
        guardian,
        courseName: context.courseName,
        classGroupStartsOn: context.classGroupStartsOn,
        amountCents: context.amountCents,
      },
      input.locale,
    );

    return this.repository.submit({
      seatHoldId: hold.id,
      student,
      guardian,
      consent:
        guardian && input.consent
          ? { version: input.consent.version, acceptedAt: new Date(), ip: input.consent.ip }
          : null,
      enrollment,
      payment,
      notifications,
    });
  }
}
