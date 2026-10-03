import { staffPasswordResets } from "@ooc/db";
import { and, eq, sql } from "drizzle-orm";
import type {
  CreateStaffPasswordResetRecord,
  EmailNotification,
  IssueSelfServiceResetRecord,
  IStaffPasswordResetRepository,
  StaffPasswordReset,
} from "@ooc/domain";
import type { Db } from "@/infra/db/client.js";
import { insertOutboxEmails } from "@/infra/persistence/notification/DrizzleOutboxRepository.js";

type StaffPasswordResetRow = typeof staffPasswordResets.$inferSelect;

function toDomain(row: StaffPasswordResetRow): StaffPasswordReset {
  return {
    id: row.id,
    userId: row.userId,
    token: row.token,
    status: row.status as StaffPasswordReset["status"],
    expiresAt: row.expiresAt,
  };
}

export class DrizzleStaffPasswordResetRepository implements IStaffPasswordResetRepository {
  constructor(private readonly db: Db) {}

  async create(record: CreateStaffPasswordResetRecord): Promise<StaffPasswordReset> {
    const [row] = await this.db
      .insert(staffPasswordResets)
      .values({
        userId: record.userId,
        token: record.token,
        requestedBy: record.requestedBy,
        expiresAt: record.expiresAt,
      })
      .returning();

    return toDomain(row!);
  }

  async findPendingByUserId(userId: string): Promise<StaffPasswordReset | null> {
    const [row] = await this.db
      .select()
      .from(staffPasswordResets)
      .where(and(eq(staffPasswordResets.userId, userId), eq(staffPasswordResets.status, "pending")))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async findById(id: string): Promise<StaffPasswordReset | null> {
    const [row] = await this.db.select().from(staffPasswordResets).where(eq(staffPasswordResets.id, id)).limit(1);
    return row ? toDomain(row) : null;
  }

  async findByToken(token: string): Promise<StaffPasswordReset | null> {
    const [row] = await this.db
      .select()
      .from(staffPasswordResets)
      .where(eq(staffPasswordResets.token, token))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async markCompleted(id: string): Promise<void> {
    await this.db
      .update(staffPasswordResets)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(staffPasswordResets.id, id));
  }

  async markCancelled(id: string): Promise<void> {
    await this.db
      .update(staffPasswordResets)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(staffPasswordResets.id, id));
  }

  async renew(id: string, expiresAt: Date): Promise<void> {
    await this.db
      .update(staffPasswordResets)
      .set({ expiresAt, updatedAt: new Date() })
      .where(eq(staffPasswordResets.id, id));
  }

  async issueSelfService(
    record: IssueSelfServiceResetRecord,
    notify: (reset: StaffPasswordReset) => EmailNotification[],
  ): Promise<StaffPasswordReset | null> {
    return this.db.transaction(async (tx) => {
      // One statement against the one-pending-per-user index, so two requests
      // racing for the same account cannot both insert — the loser updates
      // instead. On a pending row: keep its token, never shorten its expiry,
      // and touch it only outside the cooldown; inside it the update matches
      // nothing, RETURNING is empty, and no e-mail is written.
      const [row] = await tx
        .insert(staffPasswordResets)
        .values({
          userId: record.userId,
          token: record.token,
          requestedBy: record.userId,
          expiresAt: record.expiresAt,
          createdAt: record.requestedAt,
          updatedAt: record.requestedAt,
        })
        .onConflictDoUpdate({
          target: staffPasswordResets.userId,
          targetWhere: sql`${staffPasswordResets.status} = 'pending'`,
          set: {
            expiresAt: sql`greatest(${staffPasswordResets.expiresAt}, excluded."expires_at")`,
            updatedAt: record.requestedAt,
          },
          setWhere: sql`${staffPasswordResets.updatedAt} < ${record.cooldownSince}`,
        })
        .returning();

      if (!row) return null;

      const reset = toDomain(row);
      await insertOutboxEmails(tx, notify(reset));
      return reset;
    });
  }
}
