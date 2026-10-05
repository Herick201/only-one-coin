/**
 * What a student's portal password has to be. Softer than the panel's
 * (`StaffPasswordPolicy`, 12): staff also carry MFA (CLAUDE.md §8), students
 * don't, and much of the audience is under age — a rule they cannot meet is a
 * stream of recovery requests. The rate limits and the anti-enumeration answer
 * on sign-in are what stand against brute force.
 *
 * No imports on purpose: apps/app reads this file through the
 * `@ooc/domain/password-policy` subpath to show the same rules while the field
 * is typed into. The API's check is the one that counts.
 */
export const STUDENT_PASSWORD_MIN_LENGTH = 10;
export const STUDENT_PASSWORD_MAX_LENGTH = 128;

export type StudentPasswordIssue = "too_short" | "too_long" | "missing_letter" | "missing_digit";

export function studentPasswordIssues(password: string): StudentPasswordIssue[] {
  const issues: StudentPasswordIssue[] = [];
  if (password.length < STUDENT_PASSWORD_MIN_LENGTH) issues.push("too_short");
  if (password.length > STUDENT_PASSWORD_MAX_LENGTH) issues.push("too_long");
  if (!/\p{L}/u.test(password)) issues.push("missing_letter");
  if (!/\d/.test(password)) issues.push("missing_digit");
  return issues;
}

export function meetsStudentPasswordPolicy(password: string): boolean {
  return studentPasswordIssues(password).length === 0;
}
