import { hashPassword } from "better-auth/crypto";
import { sql } from "drizzle-orm";
import type { IStaffPasswordSetter } from "@ooc/domain";
import type { Db } from "@/infra/db/client.js";

/**
 * Hashes with the same standalone hasher Better Auth's own email/password
 * plugin uses internally (`better-auth/crypto`'s `hashPassword` — scrypt via
 * `node:crypto`, no custom hasher configured in `betterAuth.ts`), then writes
 * straight to the credential row on Better Auth's "account" table. Every
 * staff account exists via `signUpEmail` (`BetterAuthStaffAccountProvisioner`),
 * so the credential row already exists — this is always an UPDATE, never an
 * insert, unlike the admin plugin's own `setUserPassword` route (which also
 * requires an admin session in Better Auth's own request context to call at
 * all, see `DrizzleStaffAccessRepository`'s doc comment for the same
 * limitation).
 */
export class BetterAuthStaffPasswordSetter implements IStaffPasswordSetter {
  constructor(private readonly db: Db) {}

  async setPassword(userId: string, plainPassword: string): Promise<void> {
    const hashed = await hashPassword(plainPassword);
    await this.db.execute(
      sql`update "account" set "password" = ${hashed}, "updatedAt" = now() where "userId" = ${userId} and "providerId" = 'credential'`,
    );
  }
}
