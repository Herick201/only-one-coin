import { students } from "@ooc/db";
import { and, eq } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";
import type { LegacyRecord } from "./assemble.js";

// Neither field appears anywhere in the legacy sheets — students.city is
// NOT NULL with no source data to fill it from, and country is the one safe
// default given every course here is sold to students in Peru
// (CLAUDE.md §1). Both are meant to be corrected by the backoffice once a
// real address is known, not treated as real data.
const DEFAULT_COUNTRY = "PE";
const DEFAULT_CITY = "No especificado";

/** Upserts by (nationalIdType, nationalId) — the same person shows up across
 * both the Agosto and Setiembre workbooks (a returning student), and must
 * resolve to one `students` row, never a duplicate. Per this import's
 * decision, no guardian/consent is created even for a minor — the ficha is
 * meant to land incomplete and get completed by the backoffice later. */
export async function upsertStudent(db: Db, record: LegacyRecord): Promise<string> {
  const [existing] = await db
    .select()
    .from(students)
    .where(and(eq(students.nationalIdType, record.nationalIdType), eq(students.nationalId, record.nationalId)));
  if (existing) return existing.id;

  const [created] = await db
    .insert(students)
    .values({
      firstName: record.firstName,
      lastName: record.lastName,
      nationalIdType: record.nationalIdType,
      nationalId: record.nationalId,
      email: record.email,
      phone: record.phone,
      birthDate: record.birthDate,
      country: DEFAULT_COUNTRY,
      region: null,
      city: DEFAULT_CITY,
    })
    .returning();
  return created!.id;
}
