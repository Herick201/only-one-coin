import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import type { EmailNotification, Locale } from "../notification/EmailNotification.js";

/** The code e-mail names this duration — keep them in step
 * (packages/notifications/src/locales, `email_verification_code`). */
export const EMAIL_VERIFICATION_CODE_TTL_MINUTES = 10;
/** The fifth wrong code burns the row; the checkout asks for a new one.
 * Mirrored by the CHECK on `email_verifications.attempts`. */
export const EMAIL_VERIFICATION_MAX_ATTEMPTS = 5;
/** At most one code per seat hold in this window. */
export const EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;
/** At most this many codes per seat hold, ever. */
export const EMAIL_VERIFICATION_MAX_SENDS_PER_HOLD = 5;

/** Six digits, leading zeros kept, from the CSPRNG. */
export function newVerificationCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** Salted with the row id, so the same code on two rows is two hashes. */
export function hashVerificationCode(verificationId: string, code: string): string {
  return createHash("sha256").update(`${verificationId}:${code}`).digest("hex");
}

export function verificationCodeMatches(verificationId: string, code: string, codeHash: string): boolean {
  const typed = Buffer.from(hashVerificationCode(verificationId, code), "hex");
  const stored = Buffer.from(codeHash, "hex");
  return typed.length === stored.length && timingSafeEqual(typed, stored);
}

/** Only ever to the address being proven — never copied to the guardian. */
export function emailVerificationCodeEmail(params: {
  verificationId: string;
  to: string;
  recipientName: string;
  code: string;
  locale: Locale;
}): EmailNotification {
  return {
    templateKey: "email_verification_code",
    to: params.to,
    locale: params.locale,
    vars: { recipientName: params.recipientName, code: params.code },
    dedupeKey: `email_verification_code:${params.verificationId}:student`,
  };
}
