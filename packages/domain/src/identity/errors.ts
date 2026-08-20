import { ForbiddenError } from "../shared/base/errors/ForbiddenError.js";
import { UnauthorizedError } from "../shared/base/errors/UnauthorizedError.js";

export class NotFreshlyAuthenticatedError extends UnauthorizedError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({
      reason: "auth.not_freshly_authenticated",
      message: "Action requires a fresh re-authentication of the acting admin.",
      ...params,
    });
  }
}

export class InsufficientPrivilegeError extends ForbiddenError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({
      reason: "auth.insufficient_privilege",
      message: "The acting user's role does not permit this action.",
      ...params,
    });
  }
}
