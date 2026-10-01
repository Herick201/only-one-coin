import {
  CapacityBelowSeatsTakenError,
  ClassGroup,
  PeriodAlreadyDuplicatedError,
  type ClassGroupStatus,
  type IClassGroupRepository,
  type WeeklySlot,
} from "@ooc/domain";
import { academicPeriods, classGroups, courses } from "@ooc/db";
import { aliasedTable, and, eq, sql } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";

type Row = typeof classGroups.$inferSelect;

export function classGroupFromRow(row: Row): ClassGroup {
  return new ClassGroup({
    id: row.id,
    courseId: row.courseId,
    academicPeriodId: row.academicPeriodId,
    code: row.code,
    teacherName: row.teacherName,
    slots: row.slots as WeeklySlot[],
    startsOn: row.startsOn,
    endsOn: row.endsOn,
    enrollmentOpensAt: row.enrollmentOpensAt,
    enrollmentClosesAt: row.enrollmentClosesAt,
    capacity: row.capacity,
    seatsTaken: row.seatsTaken,
    status: row.status as ClassGroupStatus,
    sourceClassGroupId: row.sourceClassGroupId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  });
}

function insertValues(group: ClassGroup) {
  return {
    id: group.id,
    courseId: group.courseId,
    academicPeriodId: group.academicPeriodId,
    // Panel-made class groups keep the schedule in `slots` only; `schedule`
    // is the seed-era text column and stays empty (OOC-35).
    schedule: "",
    slots: group.slots,
    code: group.code,
    teacherName: group.teacherName,
    startsOn: group.startsOn,
    endsOn: group.endsOn,
    enrollmentOpensAt: group.enrollmentOpensAt,
    enrollmentClosesAt: group.enrollmentClosesAt,
    capacity: group.capacity,
    seatsTaken: 0,
    status: group.status,
    sourceClassGroupId: group.sourceClassGroupId,
  };
}

export class DrizzleClassGroupRepository implements IClassGroupRepository {
  constructor(private readonly db: Db) {}

  async create(group: ClassGroup): Promise<ClassGroup> {
    const [row] = await this.db.insert(classGroups).values(insertValues(group)).returning();
    if (!row) throw new Error("Insert into class_groups returned no row");
    return classGroupFromRow(row);
  }

  async findById(id: string): Promise<ClassGroup | null> {
    const [row] = await this.db.select().from(classGroups).where(eq(classGroups.id, id)).limit(1);
    return row ? classGroupFromRow(row) : null;
  }

  /**
   * Never writes seats_taken, and never lowers capacity below it: the WHERE
   * re-reads the counter at write time, so a seat the checkout took a moment
   * ago counts (apps/api CLAUDE.md, "nunca validar vaga na aplicação").
   */
  async update(group: ClassGroup): Promise<ClassGroup> {
    const [row] = await this.db
      .update(classGroups)
      .set({
        courseId: group.courseId,
        code: group.code,
        teacherName: group.teacherName,
        slots: group.slots,
        startsOn: group.startsOn,
        endsOn: group.endsOn,
        enrollmentOpensAt: group.enrollmentOpensAt,
        enrollmentClosesAt: group.enrollmentClosesAt,
        capacity: group.capacity,
        status: group.status,
        updatedAt: group.updatedAt,
      })
      .where(and(eq(classGroups.id, group.id), sql`${classGroups.seatsTaken} <= ${group.capacity}`))
      .returning();
    if (!row) throw new CapacityBelowSeatsTakenError();
    return classGroupFromRow(row);
  }

  async listForCopy(periodId: string): Promise<{ copyable: ClassGroup[]; skippedRetired: number }> {
    const rows = await this.db
      .select({ group: classGroups, courseDeletedAt: courses.deletedAt })
      .from(classGroups)
      .innerJoin(courses, eq(courses.id, classGroups.courseId))
      .where(eq(classGroups.academicPeriodId, periodId));

    const live = rows.filter((row) => row.group.deletedAt === null && row.courseDeletedAt === null);
    return { copyable: live.map((row) => classGroupFromRow(row.group)), skippedRetired: rows.length - live.length };
  }

  async insertCopies(sourcePeriodId: string, targetPeriodId: string, copies: ClassGroup[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Serializes two duplications into the same target: the second one
      // waits here, then sees the first one's copies below.
      await tx
        .select({ id: academicPeriods.id })
        .from(academicPeriods)
        .where(eq(academicPeriods.id, targetPeriodId))
        .for("update");

      const source = aliasedTable(classGroups, "source");
      const [already] = await tx
        .select({ id: classGroups.id })
        .from(classGroups)
        .innerJoin(source, eq(source.id, classGroups.sourceClassGroupId))
        .where(and(eq(classGroups.academicPeriodId, targetPeriodId), eq(source.academicPeriodId, sourcePeriodId)))
        .limit(1);
      if (already) throw new PeriodAlreadyDuplicatedError();

      if (copies.length > 0) await tx.insert(classGroups).values(copies.map(insertValues));
    });
  }
}
