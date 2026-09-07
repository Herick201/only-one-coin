/**
 * Narrow read against Better Auth's own "user" table — just enough to stop an
 * invite being sent to an e-mail that already has an account, without pulling
 * in a general-purpose user repository (CLAUDE.md §8 anti-escalation section
 * keeps writes to that table behind dedicated usecases; this is read-only).
 */
export interface StaffUserDisplay {
  name: string;
  email: string;
}

export interface IStaffUserLookup {
  existsByEmail(email: string): Promise<boolean>;
  /** Name/e-mail for a password-reset link's completion screen. */
  findDisplayByUserId(userId: string): Promise<StaffUserDisplay | null>;
}
