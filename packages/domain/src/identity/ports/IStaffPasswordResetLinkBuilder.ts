import type { Locale } from "../../notification/EmailNotification.js";

/**
 * Where a password-reset token becomes a URL somebody can click. The panel's
 * public origin and its locale routing belong to the deploy, not the domain
 * (CLAUDE.md §6: no hardcoded host).
 */
export interface IStaffPasswordResetLinkBuilder {
  build(token: string, locale: Locale): string;
}
