import { staffPasswordResets } from "@ooc/db";
import { and, eq } from "drizzle-orm";
import type { CreateStaffPasswordResetRecord, IStaffPasswordResetRepository, StaffPasswordReset } from "@ooc/domain";
import type { Db } from "@/infra/db/client.js";

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
}
