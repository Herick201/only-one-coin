import * as schema from "@ooc/db";
import {
  academicPeriods,
  auditLog,
  classGroups,
  courses,
  enrollments,
  payments,
  planPrices,
  plans,
  receiptUploads,
  seatHolds,
  students,
} from "@ooc/db";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/infra/db/client.js";
import { ListPaymentReviewQueueQuery, REVIEW_WINDOW_DAYS } from "./ListPaymentReviewQueueQuery.js";
import { ListPaymentsQuery } from "./ListPaymentsQuery.js";

/**
 * The two reads behind the Payments screens (OOC-55): the ledger of every
 * payment and the queue of the ones still open. What has to hold is the SQL
 * the type checker cannot see — which upload speaks for a payment, which
 * audit entry names the decision, and that every filter runs in Postgres.
 *
 * `payments`, `students` and `audit_log` are under the delete lock (0011):
 * every test runs in a transaction that is always rolled back, and every
 * assertion is narrowed to this suite's own academic period so rows already
 * in the database never leak in.
 */

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required: this suite exercises the payment read SQL against a real, migrated Postgres.");
}

const PERIOD = "018f2b5c-9000-7000-8000-000000000001";
const COURSE = "018f2b5c-9000-7000-8000-000000000002";
const PLAN = "018f2b5c-9000-7000-8000-000000000003";
const PLAN_PRICE = "018f2b5c-9000-7000-8000-000000000004";
const GROUP = "018f2b5c-9000-7000-8000-000000000005";
const PERIOD_NAME = "Ciclo de prueba (payment queries integration)";

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
    name: PERIOD_NAME,
    startsOn: new Date("2026-03-01T00:00:00.000Z"),
    endsOn: new Date("2026-07-31T00:00:00.000Z"),
  });
  await tx.insert(courses).values({ id: COURSE, name: "Curso (payment queries integration)", language: "Prueba", minAge: 12 });
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
    seatsTaken: 4,
  });
}

interface SeededPayments {
  pending: string;
  underReview: string;
  approved: string;
  rejected: string;
  operationOf: { pending: string; underReview: string; approved: string; rejected: string };
}

type SeedKey = keyof SeededPayments["operationOf"];

/**
 * Four payments in the suite's period, a minute apart, oldest first: one
 * nobody has sent a receipt for, one whose receipt was screened and flagged,
 * one approved (with its audit entry) and one rejected.
 */
async function seedPayments(tx: Tx): Promise<SeededPayments> {
  const stamp = Date.now();
  const base = stamp - 10 * 60_000;
  const plan: { key: SeedKey; status: string; seatStatus: "reserved" | "confirmed" | "released" }[] = [
    { key: "pending", status: "pending", seatStatus: "reserved" },
    { key: "underReview", status: "under_review", seatStatus: "reserved" },
    { key: "approved", status: "approved", seatStatus: "confirmed" },
    { key: "rejected", status: "rejected", seatStatus: "released" },
  ];

  const ids = {} as Record<SeedKey, string>;
  const enrollmentOf = {} as Record<SeedKey, string>;
  const operationOf = {} as Record<SeedKey, string>;

  for (const [index, entry] of plan.entries()) {
    const [student] = await tx
      .insert(students)
      .values({
        firstName: "Pago",
        lastName: `Consulta${index}`,
        nationalIdType: "DNI",
        nationalId: `PAYQ${stamp}${index}`,
        email: `payq.${stamp}.${index}@gmail.com`,
        phone: "+51900000000",
        birthDate: new Date("2000-01-01T00:00:00.000Z"),
        country: "PE",
        city: "Lima",
      })
      .returning({ id: students.id });
    const [enrollment] = await tx
      .insert(enrollments)
      .values({ studentId: student!.id, classGroupId: GROUP, planPriceId: PLAN_PRICE, seatStatus: entry.seatStatus })
      .returning({ id: enrollments.id });
    const createdAt = new Date(base + index * 60_000);
    operationOf[entry.key] = `OPPAYQ${stamp}${index}`;
    const [payment] = await tx
      .insert(payments)
      .values({
        enrollmentId: enrollment!.id,
        idempotencyKey: `payment-queries-integration-${stamp}-${index}`,
        status: entry.status,
        method: "yape",
        amountCents: 15000,
        operationNumber: operationOf[entry.key],
        createdAt,
        updatedAt: createdAt,
      })
      .returning({ id: payments.id });
    ids[entry.key] = payment!.id;
    enrollmentOf[entry.key] = enrollment!.id;
  }

  const [hold] = await tx
    .insert(seatHolds)
    .values({
      classGroupId: GROUP,
      origin: "web",
      status: "consumed",
      enrollmentId: enrollmentOf.underReview,
      settledAt: new Date(),
      expiresAt: new Date(),
    })
    .returning({ id: seatHolds.id });
  await tx.insert(receiptUploads).values({
    seatHoldId: hold!.id,
    paymentId: ids.underReview,
    objectKey: `receipts/payment-queries-integration/${stamp}/raw.jpg`,
    processedObjectKey: `receipts/payment-queries-integration/${stamp}/processed.jpg`,
    status: "processed",
    fraudSignals: [
      { kind: "identical_file", receiptUploadId: "018f2b5c-9000-7000-8000-0000000000aa", paymentId: "018f2b5c-9000-7000-8000-0000000000bb" },
    ],
    screenedAt: new Date(),
  });

  await tx.insert(auditLog).values({
    actorId: "usr_payment_queries_integration",
    action: "payment.approved",
    targetId: ids.approved,
    metadata: { test: true },
  });

  return { ...ids, operationOf };
}

