import { classGroups, courses } from "@ooc/db";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";

export interface CourseListItem {
  id: string;
  name: string;
  language: string;
  level: string;
  summary: string;
  minAge: number;
  modules: number;
  totalHours: number;
  certificateRule: "automatic" | "exam_required";
  allowsFreeze: boolean;
  allowsTransfer: boolean;
  /** Not retired. The backoffice lists both — taking a course off the shelf is reversible. */
  active: boolean;
  /** Class groups opened on it that are not retired themselves. */
  classGroupCount: number;
}

/**
 * The backoffice course catalog — retired courses included, flagged. Read-only
 * shaping, so it lives beside the repository and not in the domain (same as
 * ListStudentsQuery).
 */
export class ListCoursesQuery {
  constructor(private readonly db: Db) {}

  async run(): Promise<CourseListItem[]> {
    const rows = await this.db
      .select({
        row: courses,
        classGroupCount: sql<number>`count(${classGroups.id})`.mapWith(Number),
      })
      .from(courses)
      .leftJoin(classGroups, and(eq(classGroups.courseId, courses.id), isNull(classGroups.deletedAt)))
      .groupBy(courses.id)
      .orderBy(asc(courses.language), asc(courses.name));

    return rows.map(({ row, classGroupCount }) => toCourseListItem(row, classGroupCount));
  }
}

export function toCourseListItem(row: typeof courses.$inferSelect, classGroupCount: number): CourseListItem {
  return {
    id: row.id,
    name: row.name,
    language: row.language,
    level: row.level,
    summary: row.summary,
    minAge: row.minAge,
    modules: row.modules,
    totalHours: row.totalHours,
    certificateRule: row.certificateRule as CourseListItem["certificateRule"],
    allowsFreeze: row.allowsFreeze,
    allowsTransfer: row.allowsTransfer,
    active: row.deletedAt === null,
    classGroupCount,
  };
}
