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

/**
 * "Nadie cambia su propio cargo ni se quita el acceso a sí mismo" (CLAUDE.md
 * §8, backed here rather than left as a UI-only convention). Covers role
 * promotion and access removal/restoration alike.
 */
export class CannotActOnSelfError extends ForbiddenError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({
      reason: "auth.cannot_act_on_self",
      message: "An acting admin cannot perform this action on their own account.",
      ...params,
    });
  }
}
