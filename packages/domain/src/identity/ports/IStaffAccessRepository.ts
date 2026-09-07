/**
 * Opens/closes the door without touching the account itself (CLAUDE.md §8 —
 * removing access is not a delete, whoever approved a payment or signed a
 * grade stays pointed at by those rows). Backed by Better Auth's `admin`
 * plugin (`banned`/`banReason`), which is also what makes a removed account
 * actually fail sign-in, not just read as inactive in the panel.
 */
export interface IStaffAccessRepository {
  ban(userId: string, reason: string): Promise<void>;
  unban(userId: string): Promise<void>;
}