describe("ListPaymentReviewQueueQuery", () => {
  it("lists only open payments, oldest first, with receipt state, signals and deadline", async () => {
    await rolledBack(async (tx) => {
      const seeded = await seedPayments(tx);
      const queue = await new ListPaymentReviewQueueQuery(tx as unknown as Db).run({ academicPeriodId: PERIOD });

      expect(queue.total).toBe(2);
      expect(queue.items.map((item) => item.id)).toEqual([seeded.pending, seeded.underReview]);
      expect(queue.items[0]!.receipt).toBe("missing");
      expect(queue.items[1]!.receipt).toBe("ready");
      expect(queue.items[0]!.fraudSignals).toEqual([]);
      expect(queue.items[1]!.fraudSignals).toEqual(["identical_file"]);
      const item = queue.items[0]!;
      expect(item.reviewDeadline.getTime() - item.submittedAt.getTime()).toBe(REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);
      expect(item.expectedAmountCents).toBe(15000);
      expect(item).toMatchObject({ classGroupName: "Lun/Mié 19:00", planName: "Paquete completo", status: "pending", currency: "PEN" });
    });
  });

  it("finds an open payment by its operation number", async () => {
    await rolledBack(async (tx) => {
      const seeded = await seedPayments(tx);
      const queue = await new ListPaymentReviewQueueQuery(tx as unknown as Db).run({
        academicPeriodId: PERIOD,
        q: seeded.operationOf.underReview,
      });

      expect(queue.items.map((item) => item.id)).toEqual([seeded.underReview]);
    });
  });
});

describe("ListPaymentsQuery", () => {
  it("lists every payment of the period, newest first", async () => {
    await rolledBack(async (tx) => {
      const seeded = await seedPayments(tx);
      const ledger = await new ListPaymentsQuery(tx as unknown as Db).run({ academicPeriodId: PERIOD });

      expect(ledger.total).toBe(4);
      expect(ledger.items.map((row) => row.id)).toEqual([seeded.rejected, seeded.approved, seeded.underReview, seeded.pending]);
    });
  });

  it("sorts oldest first when asked", async () => {
    await rolledBack(async (tx) => {
      const seeded = await seedPayments(tx);
      const ledger = await new ListPaymentsQuery(tx as unknown as Db).run({ academicPeriodId: PERIOD, sort: "oldest" });

      expect(ledger.items.map((row) => row.id)).toEqual([seeded.pending, seeded.underReview, seeded.approved, seeded.rejected]);
    });
  });

  it("filters by status in Postgres", async () => {
    await rolledBack(async (tx) => {
      const seeded = await seedPayments(tx);
      const ledger = await new ListPaymentsQuery(tx as unknown as Db).run({ academicPeriodId: PERIOD, status: "approved" });

      expect(ledger.total).toBe(1);
      expect(ledger.items.map((row) => row.id)).toEqual([seeded.approved]);
    });
  });

  it("names who decided and when, from the audit trail", async () => {
    await rolledBack(async (tx) => {
      const seeded = await seedPayments(tx);
      const ledger = await new ListPaymentsQuery(tx as unknown as Db).run({ academicPeriodId: PERIOD, status: "approved" });

      expect(ledger.items[0]!.decidedAt).not.toBeNull();
      // The actor id in the seed matches no Better Auth user: the name is null, not an error.
      expect(ledger.items[0]!.decidedByName).toBeNull();
      expect(ledger.items[0]!.id).toBe(seeded.approved);
    });
  });

  it("reads the decider's name from the Better Auth user table", async () => {
    await rolledBack(async (tx) => {
      const seeded = await seedPayments(tx);
      const userId = "usr_payment_queries_integration_billing";
      await tx.execute(
        sql`insert into "user" ("id", "name", "email", "emailVerified", "role") values (${userId}, 'Caja Prueba', ${`${userId}@example.com`}, true, 'billing')`,
      );
      await tx.insert(auditLog).values({ actorId: userId, action: "payment.rejected", targetId: seeded.rejected, metadata: { test: true } });

      const ledger = await new ListPaymentsQuery(tx as unknown as Db).run({ academicPeriodId: PERIOD, status: "rejected" });

      expect(ledger.items.map((row) => row.id)).toEqual([seeded.rejected]);
      expect(ledger.items[0]!.decidedByName).toBe("Caja Prueba");
    });
  });

  it("finds a payment by its operation number", async () => {
    await rolledBack(async (tx) => {
      const seeded = await seedPayments(tx);
      const ledger = await new ListPaymentsQuery(tx as unknown as Db).run({ academicPeriodId: PERIOD, q: seeded.operationOf.approved });

      expect(ledger.items.map((row) => row.id)).toEqual([seeded.approved]);
    });
  });

  it("counts the header figures over the current period", async () => {
    await rolledBack(async (tx) => {
      // Make the suite's period the most recent one already started, so the
      // metrics read this period and nothing else in the database.
      await tx
        .update(academicPeriods)
        .set({ startsOn: sql`now() - interval '1 minute'`, endsOn: sql`now() + interval '30 days'` })
        .where(eq(academicPeriods.id, PERIOD));
      await seedPayments(tx);

      const { metrics } = await new ListPaymentsQuery(tx as unknown as Db).run({ academicPeriodId: PERIOD });

      expect(metrics).toEqual({
        periodName: PERIOD_NAME,
        inReview: 2,
        oldestOpenHours: 0,
        approved: 1,
        collectedCents: 15000,
        rejected: 1,
      });
    });
  });
});
