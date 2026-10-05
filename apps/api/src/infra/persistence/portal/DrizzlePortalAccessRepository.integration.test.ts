import * as schema from "@ooc/db";
import { academicPeriods, auditLog, classGroups, courses, enrollments, outbox, planPrices, plans, portalAccessTokens, students } from "@ooc/db";
import { newPortalToken, portalCredentialsEmail, type PortalAccountProvisioning } from "@ooc/domain";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/infra/db/client.js";
import { insertPasswordlessUser, upsertCredentialPassword } from "@/infra/auth/credentialAccount.js";
import { DrizzlePortalAccessRepository } from "./DrizzlePortalAccessRepository.js";
import { provisionPortalAccount } from "./provisionPortalAccount.js";

/**
 * The SQL behind student portal access. `students`, `audit_log` are under the
 * delete lock (0011): every test runs inside a transaction that is always
 * rolled back, and the repository is built on that transaction.
 */

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required for this suite.");

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
class RolledBack extends Error {}

let pool: pg.Pool;
let db: Db;

beforeAll(() => {
  pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
  db = drizzle(pool, { schema, casing: "snake_case" });
});
afterAll(async () => {
  await pool.end();
});

async function rolledBack(fn: (tx: Tx, repo: DrizzlePortalAccessRepository) => Promise<void>): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      await fn(tx, new DrizzlePortalAccessRepository(tx as unknown as Db));
      throw new RolledBack();
    });
  } catch (error) {
    if (!(error instanceof RolledBack)) throw error;
  }
}

async function insertStudent(tx: Tx, overrides: Partial<typeof students.$inferInsert> = {}): Promise<string> {
  const [row] = await tx
    .insert(students)
    .values({
      firstName: "Ana",
      lastName: "Quispe",
      nationalIdType: "DNI",
      nationalId: "12345678",
      email: "ana.quispe@gmail.com",
      phone: "999999999",
      birthDate: new Date("2010-05-01T00:00:00.000Z"),
      country: "PE",
      city: "Lima",
      ...overrides,
    })
    .returning({ id: students.id });
  return row!.id;
}

function provisioning(studentId: string): PortalAccountProvisioning {
  const activation = newPortalToken("activation");
  return {
    studentId,
    actorId: "usr_billing",
    activation,
    at: new Date(),
    notify: (account, tokenId) => [portalCredentialsEmail(account, `https://student.test/access/${activation.token}`, tokenId, "es-PE")],
  };
}

describe("provisionPortalAccount", () => {
  it("creates a passwordless student account, links the file, stores the token hash and queues the e-mail", async () => {
    await rolledBack(async (tx, repo) => {
      const studentId = await insertStudent(tx);
      const request = provisioning(studentId);

      expect(await provisionPortalAccount(tx, request)).toBe("created");

      const [student] = await tx.select({ userId: students.userId }).from(students).where(eq(students.id, studentId));
      expect(student!.userId).toBeTruthy();
      const account = await repo.findAccountByStudent(studentId);
      expect(account).toEqual({ userId: student!.userId, email: "ana.quispe@gmail.com", name: "Ana Quispe", hasPassword: false });

      const tokens = await tx.select().from(portalAccessTokens).where(eq(portalAccessTokens.userId, student!.userId!));
      expect(tokens).toHaveLength(1);
      expect(tokens[0]!.tokenHash).toBe(request.activation.tokenHash);
      expect(tokens[0]!.purpose).toBe("activation");

      const mails = await tx.select().from(outbox).where(eq(outbox.recipient, "ana.quispe@gmail.com"));
      expect(mails.map((m) => m.templateKey)).toEqual(["portal_credentials"]);
      expect(JSON.stringify(mails[0]!.vars)).not.toContain(request.activation.tokenHash);

      const audits = await tx.select().from(auditLog).where(eq(auditLog.targetId, studentId));
      expect(audits.map((a) => a.action)).toContain("portal_access.created");
    });
  });

  it("does nothing the second time", async () => {
    await rolledBack(async (tx) => {
      const studentId = await insertStudent(tx);
      await provisionPortalAccount(tx, provisioning(studentId));
      expect(await provisionPortalAccount(tx, provisioning(studentId))).toBe("already_linked");
      const mails = await tx.select().from(outbox).where(eq(outbox.recipient, "ana.quispe@gmail.com"));
      expect(mails).toHaveLength(1);
    });
  });

  it("links a duplicate file of the same document — dots and all — to the existing account", async () => {
    await rolledBack(async (tx) => {
      const first = await insertStudent(tx);
      await provisionPortalAccount(tx, provisioning(first));
      const twin = await insertStudent(tx, { nationalId: "12.345.678", email: "otra.cuenta@gmail.com" });

      expect(await provisionPortalAccount(tx, provisioning(twin))).toBe("linked_existing");

      const rows = await tx.select({ id: students.id, userId: students.userId }).from(students).where(sql`${students.id} in (${first}, ${twin})`);
      expect(new Set(rows.map((r) => r.userId)).size).toBe(1);
      const mails = await tx.select().from(outbox).where(eq(outbox.recipient, "otra.cuenta@gmail.com"));
      expect(mails).toHaveLength(0);
    });
  });

  it("creates nothing when the e-mail belongs to someone else, and says so", async () => {
    await rolledBack(async (tx) => {
      await insertPasswordlessUser(tx, { email: "Ana.Quispe@gmail.com", name: "Hermana", role: "student" });
      const studentId = await insertStudent(tx);

      expect(await provisionPortalAccount(tx, provisioning(studentId))).toBe("email_conflict");

      const [student] = await tx.select({ userId: students.userId }).from(students).where(eq(students.id, studentId));
      expect(student!.userId).toBeNull();
      const audits = await tx.select().from(auditLog).where(eq(auditLog.targetId, studentId));
      expect(audits.map((a) => a.action)).toEqual(["portal_access.email_conflict"]);
    });
  });
});

