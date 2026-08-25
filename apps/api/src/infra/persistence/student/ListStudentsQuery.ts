import { enrollments, students } from "@ooc/db";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";

export type StudentStatus = "active" | "under_review" | "inactive";

// Same "full years, not calendar years" rule the public checkout already
// uses (apps/app/src/lib/enrollment/checkout.ts, ageFrom/isMinor) — kept in
// sync by hand since apps/app has no Postgres credential to compute this
// server-side itself (CLAUDE.md §8).
export function isMinor(birthDate: Date, now = new Date()): boolean {
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const hasHadBirthdayThisYear =
    now.getUTCMonth() > birthDate.getUTCMonth() ||
    (now.getUTCMonth() === birthDate.getUTCMonth() && now.getUTCDate() >= birthDate.getUTCDate());
  if (!hasHadBirthdayThisYear) age -= 1;

  return age < 18;
}

export interface StudentListRow {
  id: string;
  firstName: string;
  lastName: string;
  nationalIdType: string;
  nationalId: string;
  email: string;
  phone: string;
  birthDate: Date;
  country: string;
  region: string | null;
  city: string;
  createdAt: Date;
  isMinor: boolean;
  status: StudentStatus;
  activeCourses: number;
  totalEnrollments: number;
  lastActivityAt: Date;
}

// No pagination yet — fine at seed scale, not at the 30k the platform is
// meant to reach (docs/ROADMAP.md Sessão 34 sizes the real search for that).
// This cap keeps an unfiltered directory read from becoming an unbounded
// table scan in the meantime; real pagination is follow-up work, not a
// silent promise this route already keeps.
const LIST_LIMIT = 200;
const SEARCH_LIMIT = 10;

/**
 * Read-only, same reasoning as the rest of this folder for living outside
 * `packages/domain`: nothing here protects a business invariant, it only
 * shapes a read. Serves both the student directory (no `q`) and the manual
 * enrollment form's picker (`q` set — CLAUDE.md §1, "a exceção, não um
 * segundo caminho") off the same query, since the underlying join is
 * identical either way.
 *
 * `status` is derived from `seatStatus` across the student's enrollments —
 * confirmed beats reserved beats "none of the above" — matching the schema
 * comment on `students.ts` ("derived, not a stored column"). This is a
 * first-pass rule: it does not know about payment or grading yet, since
 * neither is queried here, so a student who paid but whose seat hasn't
 * flipped to `confirmed` still reads `under_review`.
 */
export class ListStudentsQuery {
  constructor(private readonly db: Db) {}

  async run(q?: string): Promise<StudentListRow[]> {
    const needle = q ? `%${q}%` : null;

    const rows = await this.db
      .select({
        id: students.id,
        firstName: students.firstName,
        lastName: students.lastName,
        nationalIdType: students.nationalIdType,
        nationalId: students.nationalId,
        email: students.email,
        phone: students.phone,
        birthDate: students.birthDate,
        country: students.country,
        region: students.region,
        city: students.city,
        createdAt: students.createdAt,
        updatedAt: students.updatedAt,
        totalEnrollments: sql<number>`count(${enrollments.id})`.mapWith(Number),
        confirmedEnrollments:
          sql<number>`count(${enrollments.id}) filter (where ${enrollments.seatStatus} = 'confirmed')`.mapWith(
            Number,
          ),
        reservedEnrollments:
          sql<number>`count(${enrollments.id}) filter (where ${enrollments.seatStatus} = 'reserved')`.mapWith(
            Number,
          ),
        lastEnrollmentAt: sql<Date | null>`max(${enrollments.updatedAt})`,
      })
      .from(students)
      .leftJoin(enrollments, eq(enrollments.studentId, students.id))
      .where(
        needle
          ? and(
              isNull(students.deletedAt),
              or(ilike(sql`${students.firstName} || ' ' || ${students.lastName}`, needle), ilike(students.nationalId, needle)),
            )
          : isNull(students.deletedAt),
      )
      .groupBy(students.id)
      .orderBy(desc(students.createdAt))
      .limit(needle ? SEARCH_LIMIT : LIST_LIMIT);

    return rows.map((row): StudentListRow => {
      const status: StudentStatus =
        row.confirmedEnrollments > 0 ? "active" : row.reservedEnrollments > 0 ? "under_review" : "inactive";

      const lastActivityAt =
        row.lastEnrollmentAt && row.lastEnrollmentAt > row.updatedAt ? row.lastEnrollmentAt : row.updatedAt;

      return {
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        nationalIdType: row.nationalIdType,
        nationalId: row.nationalId,
        email: row.email,
        phone: row.phone,
        birthDate: row.birthDate,
        country: row.country,
        region: row.region,
        city: row.city,
        createdAt: row.createdAt,
        isMinor: isMinor(row.birthDate),
        status,
        activeCourses: row.confirmedEnrollments,
        totalEnrollments: row.totalEnrollments,
        lastActivityAt,
      };
    });
  }
}
