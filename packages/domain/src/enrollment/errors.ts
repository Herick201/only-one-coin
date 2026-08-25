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
