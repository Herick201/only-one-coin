import { sql } from "drizzle-orm";
import type { IFreshAuthVerifier } from "@ooc/domain";
import type { Auth } from "@/infra/auth/betterAuth.js";
import type { Db } from "@/infra/db/client.js";

/**
 * Confirms the acting admin's own password again, right now — the plugin
 * `admin` do Better Auth não garante isso sozinho (CLAUDE.md §8). Calls
 * `auth.api.signInEmail` directly (server-side, not over HTTP) purely to
 * check the password; whatever session it mints is never surfaced to the
 * caller, so the admin's real, already-open session is untouched.
 */
export class BetterAuthFreshAuthVerifier implements IFreshAuthVerifier {
  constructor(
    private readonly auth: Auth,
    private readonly db: Db,
  ) {}

  async verify(adminUserId: string, plainPassword: string): Promise<boolean> {
    const rows = await this.db.execute<{ email: string }>(
      sql`select "email" from "user" where "id" = ${adminUserId}`,
    );
    const email = rows.rows[0]?.email;
    if (!email) {
      return false;
    }

    try {
      await this.auth.api.signInEmail({ body: { email, password: plainPassword } });
      return true;
    } catch {
      return false;
    }
  }
}
