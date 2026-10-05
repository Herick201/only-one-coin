import { enrollments, portalAccessTokens, students } from "@ooc/db";
import type {
  IPortalAccessRepository,
  IssuePortalTokenRequest,
  PortalAccessOutcome,
  PortalAccessState,
  PortalAccessToken,
  PortalAccountProvisioning,
  PortalAccount,
  PortalIdentifier,
  PortalIdentity,
} from "@ooc/domain";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";
import { insertOutboxEmails } from "@/infra/persistence/notification/DrizzleOutboxRepository.js";
import { provisionPortalAccount } from "./provisionPortalAccount.js";

type AccountRow = { id: string; email: string; name: string; has_password: boolean };

const ACCOUNT_COLUMNS = sql`u."id", u."email", u."name",
  exists (select 1 from "account" a where a."userId" = u."id" and a."providerId" = 'credential' and a."password" is not null) as has_password`;

function toAccount(row: AccountRow): PortalAccount {
  return { userId: row.id, email: row.email, name: row.name, hasPassword: row.has_password };
}

export class DrizzlePortalAccessRepository implements IPortalAccessRepository {
  constructor(private readonly db: Db) {}

  provision(request: PortalAccountProvisioning): Promise<PortalAccessOutcome> {
    return this.db.transaction((tx) => provisionPortalAccount(tx, request));
  }

  async findAccountByStudent(studentId: string): Promise<PortalAccount | null> {
    const result = await this.db.execute<AccountRow>(
      sql`select ${ACCOUNT_COLUMNS} from "students" s join "user" u on u."id" = s."user_id"
          where s."id" = ${studentId} and u."role" = 'student' limit 1`,
    );
    return result.rows[0] ? toAccount(result.rows[0]) : null;
  }

  async findAccountByIdentifier(identifier: PortalIdentifier): Promise<PortalAccount | null> {
    const fileMatches =
      identifier.method === "email"
        ? sql`u."email" = ${identifier.email}`
        : sql`s."national_id_type" = ${identifier.nationalIdType} and ${sql.raw(`regexp_replace(upper(s."national_id"), '[[:space:].-]', '', 'g')`)} = ${identifier.nationalId}`;
    const result = await this.db.execute<AccountRow>(
      sql`select ${ACCOUNT_COLUMNS} from "user" u
          join "students" s on s."user_id" = u."id" and s."deleted_at" is null
          where u."role" = 'student' and coalesce(u."banned", false) = false and ${fileMatches}
          limit 1`,
    );
    return result.rows[0] ? toAccount(result.rows[0]) : null;
  }

  async hasConfirmedEnrollment(studentId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.studentId, studentId), eq(enrollments.seatStatus, "confirmed"), isNull(enrollments.deletedAt)))
      .limit(1);
    return Boolean(row);
  }

  issueToken(request: IssuePortalTokenRequest): Promise<{ id: string } | null> {
    return this.db.transaction(async (tx) => {
      if (request.cooldownSince) {
        const [recent] = await tx
          .select({ id: portalAccessTokens.id })
          .from(portalAccessTokens)
          .where(and(eq(portalAccessTokens.userId, request.userId), gt(portalAccessTokens.createdAt, request.cooldownSince)))
          .limit(1);
        if (recent) return null;
      }
      await tx
        .update(portalAccessTokens)
        .set({ usedAt: sql`now()`, updatedAt: sql`now()` })
        .where(
          and(
            eq(portalAccessTokens.userId, request.userId),
            eq(portalAccessTokens.purpose, request.token.purpose),
            isNull(portalAccessTokens.usedAt),
          ),
        );
      const [token] = await tx
        .insert(portalAccessTokens)
        .values({
          userId: request.userId,
          tokenHash: request.token.tokenHash,
          purpose: request.token.purpose,
          expiresAt: request.token.expiresAt,
        })
        .returning({ id: portalAccessTokens.id });
      await insertOutboxEmails(tx, request.notify(token!.id));
      return { id: token!.id };
    });
  }

  async findToken(tokenHash: string): Promise<PortalAccessToken | null> {
    const [row] = await this.db
      .select({
        id: portalAccessTokens.id,
        userId: portalAccessTokens.userId,
        purpose: portalAccessTokens.purpose,
        expiresAt: portalAccessTokens.expiresAt,
        usedAt: portalAccessTokens.usedAt,
      })
      .from(portalAccessTokens)
      .where(eq(portalAccessTokens.tokenHash, tokenHash))
      .limit(1);
    return row ? { ...row, purpose: row.purpose as PortalAccessToken["purpose"] } : null;
  }

  async consumeToken(id: string): Promise<boolean> {
    const moved = await this.db
      .update(portalAccessTokens)
      .set({ usedAt: sql`now()`, updatedAt: sql`now()` })
      .where(and(eq(portalAccessTokens.id, id), isNull(portalAccessTokens.usedAt), gt(portalAccessTokens.expiresAt, sql`now()`)))
      .returning({ id: portalAccessTokens.id });
    return moved.length > 0;
  }

  async findIdentity(userId: string): Promise<PortalIdentity | null> {
    const [row] = await this.db
      .select({ firstName: students.firstName, lastName: students.lastName, email: students.email })
      .from(students)
      .where(and(eq(students.userId, userId), isNull(students.deletedAt)))
      .orderBy(desc(students.createdAt))
      .limit(1);
    return row ?? null;
  }

  async accessState(studentId: string): Promise<PortalAccessState> {
    const account = await this.findAccountByStudent(studentId);
    if (!account) return "none";
    return account.hasPassword ? "active" : "pending_activation";
  }
}
