import { auditLog, portalAccessTokens, students } from "@ooc/db";
import { normalizeEmail, normalizeNationalId, type PortalAccessOutcome, type PortalAccountProvisioning } from "@ooc/domain";
import { and, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";
import { isUniqueViolation } from "@/infra/db/isUniqueViolation.js";
import { insertPasswordlessUser } from "@/infra/auth/credentialAccount.js";
import { insertOutboxEmails } from "@/infra/persistence/notification/DrizzleOutboxRepository.js";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** The document as `normalizeNationalId` writes it, computed in SQL — so a
 * file written before OOC-64 (dots, dashes) matches too. Must stay identical
 * to the expression of index `students_portal_national_id_idx` (0022): the
 * planner only uses the index for that exact expression. */
const normalizedNationalIdSql = sql`regexp_replace(upper(${students.nationalId}), '[[:space:].-]', '', 'g')`;

/**
 * Creates the student's portal account inside the caller's transaction —
 * the payment settlement's, so the account, its link and its e-mail commit or
 * roll back with the approval (spec §2). Locks the student row first: two
 * approvals of the same student serialize here. `FOR NO KEY UPDATE` is
 * enough for that and does not block the KEY SHARE locks that inserts of
 * rows pointing at the student (enrollments, payments) take.
 */
export async function provisionPortalAccount(tx: Tx, request: PortalAccountProvisioning): Promise<PortalAccessOutcome> {
  const [student] = await tx
    .select({
      id: students.id,
      userId: students.userId,
      firstName: students.firstName,
      lastName: students.lastName,
      email: students.email,
      nationalIdType: students.nationalIdType,
      nationalId: students.nationalId,
    })
    .from(students)
    .where(eq(students.id, request.studentId))
    .for("no key update");
  if (!student) throw new Error(`provisionPortalAccount: no student ${request.studentId}`);
  if (student.userId) return "already_linked";

  const [twin] = await tx
    .select({ userId: students.userId })
    .from(students)
    .where(
      and(
        ne(students.id, student.id),
        isNotNull(students.userId),
        isNull(students.deletedAt),
        eq(students.nationalIdType, student.nationalIdType),
        sql`${normalizedNationalIdSql} = ${normalizeNationalId(student.nationalId)}`,
      ),
    )
    .limit(1);
  if (twin?.userId) {
    await tx.update(students).set({ userId: twin.userId, updatedAt: sql`now()` }).where(eq(students.id, student.id));
    return "linked_existing";
  }

  const email = normalizeEmail(student.email);
  const taken = await tx.execute(sql`select 1 from "user" where "email" = ${email} limit 1`);
  if (taken.rows.length > 0) return recordEmailConflict(tx, request, student.id);

  // The SELECT above is only the fast path: a concurrent approval of a
  // duplicate file (or a racing "send access") can insert the same e-mail
  // between it and our INSERT. The account is written inside a savepoint, so
  // that unique violation rolls back only the account — never the settlement
  // around it — and becomes the same `email_conflict`.
  try {
    await tx.transaction((sp) =>
      createAccount(sp, request, { studentId: student.id, email, name: `${student.firstName} ${student.lastName}` }),
    );
  } catch (error) {
    if (isUniqueViolation(error, USER_EMAIL_CONSTRAINT)) return recordEmailConflict(tx, request, student.id);
    throw error;
  }
  return "created";
}

/** The `"user".email` UNIQUE, as `0001_better_auth_core.sql` names it. */
const USER_EMAIL_CONSTRAINT = "user_email_key";

async function recordEmailConflict(tx: Tx, request: PortalAccountProvisioning, studentId: string): Promise<PortalAccessOutcome> {
  await tx.insert(auditLog).values({
    actorId: request.actorId,
    action: "portal_access.email_conflict",
    targetId: studentId,
    metadata: {},
    createdAt: request.at,
  });
  return "email_conflict";
}

async function createAccount(
  tx: Tx,
  request: PortalAccountProvisioning,
  account: { studentId: string; email: string; name: string },
): Promise<void> {
  const { studentId, email, name } = account;
  const userId = await insertPasswordlessUser(tx, { email, name, role: "student" });
  await tx.update(students).set({ userId, updatedAt: sql`now()` }).where(eq(students.id, studentId));
  const [token] = await tx
    .insert(portalAccessTokens)
    .values({
      userId,
      tokenHash: request.activation.tokenHash,
      purpose: request.activation.purpose,
      expiresAt: request.activation.expiresAt,
    })
    .returning({ id: portalAccessTokens.id });
  await insertOutboxEmails(tx, request.notify({ userId, email, name, hasPassword: false }, token!.id));
  await tx.insert(auditLog).values({
    actorId: request.actorId,
    action: "portal_access.created",
    targetId: studentId,
    metadata: { userId },
    createdAt: request.at,
  });
}
