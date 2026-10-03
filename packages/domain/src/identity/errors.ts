import { ForbiddenError } from "../shared/base/errors/ForbiddenError.js";
import { UnauthorizedError } from "../shared/base/errors/UnauthorizedError.js";
import { UnableToProcessEntryError } from "../shared/base/errors/UnableToProcessEntryError.js";

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

/**
 * The current password typed on the account screen is wrong. 422, not 401:
 * the session is fine — a 401 here would read as "logged out" to the panel.
 */
export class CurrentPasswordIncorrectError extends UnableToProcessEntryError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({
      reason: "staff_password.current_incorrect",
      message: "The current password does not match.",
      ...params,
    });
  }
}

/** The new password misses a rule of `StaffPasswordPolicy`, or repeats the current one. */
export class NewPasswordRejectedError extends UnableToProcessEntryError {
  constructor(params: { reason: "staff_password.too_weak" | "staff_password.unchanged"; path?: string; cause?: unknown }) {
    super({
      message: "The new password does not meet the panel's password rules.",
      ...params,
    });
  }
}
