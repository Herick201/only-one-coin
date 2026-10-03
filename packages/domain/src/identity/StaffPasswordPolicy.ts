/**
 * What a panel account's password has to be when its owner picks a new one.
 * The account screen lists the same rules while the field is typed into
 * (`apps/app/src/lib/backoffice/account.ts` mirrors them — apps/app does not
 * import this package) so nobody learns a rule from a rejection; this is the
 * copy that counts.
 *
 * The panel's own floor, not a confirmed institutional policy. Better Auth's
 * own minimum (8) still applies underneath and is lower.
 */
export const STAFF_PASSWORD_MIN_LENGTH = 12;

export function meetsStaffPasswordPolicy(password: string): boolean {
  return password.length >= STAFF_PASSWORD_MIN_LENGTH && /\p{L}/u.test(password) && /\d/.test(password);
}
