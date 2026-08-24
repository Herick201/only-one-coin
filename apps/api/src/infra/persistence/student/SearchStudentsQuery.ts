import { students } from "@ooc/db";
import { ilike, or, sql } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";

export interface StudentSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  nationalIdType: string;
  nationalId: string;
}

const MAX_RESULTS = 10;

/**
 * Read-only, no business invariant to protect — deliberately outside
 * packages/domain (the domain-purity boundary exists to protect business
 * rules; a name/DNI search has none). The needle is always bound as a
 * parameter through Drizzle's query builder, never concatenated into SQL —
 * `ilike` here is index-backed by the students_full_name_trgm_idx /
 * students_national_id_trgm_idx GIN indexes (pg_trgm's opclass accelerates
 * ILIKE, not only the `%` similarity operator).
 */
export class SearchStudentsQuery {
  constructor(private readonly db: Db) {}

  async run(query: string): Promise<StudentSearchResult[]> {
    const needle = `%${query}%`;

    return this.db
      .select({
        id: students.id,
        firstName: students.firstName,
        lastName: students.lastName,
        nationalIdType: students.nationalIdType,
        nationalId: students.nationalId,
      })
      .from(students)
      .where(
        or(
          ilike(sql`${students.firstName} || ' ' || ${students.lastName}`, needle),
          ilike(students.nationalId, needle),
        ),
      )
      .limit(MAX_RESULTS);
  }
}