describe("DrizzlePortalAccessRepository", () => {
  it("finds the account by e-mail or by document only while a live file points at it", async () => {
    await rolledBack(async (tx, repo) => {
      const studentId = await insertStudent(tx, { nationalId: "87.654.321" });
      await provisionPortalAccount(tx, provisioning(studentId));

      const byEmail = await repo.findAccountByIdentifier({ method: "email", email: "ana.quispe@gmail.com" });
      const byDocument = await repo.findAccountByIdentifier({ method: "national_id", nationalIdType: "DNI", nationalId: "87654321" });
      expect(byEmail?.userId).toBeTruthy();
      expect(byDocument?.userId).toBe(byEmail?.userId);
      expect(await repo.findAccountByIdentifier({ method: "national_id", nationalIdType: "CE", nationalId: "87654321" })).toBeNull();

      // An account no file points at (the old open sign-up) never signs in.
      await insertPasswordlessUser(tx, { email: "orphan@gmail.com", name: "Orphan", role: "student" });
      expect(await repo.findAccountByIdentifier({ method: "email", email: "orphan@gmail.com" })).toBeNull();
    });
  });

  it("issues a token, honours the cooldown, and keeps only the newest link alive", async () => {
    await rolledBack(async (tx, repo) => {
      const userId = await insertPasswordlessUser(tx, { email: "beto@gmail.com", name: "Beto", role: "student" });
      const first = newPortalToken("reset");
      const issued = await repo.issueToken({ userId, token: first, cooldownSince: null, notify: () => [] });
      expect(issued?.id).toBeTruthy();

      const blocked = await repo.issueToken({
        userId,
        token: newPortalToken("reset"),
        cooldownSince: new Date(Date.now() - 60_000),
        notify: () => [],
      });
      expect(blocked).toBeNull();

      const second = newPortalToken("reset");
      await repo.issueToken({ userId, token: second, cooldownSince: null, notify: () => [] });
      expect((await repo.findToken(first.tokenHash))?.usedAt).not.toBeNull();
      const live = await repo.findToken(second.tokenHash);
      expect(live?.usedAt).toBeNull();

      expect(await repo.consumeToken(live!.id)).toBe(true);
      expect(await repo.consumeToken(live!.id)).toBe(false);
    });
  });

  it("reports the access state and the identity behind an account", async () => {
    await rolledBack(async (tx, repo) => {
      const studentId = await insertStudent(tx);
      expect(await repo.accessState(studentId)).toBe("none");
      await provisionPortalAccount(tx, provisioning(studentId));
      expect(await repo.accessState(studentId)).toBe("pending_activation");

      const account = await repo.findAccountByStudent(studentId);
      await upsertCredentialPassword(tx, account!.userId, "first-pass-12");
      expect(await repo.accessState(studentId)).toBe("active");
      expect(await repo.findIdentity(account!.userId)).toEqual({ firstName: "Ana", lastName: "Quispe", email: "ana.quispe@gmail.com" });
    });
  });

  it("knows whether the student has a confirmed seat", async () => {
    await rolledBack(async (tx, repo) => {
      const studentId = await insertStudent(tx);
      expect(await repo.hasConfirmedEnrollment(studentId)).toBe(false);
      await seedConfirmedEnrollment(tx, studentId);
      expect(await repo.hasConfirmedEnrollment(studentId)).toBe(true);
    });
  });
});

async function seedConfirmedEnrollment(tx: Tx, studentId: string): Promise<void> {
  const [period] = await tx
    .insert(academicPeriods)
    .values({ name: "Ciclo (portal integration)", startsOn: new Date("2026-03-01T00:00:00.000Z"), endsOn: new Date("2026-07-31T00:00:00.000Z") })
    .returning({ id: academicPeriods.id });
  const [course] = await tx.insert(courses).values({ name: "Curso (portal integration)", language: "Prueba", minAge: 10 }).returning({ id: courses.id });
  const [plan] = await tx.insert(plans).values({ courseId: course!.id, name: "Paquete" }).returning({ id: plans.id });
  const [price] = await tx.insert(planPrices).values({ planId: plan!.id, amountCents: 15000 }).returning({ id: planPrices.id });
  const [group] = await tx
    .insert(classGroups)
    .values({
      courseId: course!.id,
      academicPeriodId: period!.id,
      schedule: "Lun 19:00",
      startsOn: new Date("2026-03-02T00:00:00.000Z"),
      endsOn: new Date("2026-06-30T00:00:00.000Z"),
      capacity: 10,
      seatsTaken: 1,
    })
    .returning({ id: classGroups.id });
  await tx.insert(enrollments).values({ studentId, classGroupId: group!.id, planPriceId: price!.id, seatStatus: "confirmed" });
}
