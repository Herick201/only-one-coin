import type { EnrollmentEmailContext, IEnrollmentEmailContextLookup } from "@ooc/domain";
import { classGroups, courses, guardians, students } from "@ooc/db";
import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";

export class DrizzleEnrollmentEmailContextLookup implements IEnrollmentEmailContextLookup {
  constructor(private readonly db: Db) {}

  async find(params: { studentId: string; classGroupId: string }): Promise<EnrollmentEmailContext | null> {
    const [studentRow] = await this.db
      .select({
        firstName: students.firstName,
        lastName: students.lastName,
        email: students.email,
        birthDate: students.birthDate,
      })
      .from(students)
      .where(eq(students.id, params.studentId));

    if (!studentRow) return null;

    // No retirement filter on the class group or course: this lookup only
    // decides what the e-mail says, never whether the enrollment is allowed
    // — that is the write's job, and it stays exactly as it was.
    const [classGroupRow] = await this.db
      .select({ courseName: courses.name, startsOn: classGroups.startsOn })
      .from(classGroups)
      .innerJoin(courses, eq(courses.id, classGroups.courseId))
      .where(eq(classGroups.id, params.classGroupId));

    // A draft has no start date yet (OOC-35) and cannot take an enrollment:
    // no context, and the write's seat guard refuses it on its own.
    if (!classGroupRow?.startsOn) return null;

    const [guardianRow] = await this.db
      .select({ firstName: guardians.firstName, email: guardians.email })
      .from(guardians)
      .where(and(eq(guardians.studentId, params.studentId), isNull(guardians.deletedAt)));

    return {
      student: studentRow,
      guardian: guardianRow ?? null,
      courseName: classGroupRow.courseName,
      classGroupStartsOn: classGroupRow.startsOn,
    };
  }
}
