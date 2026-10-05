import * as schema from "@ooc/db";
import { academicPeriods, auditLog, classGroups, courses, enrollments, outbox, payments, planPrices, plans, students } from "@ooc/db";
import {
  newPortalToken,
  PaymentAlreadySettledError,
  PaymentSeatReleasedError,
  portalCredentialsEmail,
  type AuditLogEntry,
} from "@ooc/domain";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/infra/db/client.js";
import { DrizzlePaymentSettlementRepository } from "./DrizzlePaymentSettlementRepository.js";

/**
 * The SQL that finishes an enrollment (OOC-55): the conditional UPDATEs are
 * the whole guard against two reviewers deciding the same payment, and the
 * seat counter has to come back exactly once on a rejection.
 *
 * `payments`, `students` and `audit_log` are under the delete lock (0011):
 * every test runs in a transaction that is always rolled back.
 */

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required: this suite exercises the payment settlement SQL against a real, migrated Postgres.");
}

const PERIOD = "018f2b5c-8000-7000-8000-000000000001";
const COURSE = "018f2b5c-8000-7000-8000-000000000002";
const PLAN = "018f2b5c-8000-7000-8000-000000000003";
const PLAN_PRICE = "018f2b5c-8000-7000-8000-000000000004";
const GROUP = "018f2b5c-8000-7000-8000-000000000005";

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

async function rolledBack(fn: (tx: Tx) => Promise<void>): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      await seedCatalog(tx);
      await fn(tx);
      throw new RolledBack();
    });
  } catch (error) {
    if (!(error instanceof RolledBack)) throw error;
  }
}

async function seedCatalog(tx: Tx): Promise<void> {
  await tx.insert(academicPeriods).values({
    id: PERIOD,
    name: "Ciclo de prueba (settlement integration)",
    startsOn: new Date("2026-03-01T00:00:00.000Z"),
    endsOn: new Date("2026-07-31T00:00:00.000Z"),
  });
  await tx.insert(courses).values({ id: COURSE, name: "Curso (settlement integration)", language: "Prueba", minAge: 12 });
  await tx.insert(plans).values({ id: PLAN, courseId: COURSE, name: "Paquete completo" });
  await tx.insert(planPrices).values({ id: PLAN_PRICE, planId: PLAN, amountCents: 15000 });
  await tx.insert(classGroups).values({
    id: GROUP,
    courseId: COURSE,
    academicPeriodId: PERIOD,
    schedule: "Lun/Mié 19:00",
    startsOn: new Date("2026-03-02T00:00:00.000Z"),
    endsOn: new Date("2026-06-30T00:00:00.000Z"),
    capacity: 50,
    seatsTaken: 1,
  });
}

let sequence = 0;

/** What a submit leaves behind: a student, a reserved seat and an open payment. */
async function openPayment(
  tx: Tx,
  params: { seatStatus?: "reserved" | "confirmed" | "released"; status?: string } = {},
): Promise<{ paymentId: string; enrollmentId: string; studentId: string }> {
  sequence += 1;
  const [student] = await tx
    .insert(students)
    .values({
      firstName: "Pago",
      lastName: `Liquidacion${sequence}`,
      nationalIdType: "DNI",
      nationalId: `SETTLE${sequence}`,
      email: `settle.${sequence}@gmail.com`,
      phone: "+51900000000",
      birthDate: new Date("2000-01-01T00:00:00.000Z"),
      country: "PE",
      city: "Lima",
    })
    .returning({ id: students.id });
  const [enrollment] = await tx
    .insert(enrollments)
    .values({ studentId: student!.id, classGroupId: GROUP, planPriceId: PLAN_PRICE, seatStatus: params.seatStatus ?? "reserved" })
    .returning({ id: enrollments.id });
  const [payment] = await tx
    .insert(payments)
    .values({
      enrollmentId: enrollment!.id,
      idempotencyKey: `settle-integration-${sequence}-${Date.now()}`,
      status: params.status ?? "pending",
      method: "yape",
      amountCents: 15000,
      operationNumber: `OPSETTLE${sequence}${Date.now()}`,
    })
    .returning({ id: payments.id });
  return { paymentId: payment!.id, enrollmentId: enrollment!.id, studentId: student!.id };
}

function audit(paymentId: string, action: string): AuditLogEntry {
  return { actorId: "usr_billing", action, targetId: paymentId, metadata: { test: true }, at: new Date() };
}

async function seatsTaken(tx: Tx): Promise<number> {
  const [row] = await tx.select({ value: classGroups.seatsTaken }).from(classGroups).where(eq(classGroups.id, GROUP));
  return row!.value;
}

