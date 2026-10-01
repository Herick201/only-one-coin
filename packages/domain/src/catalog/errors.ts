import { NotFoundError } from "../shared/base/errors/NotFoundError.js";
import { UnableToProcessEntryError } from "../shared/base/errors/UnableToProcessEntryError.js";

export class CatalogEntryNotFoundError extends NotFoundError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({
      reason: "catalog.entry_not_found",
      message: "No catalog entry of that kind with that id.",
      ...params,
    });
  }
}

export class CourseNotFoundError extends NotFoundError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({ reason: "catalog.course_not_found", message: "No live course with that id.", ...params });
  }
}

export class PlanNotFoundError extends NotFoundError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({ reason: "catalog.plan_not_found", message: "No live plan with that id.", ...params });
  }
}

export class PriceInPastError extends UnableToProcessEntryError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({ reason: "catalog.price_in_past", message: "A price cannot start in the past.", ...params });
  }
}
