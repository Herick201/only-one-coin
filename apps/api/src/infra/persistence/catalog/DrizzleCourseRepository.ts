import { Course, type CertificateRule, type ICourseRepository } from "@ooc/domain";
import { courses } from "@ooc/db";
import { eq } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";

type CourseRow = typeof courses.$inferSelect;

export function courseFromRow(row: CourseRow): Course {
  return new Course({
    id: row.id,
    name: row.name,
    language: row.language,
    level: row.level,
    summary: row.summary,
    minAge: row.minAge,
    modules: row.modules,
    totalHours: row.totalHours,
    certificateRule: row.certificateRule as CertificateRule,
    allowsFreeze: row.allowsFreeze,
    allowsTransfer: row.allowsTransfer,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  });
}

export class DrizzleCourseRepository implements ICourseRepository {
  constructor(private readonly db: Db) {}

  async create(course: Course): Promise<Course> {
    const [row] = await this.db
      .insert(courses)
      .values({
        id: course.id,
        name: course.name,
        language: course.language,
        level: course.level,
        summary: course.summary,
        minAge: course.minAge,
        modules: course.modules,
        totalHours: course.totalHours,
        certificateRule: course.certificateRule,
        allowsFreeze: course.allowsFreeze,
        allowsTransfer: course.allowsTransfer,
      })
      .returning();
    if (!row) throw new Error("Insert into courses returned no row");
    return courseFromRow(row);
  }

  async findById(id: string): Promise<Course | null> {
    const [row] = await this.db.select().from(courses).where(eq(courses.id, id)).limit(1);
    return row ? courseFromRow(row) : null;
  }

  async update(course: Course): Promise<Course> {
    // deleted_at is not written here: leaving the catalog is
    // RetireCatalogEntryUseCase's job, and an edit must not undo it.
    const [row] = await this.db
      .update(courses)
      .set({
        name: course.name,
        language: course.language,
        level: course.level,
        summary: course.summary,
        minAge: course.minAge,
        modules: course.modules,
        totalHours: course.totalHours,
        certificateRule: course.certificateRule,
        allowsFreeze: course.allowsFreeze,
        allowsTransfer: course.allowsTransfer,
        updatedAt: course.updatedAt,
      })
      .where(eq(courses.id, course.id))
      .returning();
    if (!row) throw new Error("Update of courses matched no row");
    return courseFromRow(row);
  }
}
