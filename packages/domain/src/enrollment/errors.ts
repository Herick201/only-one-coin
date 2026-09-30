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

/** No receipt upload row with that id, or it belongs to a different seat
 * hold — the two cases are indistinguishable on purpose (anti-IDOR, CLAUDE.md
 * §8): a client fishing for someone else's upload id learns nothing it
 * couldn't already guess. */
export class ReceiptUploadNotFoundError extends NotFoundError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({
      reason: "enrollment.receipt_upload_not_found",
      message: "No receipt upload with that id for this checkout.",
      ...params,
    });
  }
}

/** The confirm arrived before the object actually landed in the bucket — a
 * client that PUT failed silently, or is still mid-upload. Retryable: the
 * checkout tries the confirm again once the browser's upload finishes. */
export class ReceiptNotUploadedError extends UnableToProcessEntryError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({
      reason: "enrollment.receipt_not_uploaded",
      message: "The receipt file has not reached storage yet.",
      ...params,
    });
  }
}

/** The submit named a receipt upload that was never confirmed (still
 * `pending`) or failed server-side validation (`rejected`) — the checkout
 * cannot proceed without a receipt that actually made it to storage. */
export class ReceiptNotReadyError extends UnableToProcessEntryError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({
      reason: "enrollment.receipt_not_ready",
      message: "The receipt upload is not confirmed for this checkout.",
      ...params,
    });
  }
}
