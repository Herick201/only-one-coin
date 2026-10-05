import type { EmailNotification, Locale } from "../../notification/EmailNotification.js";
import type { PortalAccount } from "./PortalAccess.js";

/**
 * Both go to the account's own address and nobody else: they open the
 * student's account (CLAUDE.md §1 — never copied to the guardian,
 * `enrollmentEmails.ts`). The token id makes the dedupe key: the same link is
 * one e-mail, a new link is a new one.
 */
export function portalCredentialsEmail(
  account: PortalAccount,
  accessUrl: string,
  tokenId: string,
  locale: Locale,
): EmailNotification {
  return {
    templateKey: "portal_credentials",
    to: account.email,
    locale,
    vars: { recipientName: account.name, loginEmail: account.email, accessUrl },
    dedupeKey: `portal_credentials:${account.userId}:${tokenId}`,
  };
}

export function portalPasswordResetEmail(
  account: PortalAccount,
  resetUrl: string,
  tokenId: string,
  locale: Locale,
): EmailNotification {
  return {
    templateKey: "portal_password_reset",
    to: account.email,
    locale,
    vars: { recipientName: account.name, resetUrl },
    dedupeKey: `portal_password_reset:${account.userId}:${tokenId}`,
  };
}
