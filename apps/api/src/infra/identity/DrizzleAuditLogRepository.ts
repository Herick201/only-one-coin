import { auditLog } from "@ooc/db";
import type { AuditLogEntry, IAuditLogRepository } from "@ooc/domain";
import type { Db } from "@/infra/db/client.js";

// The one identity adapter that IS a normal Drizzle repository — `audit_log`
// is our own table (packages/db/src/schema.ts), unlike "user"/"session".
export class DrizzleAuditLogRepository implements IAuditLogRepository {
  constructor(private readonly db: Db) {}

  async append(entry: AuditLogEntry): Promise<void> {
    await this.db.insert(auditLog).values({
      actorId: entry.actorId,
      action: entry.action,
      targetId: entry.targetId,
      metadata: entry.metadata ?? null,
      createdAt: entry.at,
    });
  }
}
