import { eq, sql } from "drizzle-orm";
import { featureFlagOverrides } from "@ooc/db";
import type {
  FeatureFlagOverride,
  FeatureFlagOverrideView,
  IFeatureFlagOverrideRepository,
} from "@ooc/domain";
import type { Db } from "@/infra/db/client.js";

// node-postgres returns timestamptz as a string through raw `db.execute()`
// (ListStaffRoleChangesQuery carries the same note); the drizzle query builder
// used by `list()` below hands back real Dates.
interface RawOverrideRow extends Record<string, unknown> {
  key: string;
  enabled: boolean;
  updatedBy: string;
  updatedAt: string;
  updatedByName: string | null;
}

export class DrizzleFeatureFlagOverrideRepository implements IFeatureFlagOverrideRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<FeatureFlagOverride[]> {
    const rows = await this.db
      .select({
        key: featureFlagOverrides.key,
        enabled: featureFlagOverrides.enabled,
        updatedBy: featureFlagOverrides.updatedBy,
        updatedAt: featureFlagOverrides.updatedAt,
      })
      .from(featureFlagOverrides);

    return rows;
  }

  /**
   * Raw SQL only for the join: "user" is Better Auth's own table and is not
   * modeled in packages/db (same reason as DrizzleStaffUserLookup). An owner
   * whose account has since been removed leaves the name null — the row is
   * still the truth about the flag, and the panel says "conta removida"
   * rather than hiding it.
   */
  async listForPanel(): Promise<FeatureFlagOverrideView[]> {
    const result = await this.db.execute<RawOverrideRow>(sql`
      select
        f."key" as "key",
        f."enabled" as "enabled",
        f."updated_by" as "updatedBy",
        f."updated_at" as "updatedAt",
        u."name" as "updatedByName"
      from "feature_flag_overrides" f
      left join "user" u on u."id" = f."updated_by"
      order by f."key"
    `);

    return result.rows.map((row) => ({
      key: row.key,
      enabled: row.enabled,
      updatedBy: row.updatedBy,
      updatedAt: new Date(row.updatedAt),
      updatedByName: row.updatedByName,
    }));
  }

  async find(key: string): Promise<FeatureFlagOverride | null> {
    const rows = await this.db
      .select({
        key: featureFlagOverrides.key,
        enabled: featureFlagOverrides.enabled,
        updatedBy: featureFlagOverrides.updatedBy,
        updatedAt: featureFlagOverrides.updatedAt,
      })
      .from(featureFlagOverrides)
      .where(eq(featureFlagOverrides.key, key))
      .limit(1);

    return rows[0] ?? null;
  }

  async set(key: string, enabled: boolean, actorId: string): Promise<void> {
    const now = new Date();

    await this.db
      .insert(featureFlagOverrides)
      .values({ key, enabled, updatedBy: actorId, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: featureFlagOverrides.key,
        set: { enabled, updatedBy: actorId, updatedAt: now },
      });
  }

  /**
   * A real delete, not a `deleted_at`. The no-physical-delete rule (CLAUDE.md
   * §6) protects records of things that happened — a student, a payment, the
   * log. This row is not a record of anything: it is the current position of a
   * switch, and "no row" is a meaningful position (whatever the code says).
   * The history of who moved it lives in `audit_log`, which is never deleted.
   */
  async clear(key: string): Promise<void> {
    await this.db.delete(featureFlagOverrides).where(eq(featureFlagOverrides.key, key));
  }
}
