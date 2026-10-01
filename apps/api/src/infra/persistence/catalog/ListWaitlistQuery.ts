import { enrollments, students, waitlistEntries } from "@ooc/db";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";

export interface WaitlistItem {
  id: string;
  studentId: string;
  studentName: string;
  nationalIdType: string;
  nationalId: string;
  /** ISO 8601, UTC — rendered in America/Lima by the screen. */
  joinedAt: string;
}

/**
 * Who is still waiting for a class group, first come first served (OOC-35).
 * Read-only shaping, so it lives beside the repository and not in the domain.
 *
 * A student who already holds a live seat in the class group (not retired,
 * not released — the same "enrolled" as `DrizzleWaitlistRepository
 * .studentStanding`) is not waiting, even with the entry still open: the
 * manual enrollment closes the entry, the public checkout does not.
 */
export class ListWaitlistQuery {
  constructor(private readonly db: Db) {}

  async run(classGroupId: string): Promise<WaitlistItem[]> {
    const rows = await this.db
      .select({
        id: waitlistEntries.id,
        studentId: waitlistEntries.studentId,
        firstName: students.firstName,
        lastName: students.lastName,
        nationalIdType: students.nationalIdType,
        nationalId: students.nationalId,
        createdAt: waitlistEntries.createdAt,
      })
      .from(waitlistEntries)
      .innerJoin(students, eq(students.id, waitlistEntries.studentId))
      .where(
        and(
          eq(waitlistEntries.classGroupId, classGroupId),
          isNull(waitlistEntries.leftAt),
          sql`not exists (select 1 from ${enrollments} e where e.student_id = ${waitlistEntries.studentId} and e.class_group_id = ${waitlistEntries.classGroupId} and e.deleted_at is null and e.seat_status <> 'released')`,
        ),
      )
      // uuid v7 ids are time-ordered: the tie-break keeps two entries born in
      // the same transaction in the order they were written.
      .orderBy(asc(waitlistEntries.createdAt), asc(waitlistEntries.id));

    return rows.map((row) => ({
      id: row.id,
      studentId: row.studentId,
      studentName: `${row.firstName} ${row.lastName}`,
      nationalIdType: row.nationalIdType,
      nationalId: row.nationalId,
      joinedAt: row.createdAt.toISOString(),
    }));
  }
}
