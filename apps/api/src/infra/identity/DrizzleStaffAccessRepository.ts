import { sql } from "drizzle-orm";
import type { IStaffAccessRepository } from "@ooc/domain";
import type { Db } from "@/infra/db/client.js";

/**
 * Raw SQL against Better Auth's "banned"/"banReason"/"banExpires" columns
 * (added by the `admin` plugin's migration, see
 * packages/db/migrations/0007_*.sql) — not through `auth.api.banUser`/
 * `unbanUser`, which require an already-resolved admin session in Better
 * Auth's own request context (`use: [adminMiddleware]`, better-auth/dist/
 * plugins/admin/routes.mjs) that a domain-level port has no business
 * carrying. What actually enforces the ban is the plugin's own
 * `session.create` hook (better-auth/dist/plugins/admin/admin.mjs), which
 * reads these columns directly from the database on every sign-in — it does
 * not care how they were written, so a direct update here is enforced the
 * same as going through the plugin's API.
 */
export class DrizzleStaffAccessRepository implements IStaffAccessRepository {
  constructor(private readonly db: Db) {}

  async ban(userId: string, reason: string): Promise<void> {
    await this.db.execute(
      sql`update "user" set "banned" = true, "banReason" = ${reason}, "updatedAt" = now() where "id" = ${userId}`,
    );
  }

  async unban(userId: string): Promise<void> {
    await this.db.execute(
      sql`update "user" set "banned" = false, "banReason" = null, "banExpires" = null, "updatedAt" = now() where "id" = ${userId}`,
    );
  }
}
