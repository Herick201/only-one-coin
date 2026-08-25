import type { Guardian } from "../student/Guardian.js";
import type { Student } from "../student/Student.js";
import type { Enrollment } from "./Enrollment.js";
import type { Payment } from "./Payment.js";

/**
 * What the public checkout needs to know about a class group + plan before
 * it lets somebody commit to it: the course's minimum age (CLAUDE.md §1)
 * and the plan price in force. A narrower read than the backoffice's
 * `ListOpenClassGroupsQuery` — this only ever validates one pair the client
 * already chose, never lists anything.
 */
export interface PublicEnrollmentContext {
  courseMinAge: number;
  planPriceId: string;
  amountCents: number;
}

export interface SubmitPublicEnrollmentParams {
  student: Student;
  guardian: Guardian | null;
  /** Present only when `guardian` is — the guardian is who accepts,
   * timestamped and IP'd server-side (CLAUDE.md §8), never client-supplied. */
  consent: { version: string; acceptedAt: Date; ip: string } | null;
  enrollment: Enrollment;
  payment: Payment;
}

export interface SubmitPublicEnrollmentResult {
  student: Student;
  guardian: Guardian | null;
  enrollment: Enrollment;
  payment: Payment;
}

/**
 * One atomic unit, same reasoning as `IEnrollmentRepository`: student,
 * guardian, consent, the seat claim, the enrollment and the payment all
 * succeed together or none of them do — a self-enrollment can never leave a
 * student row behind with no seat to show for it.
 *
 * Idempotency (CLAUDE.md §5) is handled by checking `payment.idempotencyKey`
 * first, inside the same transaction: a retry with the same key returns the
 * row the first attempt already created instead of claiming a second seat.
 */
export interface IPublicEnrollmentRepository {
  findContext(params: { classGroupId: string; planId: string }): Promise<PublicEnrollmentContext | null>;

  submit(params: SubmitPublicEnrollmentParams): Promise<SubmitPublicEnrollmentResult>;
}