describe("DrizzlePaymentSettlementRepository", () => {
  it("reads what the usecase needs to decide", async () => {
    await rolledBack(async (tx) => {
      const repository = new DrizzlePaymentSettlementRepository(tx as unknown as Db);
      const { paymentId, enrollmentId } = await openPayment(tx);

      const found = await repository.findForSettlement(paymentId);

      expect(found).toMatchObject({ paymentId, enrollmentId, classGroupId: GROUP, status: "pending", seatStatus: "reserved" });
    });
  });

  it("approving confirms the seat, writes the audit entry and the e-mail", async () => {
    await rolledBack(async (tx) => {
      const repository = new DrizzlePaymentSettlementRepository(tx as unknown as Db);
      const { paymentId, enrollmentId } = await openPayment(tx);

      const result = await repository.settle({
        paymentId,
        enrollmentId,
        classGroupId: GROUP,
        to: "approved",
        notifications: [
          {
            templateKey: "payment_approved",
            to: "settle@gmail.com",
            locale: "es-PE",
            vars: { recipientName: "Pago", studentName: "Pago L", courseName: "Curso", startsOn: "2026-03-02T00:00:00.000Z" },
            dedupeKey: `payment_approved:${paymentId}:student`,
          },
        ],
        audit: audit(paymentId, "payment.approved"),
        portalAccess: null,
      });

      expect(result.seatStatus).toBe("confirmed");
      const [payment] = await tx.select({ status: payments.status }).from(payments).where(eq(payments.id, paymentId));
      expect(payment!.status).toBe("approved");
      const entries = await tx.select().from(auditLog).where(eq(auditLog.targetId, paymentId));
      expect(entries.map((entry) => entry.action)).toEqual(["payment.approved"]);
      const mails = await tx.select().from(outbox).where(eq(outbox.dedupeKey, `payment_approved:${paymentId}:student`));
      expect(mails).toHaveLength(1);
      expect(await seatsTaken(tx)).toBe(1);
    });
  });

  it("rejecting releases the seat and gives it back to the class group once", async () => {
    await rolledBack(async (tx) => {
      const repository = new DrizzlePaymentSettlementRepository(tx as unknown as Db);
      const { paymentId, enrollmentId } = await openPayment(tx);

      const result = await repository.settle({
        paymentId,
        enrollmentId,
        classGroupId: GROUP,
        to: "rejected",
        notifications: [],
        audit: audit(paymentId, "payment.rejected"),
        portalAccess: null,
      });

      expect(result.seatStatus).toBe("released");
      expect(await seatsTaken(tx)).toBe(0);
    });
  });

  it("a second decision on the same payment is refused and changes nothing", async () => {
    await rolledBack(async (tx) => {
      const repository = new DrizzlePaymentSettlementRepository(tx as unknown as Db);
      const { paymentId, enrollmentId } = await openPayment(tx);
      const params = { paymentId, enrollmentId, classGroupId: GROUP, notifications: [], portalAccess: null };

      await repository.settle({ ...params, to: "rejected", audit: audit(paymentId, "payment.rejected") });
      await expect(
        repository.settle({ ...params, to: "approved", audit: audit(paymentId, "payment.approved") }),
      ).rejects.toBeInstanceOf(PaymentAlreadySettledError);

      const [payment] = await tx.select({ status: payments.status }).from(payments).where(eq(payments.id, paymentId));
      expect(payment!.status).toBe("rejected");
      expect(await seatsTaken(tx)).toBe(0);
    });
  });

  it("refuses to approve over a released seat and rolls the payment back", async () => {
    await rolledBack(async (tx) => {
      const repository = new DrizzlePaymentSettlementRepository(tx as unknown as Db);
      const { paymentId, enrollmentId } = await openPayment(tx, { seatStatus: "released" });

      await expect(
        repository.settle({
          paymentId,
          enrollmentId,
          classGroupId: GROUP,
          to: "approved",
          notifications: [],
          audit: audit(paymentId, "payment.approved"),
          portalAccess: null,
        }),
      ).rejects.toBeInstanceOf(PaymentSeatReleasedError);

      const [payment] = await tx.select({ status: payments.status }).from(payments).where(eq(payments.id, paymentId));
      expect(payment!.status).toBe("pending");
    });
  });

  it("a confirmed seat (a monthly module) is left alone when its payment is rejected", async () => {
    await rolledBack(async (tx) => {
      const repository = new DrizzlePaymentSettlementRepository(tx as unknown as Db);
      const { paymentId, enrollmentId } = await openPayment(tx, { seatStatus: "confirmed" });

      const result = await repository.settle({
        paymentId,
        enrollmentId,
        classGroupId: GROUP,
        to: "rejected",
        notifications: [],
        audit: audit(paymentId, "payment.rejected"),
        portalAccess: null,
      });

      expect(result.seatStatus).toBe("confirmed");
      expect(await seatsTaken(tx)).toBe(1);
    });
  });

  it("creates the student's portal account with the approval, and rolls it back with it", async () => {
    await rolledBack(async (tx) => {
      const { paymentId, enrollmentId, studentId } = await openPayment(tx);
      const repository = new DrizzlePaymentSettlementRepository(tx as unknown as Db);
      const activation = newPortalToken("activation");

      const result = await repository.settle({
        paymentId,
        enrollmentId,
        classGroupId: GROUP,
        to: "approved",
        notifications: [],
        audit: audit(paymentId, "payment.approved"),
        portalAccess: {
          studentId,
          actorId: "usr_billing",
          activation,
          at: new Date(),
          notify: (account, tokenId) => [portalCredentialsEmail(account, "https://student.test/access/x", tokenId, "es-PE")],
        },
      });

      expect(result).toEqual({ seatStatus: "confirmed", portalAccess: "created" });
      const [student] = await tx.select({ userId: students.userId }).from(students).where(eq(students.id, studentId));
      expect(student!.userId).toBeTruthy();
      const mails = await tx.select().from(outbox).where(eq(outbox.templateKey, "portal_credentials"));
      expect(mails).toHaveLength(1);
    });
  });
});
