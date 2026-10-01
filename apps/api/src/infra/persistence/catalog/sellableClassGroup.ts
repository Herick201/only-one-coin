import { classGroups } from "@ooc/db";
import { and, eq, gt, isNull, lte, or, sql, type SQL } from "drizzle-orm";

/**
 * What "this class group is on sale right now" means, written once (OOC-35):
 * enrolling, not retired, and inside its enrollment window when it has one.
 * The public checkout and the manual-enrollment picker both read through this
 * — a draft, or a window that closed, must disappear from both at once.
 */
export function sellableClassGroup(now: SQL = sql`now()`): SQL {
  return and(
    eq(classGroups.status, "enrolling"),
    isNull(classGroups.deletedAt),
    or(isNull(classGroups.enrollmentOpensAt), lte(classGroups.enrollmentOpensAt, now)),
    or(isNull(classGroups.enrollmentClosesAt), gt(classGroups.enrollmentClosesAt, now)),
  )!;
}
