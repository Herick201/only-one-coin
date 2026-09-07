/**
 * Sets the password on an EXISTING account's credential login — never called
 * for account creation (that's `IStaffAccountProvisioner`). Backed by a raw
 * write to Better Auth's own "account" table, hashed the same way Better
 * Auth's own sign-up does (`better-auth/crypto`'s standalone `hashPassword`),
 * because `auth.api.setUserPassword` (the admin plugin's route) requires an
 * already-resolved admin session in Better Auth's own request context —
 * same reasoning as `IStaffAccessRepository`.
 */
export interface IStaffPasswordSetter {
  setPassword(userId: string, plainPassword: string): Promise<void>;
}
