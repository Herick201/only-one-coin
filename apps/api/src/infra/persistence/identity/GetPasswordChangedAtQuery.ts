import { sql } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";

// Raw `db.execute()` returns timestamptz as a string (ListStaffQuery.ts
// carries the same note).
interface RawRow extends Record<string, unknown> {
  changedAt: string | null;
}

/**
 * When the account's password last changed after it was created — either by
 * its owner (`staff.password_changed`, ChangeOwnPasswordUseCase) or through a
 * reset link (`staff.password_reset_completed`). Read from `audit_log`, not
 * from Better Auth's "account"."updatedAt": that column also moves at sign-up,
 * and the account screen tells "never changed" apart from "changed on …".
 */
export class GetPasswordChangedAtQuery {
  constructor(private readonly db: Db) {}

  async run(userId: string): Promise<Date | null> {
    const rows = await this.db.execute<RawRow>(
      sql`select max("created_at") as "changedAt" from "audit_log"
          where "target_id" = ${userId}
            and "action" in ('staff.password_changed', 'staff.password_reset_completed')`,
    );
    const changedAt = rows.rows[0]?.changedAt;
    return changedAt ? new Date(changedAt) : null;
  }
}
