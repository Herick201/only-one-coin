import { ForbiddenError } from "../shared/base/errors/ForbiddenError.js";

/**
 * The switchboard is the owners' own (CLAUDE.md §5): what is on the air is not
 * an operational choice like a fee or a tolerance — it is what the platform
 * admits to existing. The cargo does not decide it; the e-mail domain does
 * (`isOwnerEmail`), which is why a perfectly legitimate `admin` is refused
 * here and nowhere else.
 */
export class NotAPlatformOwnerError extends ForbiddenError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({
      reason: "auth.not_a_platform_owner",
      message: "Only an account on the platform owners' e-mail domain may change a feature flag.",
      ...params,
    });
  }
}
