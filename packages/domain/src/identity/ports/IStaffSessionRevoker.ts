/**
 * Ends an account's open sessions on every other device. Sessions live in
 * Better Auth's own "session" table, so the adapter writes there directly
 * (same reasoning as `IStaffPasswordSetter`).
 */
export interface IStaffSessionRevoker {
  /** Revokes every session of `userId` except the one `keepSessionToken` belongs to; returns how many went. */
  revokeOthers(userId: string, keepSessionToken: string): Promise<number>;
}
