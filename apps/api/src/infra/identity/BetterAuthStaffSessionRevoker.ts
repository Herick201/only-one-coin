import { sql } from "drizzle-orm";
import type { IStaffSessionRevoker } from "@ooc/domain";
import { SESSION_COOKIE_NAME, type Auth } from "@/infra/auth/betterAuth.js";
import type { Db } from "@/infra/db/client.js";

/**
 * Deletes rows straight from Better Auth's "session" table — no cookie cache
 * or secondary storage is configured in `betterAuth.ts`, so the row is the
 * session and a deleted row is a closed one on the next request.
 *
 * The session to keep is resolved through `auth.api.getSession` rather than
 * by parsing the cookie: the cookie value is signed (`token.signature`), and
 * Better Auth's own reader is the one place that knows the format (same
 * reasoning as `BetterAuthCurrentSessionPort`).
 */
export class BetterAuthStaffSessionRevoker implements IStaffSessionRevoker {
  constructor(
    private readonly auth: Auth,
    private readonly db: Db,
  ) {}

  async revokeOthers(userId: string, keepSessionToken: string): Promise<number> {
    const current = await this.auth.api.getSession({
      headers: new Headers({
        cookie: `__Secure-${SESSION_COOKIE_NAME}=${keepSessionToken}; ${SESSION_COOKIE_NAME}=${keepSessionToken}`,
      }),
    });
    // The authorization hook resolved this same session moments ago; if it
    // is gone now, keeping nothing is the safe side of the race.
    const keepId = current?.session.userId === userId ? current.session.id : "";

    const result = await this.db.execute(
      sql`delete from "session" where "userId" = ${userId} and "id" <> ${keepId}`,
    );
    return result.rowCount ?? 0;
  }
}
