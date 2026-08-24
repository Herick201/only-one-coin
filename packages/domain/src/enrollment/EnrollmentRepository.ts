import type { Enrollment } from "./Enrollment.js";
import type { Payment } from "./Payment.js";

/**
 * One method, not `create()` + a separate payment insert: the seat
 * increment on class_groups, the enrollment row and the payment row are one
 * atomic unit from the business's perspective (CLAUDE.md §5) — an
 * enrollment can never exist without its payment, and the seat can never be
 * claimed without both. The transaction boundary is an infra concern; the
 * port only names the operation.
 *
 * Throws ClassGroupFullError (see errors.ts) when the atomic seat increment
 * finds no room — never validated ahead of time in application code
 * (CLAUDE.md §5, "nunca validar vaga na aplicação").
 */
export interface IEnrollmentRepository {
  createWithPayment(params: { enrollment: Enrollment; payment: Payment }): Promise<{
    enrollment: Enrollment;
    payment: Payment;
  }>;
}
