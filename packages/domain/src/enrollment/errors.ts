import { NotFoundError } from "../shared/base/errors/NotFoundError.js";
import { UnableToProcessEntryError } from "../shared/base/errors/UnableToProcessEntryError.js";

export class ClassGroupFullError extends UnableToProcessEntryError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({
      reason: "enrollment.class_group_full",
      message: "The class group has no seats left.",
      ...params,
    });
  }
}

export class PlanPriceNotFoundError extends NotFoundError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({
      reason: "enrollment.plan_price_not_found",
      message: "The plan has no price on file.",
      ...params,
    });
  }
}

export class ClassGroupNotFoundError extends NotFoundError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({
      reason: "enrollment.class_group_not_found",
      message: "No open class group with that id and plan.",
      ...params,
    });
  }
}

/**
 * The checkout hold is gone — it ran out, was released, or never existed —
 * so the seat it held may already belong to somebody else. The checkout
 * starts again from the class group step (apps/api/CLAUDE.md, "Dois
 * relógios").
 */
export class SeatHoldExpiredError extends UnableToProcessEntryError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({
      reason: "enrollment.seat_hold_expired",
      message: "The seat hold expired or does not exist.",
      ...params,
    });
  }
}

export class StudentBelowMinimumAgeError extends UnableToProcessEntryError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({
      reason: "enrollment.student_below_minimum_age",
      message: "The student is younger than the course's minimum age.",
      ...params,
    });
  }
}
