import {
  WaitlistAlreadyJoinedError,
  WaitlistEntry,
  WaitlistEntryClosedError,
  type IWaitlistRepository,
  type WaitlistLeaveReason,
  type WaitlistStudentStanding,
} from "@ooc/domain";
import { enrollments, students, waitlistEntries } from "@ooc/db";
import { and, eq, isNull, ne } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";

type Row = typeof waitlistEntries.$inferSelect;

/** The partial unique index of migration 0018: one active place per student and class group. */
const ACTIVE_PLACE_INDEX = "waitlist_entries_active_uidx";

function entryFromRow(row: Row): WaitlistEntry {
  return new WaitlistEntry({
    id: row.id,
    classGroupId: row.classGroupId,
    studentId: row.studentId,
    leftAt: row.leftAt,
    leftReason: row.leftReason as WaitlistLeaveReason | null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

/**
 * Whether `error` is the active-place index refusing a second row. Drizzle may
 * hand back the pg DatabaseError itself or wrap it in `cause`; anything else
 * — another constraint, another code — is not ours to translate.
 */
function isActivePlaceViolation(error: unknown): boolean {
  for (const candidate of [error, (error as { cause?: unknown } | null)?.cause]) {
    if (typeof candidate !== "object" || candidate === null) continue;
    const { code, constraint } = candidate as { code?: unknown; constraint?: unknown };
    if (code === "23505") return constraint === undefined || constraint === ACTIVE_PLACE_INDEX;
  }
  return false;
}

export class DrizzleWaitlistRepository implements IWaitlistRepository {
  constructor(private readonly db: Db) {}

  async studentStanding(studentId: string, classGroupId: string): Promise<WaitlistStudentStanding> {
    const [student] = await this.db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.id, studentId), isNull(students.deletedAt)))
      .limit(1);
    if (!student) return "missing";

    const [seat] = await this.db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.studentId, studentId),
          eq(enrollments.classGroupId, classGroupId),
          isNull(enrollments.deletedAt),
          ne(enrollments.seatStatus, "released"),
        ),
      )
      .limit(1);
    return seat ? "enrolled" : "free";
  }

  /**
   * The insert runs in its own transaction so the index's refusal stays
   * contained: a savepoint when the caller is already inside one, and the
   * caller's transaction carries on.
   */
  async join(entry: WaitlistEntry): Promise<WaitlistEntry> {
    try {
      const row = await this.db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(waitlistEntries)
          .values({ id: entry.id, classGroupId: entry.classGroupId, studentId: entry.studentId })
          .returning();
        return inserted;
      });
      if (!row) throw new Error("Insert into waitlist_entries returned no row");
      return entryFromRow(row);
    } catch (error) {
      if (isActivePlaceViolation(error)) throw new WaitlistAlreadyJoinedError({ cause: error });
      throw error;
    }
  }

  async findById(id: string): Promise<WaitlistEntry | null> {
    const [row] = await this.db.select().from(waitlistEntries).where(eq(waitlistEntries.id, id)).limit(1);
    return row ? entryFromRow(row) : null;
  }

  /** Only an open entry is closed: zero rows back means somebody closed it first. */
  async leave(entry: WaitlistEntry): Promise<void> {
    const [row] = await this.db
      .update(waitlistEntries)
      .set({ leftAt: entry.leftAt, leftReason: entry.leftReason, updatedAt: entry.updatedAt })
      .where(and(eq(waitlistEntries.id, entry.id), isNull(waitlistEntries.leftAt)))
      .returning({ id: waitlistEntries.id });
    if (!row) throw new WaitlistEntryClosedError();
  }
}
