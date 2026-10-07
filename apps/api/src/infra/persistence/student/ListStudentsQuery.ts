import { enrollments, students } from "@ooc/db";
import { and, asc, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
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

/** The manual enrollment and waitlist pickers only ever need a short match list. */
const SEARCH_LIMIT = 10;

/** One screen of the directory (`students-table.tsx` shows exactly this many). */
export const DIRECTORY_PAGE_SIZE = 15;

/**
 * Opaque `(created_at, id)` cursor at full microsecond precision. The
 * directory pages by offset now (OOC-76); the student file's activity
 * timeline still walks `audit_log` with it (`StudentActivityQuery`).
 */
export interface StudentListCursor {
  /**
   * UTC timestamp at full microsecond precision, as `to_char` renders it —
   * never a JS `Date`. `created_at` has no explicit column precision, so
   * Postgres keeps microseconds, but `Date` (and `Date#toISOString()`) only
   * carries milliseconds. A cursor built from a truncated `Date` can land
   * mid-microsecond inside a tie (e.g. a bulk import whose rows share one
   * `now()`), where neither `<` nor `=` matches the real column value —
   * pagination stalls there instead of advancing. Round-tripping the raw text
   * keeps the boundary comparison exact.
   */
  createdAt: string;
  id: string;
}

export function encodeStudentCursor(cursor: StudentListCursor): string {
  return Buffer.from(`${cursor.createdAt}|${cursor.id}`, "utf8").toString("base64url");
}

/** Malformed/tampered input decodes to `null` rather than throwing — an
 * invalid cursor just restarts the listing from the top, same as if none had
 * been sent, instead of failing the request over a client-controlled string
 * that carries no authorization meaning of its own. */
export function decodeStudentCursor(raw: string): StudentListCursor | null {
  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    const [createdAt, id] = decoded.split("|");
    if (!createdAt || !id || Number.isNaN(new Date(createdAt).getTime())) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

/** The statuses the directory lists — a student whose only seat is still
 * reserved is settled in Payments, not listed (OOC-55). */
export type DirectoryStatus = Exclude<StudentStatus, "under_review">;

/**
 * What the reader narrowed the directory to (OOC-76). Every field optional —
 * absent means "all" — and every one applied by Postgres: with 30k students a
 * filter that only sees the loaded page answers the wrong question.
 */
export interface StudentDirectoryFilters {
  /** Partial name, document or phone — served by the trigram indexes. */
  q?: string;
  status?: DirectoryStatus;
  /** Only students under 18 today. */
  minor?: boolean;
  sort?: "newest" | "oldest";
  /** 1-based. */
  page?: number;
}

export interface StudentDirectoryPage {
  items: StudentListRow[];
  /** Students matching every filter, across every page. */
  total: number;
  page: number;
  pageSize: number;
  /**
   * How many students the search reaches per chip, ignoring the status and
   * age filters themselves — so each chip says what choosing it would give.
   */
  counts: { all: number; active: number; inactive: number; minors: number };
}

/**
 * Read-only, same reasoning as the rest of this folder for living outside
 * `packages/domain`: nothing here protects a business invariant, it only
 * shapes a read. Two readers, one join:
 *
 * - `directory` — the student directory (OOC-76). Search, status and age run
 *   in Postgres and the result pages by offset, like the enrollment ledger.
 *   It leaves out students whose only enrollments are still reserved: they
 *   are being settled in Payments (OOC-55).
 * - `search` — the manual enrollment and waitlist pickers (CLAUDE.md §1, "a
 *   exceção, não um segundo caminho"): a short match list that still finds
 *   the student under review, so nobody registers the person twice.
 *
 * `status` is derived from `seatStatus` across the student's enrollments —
 * confirmed beats reserved beats "none of the above" ("derived, not a stored
 * column"). It does not know about payment or grading yet.
 */
export class ListStudentsQuery {
  constructor(private readonly db: Db) {}

  /** Per-student enrollment figures, retired enrollments left out (CLAUDE.md §6). */
  private enrollmentStats() {
    return this.db
      .select({
        studentId: enrollments.studentId,
        total: sql<number>`count(*)`.mapWith(Number).as("total"),
        confirmed: sql<number>`count(*) filter (where ${enrollments.seatStatus} = 'confirmed')`
          .mapWith(Number)
          .as("confirmed"),
        reserved: sql<number>`count(*) filter (where ${enrollments.seatStatus} = 'reserved')`
          .mapWith(Number)
          .as("reserved"),
        lastAt: sql<Date | null>`max(${enrollments.updatedAt})`.as("last_at"),
      })
      .from(enrollments)
      .where(isNull(enrollments.deletedAt))
      .groupBy(enrollments.studentId)
      .as("stats");
  }

  async directory(filters: StudentDirectoryFilters = {}): Promise<StudentDirectoryPage> {
    const page = Math.max(1, Math.floor(filters.page ?? 1));
    const stats = this.enrollmentStats();

    const confirmed = sql`coalesce(${stats.confirmed}, 0)`;
    const reserved = sql`coalesce(${stats.reserved}, 0)`;
    const isActive = sql`${confirmed} > 0`;
    // Under 18 today, in UTC — the same rule `isMinor` applies in JS.
    const isMinorSql = sql`${students.birthDate} > ((now() at time zone 'UTC')::date - interval '18 years')`;

    const base: SQL[] = [
      isNull(students.deletedAt),
      // OOC-55: a student whose only seats are still reserved is settled in Payments.
      sql`not (${confirmed} = 0 and ${reserved} > 0)`,
    ];
    const q = filters.q?.trim();
    if (q) {
      const needle = `%${q}%`;
      base.push(
        or(
          ilike(sql`${students.firstName} || ' ' || ${students.lastName}`, needle),
          ilike(students.nationalId, needle),
          ilike(students.phone, needle),
        )!,
      );
    }

    const narrowed: SQL[] = [...base];
    if (filters.status === "active") narrowed.push(isActive);
    if (filters.status === "inactive") narrowed.push(sql`not (${isActive})`);
    if (filters.minor) narrowed.push(isMinorSql);

    const rowsPromise = this.db
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
        totalEnrollments: sql<number>`coalesce(${stats.total}, 0)`.mapWith(Number),
        confirmedEnrollments: sql<number>`${confirmed}`.mapWith(Number),
        lastEnrollmentAt: stats.lastAt,
      })
      .from(students)
      .leftJoin(stats, eq(stats.studentId, students.id))
      .where(and(...narrowed))
      .orderBy(
        ...(filters.sort === "oldest"
          ? [asc(students.createdAt), asc(students.id)]
          : [desc(students.createdAt), desc(students.id)]),
      )
      .limit(DIRECTORY_PAGE_SIZE)
      .offset((page - 1) * DIRECTORY_PAGE_SIZE);

    // One pass for the total and every chip: the chips ignore the status and
    // age filters (they are the choice), the total honours them.
    const statusSql =
      filters.status === "active" ? isActive : filters.status === "inactive" ? sql`not (${isActive})` : sql`true`;
    const minorFilterSql = filters.minor ? isMinorSql : sql`true`;
    const countsPromise = this.db
      .select({
        total: sql<number>`count(*) filter (where ${statusSql} and ${minorFilterSql})`.mapWith(Number),
        all: sql<number>`count(*)`.mapWith(Number),
        active: sql<number>`count(*) filter (where ${isActive})`.mapWith(Number),
        inactive: sql<number>`count(*) filter (where not (${isActive}))`.mapWith(Number),
        minors: sql<number>`count(*) filter (where ${isMinorSql})`.mapWith(Number),
      })
      .from(students)
      .leftJoin(stats, eq(stats.studentId, students.id))
      .where(and(...base));

    const [rows, [counted]] = await Promise.all([rowsPromise, countsPromise]);

    return {
      items: rows.map((row) =>
        toListRow({ ...row, reservedEnrollments: 0 }),
      ),
      total: counted?.total ?? 0,
      page,
      pageSize: DIRECTORY_PAGE_SIZE,
      counts: {
        all: counted?.all ?? 0,
        active: counted?.active ?? 0,
        inactive: counted?.inactive ?? 0,
        minors: counted?.minors ?? 0,
      },
    };
  }

  /** The pickers' short match list — by partial name or document, under review included. */
  async search(q: string): Promise<StudentListRow[]> {
    const needle = `%${q.trim()}%`;
    const stats = this.enrollmentStats();

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
        totalEnrollments: sql<number>`coalesce(${stats.total}, 0)`.mapWith(Number),
        confirmedEnrollments: sql<number>`coalesce(${stats.confirmed}, 0)`.mapWith(Number),
        reservedEnrollments: sql<number>`coalesce(${stats.reserved}, 0)`.mapWith(Number),
        lastEnrollmentAt: stats.lastAt,
      })
      .from(students)
      .leftJoin(stats, eq(stats.studentId, students.id))
      .where(
        and(
          isNull(students.deletedAt),
          or(ilike(sql`${students.firstName} || ' ' || ${students.lastName}`, needle), ilike(students.nationalId, needle)),
        ),
      )
      .orderBy(desc(students.createdAt), desc(students.id))
      .limit(SEARCH_LIMIT);

    return rows.map(toListRow);
  }
}

function toListRow(row: {
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
  updatedAt: Date;
  totalEnrollments: number;
  confirmedEnrollments: number;
  reservedEnrollments: number;
  lastEnrollmentAt: Date | string | null;
}): StudentListRow {
  const status: StudentStatus =
    row.confirmedEnrollments > 0 ? "active" : row.reservedEnrollments > 0 ? "under_review" : "inactive";
  // A raw `max()` out of a subquery can come back as text from the driver.
  const lastEnrollmentAt = row.lastEnrollmentAt === null ? null : new Date(row.lastEnrollmentAt);
  const lastActivityAt = lastEnrollmentAt && lastEnrollmentAt > row.updatedAt ? lastEnrollmentAt : row.updatedAt;

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
}
