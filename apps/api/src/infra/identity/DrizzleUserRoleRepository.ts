import { sql } from "drizzle-orm";
import type { IUserRoleRepository, Role } from "@ooc/domain";
import type { Db } from "@/infra/db/client.js";

// Raw SQL against Better Auth's own "user" table — same reason
// apps/api/src/scripts/seed-admin.ts already uses raw SQL there instead of a
// Drizzle schema object: that table is hand-rolled by Better Auth
// (packages/db/migrations/0001_better_auth_core.sql), not modeled in
// packages/db/src/schema.ts.
export class DrizzleUserRoleRepository implements IUserRoleRepository {
  constructor(private readonly db: Db) {}

  async findRoleByUserId(userId: string): Promise<Role | null> {
    const rows = await this.db.execute<{ role: Role }>(
      sql`select "role" from "user" where "id" = ${userId}`,
    );
    return rows.rows[0]?.role ?? null;
  }

  async updateRole(userId: string, role: Role): Promise<void> {
    await this.db.execute(
      sql`update "user" set "role" = ${role}, "updatedAt" = now() where "id" = ${userId}`,
    );
  }
}
