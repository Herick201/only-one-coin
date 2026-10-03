import * as schema from "@ooc/db";
import {
  academicPeriods,
  auditLog,
  classGroups,
  courses,
  enrollments,
  outbox,
  paymentReceipts,
  payments,
  planPrices,
  plans,
  receiptUploads,
  seatHolds,
  students,
} from "@ooc/db";
import {
  DEFAULT_LOCALE,
  RECEIPT_EXTRACTION_TIER_PRIMARY,
  RECEIPT_VALIDATION_ACTOR,
  paymentApprovedEmails,
  type ReceiptAutoApproval,
  type ReceiptValidationDetail,
  type ReceiptVerdictOutcome,
} from "@ooc/domain";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/infra/db/client.js";
import { DrizzleReceiptUploadRepository } from "./DrizzleReceiptUploadRepository.js";
import { DrizzleReceiptValidationRepository } from "./DrizzleReceiptValidationRepository.js";

/**
 * The traffic light's SQL (OOC-21): which receipts the relay offers, the
 * once-only verdict stamp, and the payment/seat moving with it in one
 * transaction — only for the latest upload, only out of `pending`.
 *
 * Same harness as DrizzleReceiptExtractionRepository.integration.test.ts:
 * every test runs in a transaction that is always rolled back (payments and
 * payment_receipts are under the 0011 delete lock).
 */

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required: this suite exercises the receipt validation SQL against a real, migrated Postgres.");
}

const PERIOD = "018f2b5c-6200-7000-8000-000000000001";
const COURSE = "018f2b5c-6200-7000-8000-000000000002";
const PLAN = "018f2b5c-6200-7000-8000-000000000003";
const PLAN_PRICE = "018f2b5c-6200-7000-8000-000000000004";
const GROUP = "018f2b5c-6200-7000-8000-000000000005";
const TIER = RECEIPT_EXTRACTION_TIER_PRIMARY;

let pool: pg.Pool;
let db: Db;

beforeAll(() => {
  pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
  db = drizzle(pool, { schema, casing: "snake_case" });
});

afterAll(async () => {
  await pool.end();
});

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
class RolledBack extends Error {}

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
    name: "Ciclo de prueba (receipt validation integration)",
    startsOn: new Date("2026-03-01T00:00:00.000Z"),
    endsOn: new Date("2026-07-31T00:00:00.000Z"),
  });
  await tx.insert(courses).values({ id: COURSE, name: "Curso (validation integration)", language: "Prueba", minAge: 12 });
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
    seatsTaken: 10,
  });
}

let sequence = 0;

interface Seeded {
  paymentId: string;
  enrollmentId: string;
}

async function payment(
  tx: Tx,
  params: { status?: string; seatStatus?: "reserved" | "confirmed" | "released" } = {},
): Promise<Seeded> {
  const n = ++sequence;
  const [student] = await tx
    .insert(students)
    .values({
      firstName: `Alumno${n}`,
      lastName: "Validacion",
      nationalIdType: "DNI",
      nationalId: `VALIDATE${n}`,
      email: `validate.${n}@gmail.com`,
      phone: "+51900000000",
      birthDate: new Date("2000-01-01T00:00:00.000Z"),
      country: "PE",
      city: "Lima",
    })
    .returning({ id: students.id });
  const [enrollment] = await tx
    .insert(enrollments)
    .values({
      studentId: student!.id,
      classGroupId: GROUP,
      planPriceId: PLAN_PRICE,
      origin: "web",
      seatStatus: params.seatStatus ?? "reserved",
    })
    .returning({ id: enrollments.id });
  const [row] = await tx
    .insert(payments)
    .values({
      enrollmentId: enrollment!.id,
      idempotencyKey: `validate-integration-${n}`,
      status: params.status ?? "pending",
      method: "yape",
      amountCents: 15000,
      operationNumber: "08312457",
    })
    .returning({ id: payments.id });
  return { paymentId: row!.id, enrollmentId: enrollment!.id };
}

/** A processed upload attached to the payment; screened and read unless told otherwise. */
async function receipt(
  tx: Tx,
  paymentId: string,
  params: { screened?: boolean; read?: "read" | "failed" | "none"; createdAt?: Date } = {},
): Promise<string> {
  const n = ++sequence;
  const [hold] = await tx
    .insert(seatHolds)
    .values({ classGroupId: GROUP, origin: "web", status: "released", expiresAt: new Date(), settledAt: new Date() })
    .returning({ id: seatHolds.id });
  const createdAt = params.createdAt ?? new Date();
  const [row] = await tx
    .insert(receiptUploads)
    .values({
      seatHoldId: hold!.id,
      paymentId,
      objectKey: `receipts/raw/validate-integration/${n}`,
      status: "processed",
      processedObjectKey: `receipts/processed/validate-integration/${n}.jpg`,
      screenedAt: params.screened === false ? null : new Date(),
      fraudSignals: [],
      createdAt,
      updatedAt: createdAt,
    })
    .returning({ id: receiptUploads.id });

  const read = params.read ?? "read";
  if (read === "read") {
    await tx.insert(paymentReceipts).values({
      paymentId,
      receiptUploadId: row!.id,
      tier: TIER,
      modelName: "google/gemini-3.1-flash-lite",
      amountCents: 15000,
      operationNumber: "08312457",
      extractedFields: [],
    });
  } else if (read === "failed") {
    await tx.insert(paymentReceipts).values({
      paymentId,
      receiptUploadId: row!.id,
      tier: TIER,
      modelName: "google/gemini-3.1-flash-lite",
      failureReason: "provider_unavailable",
    });
  }
  return row!.id;
}

const GREEN: ReceiptVerdictOutcome = { verdict: "approve", reason: "exact" };
const RED: ReceiptVerdictOutcome = { verdict: "reject_suggested", reason: "far_below" };

function detail(outcome: ReceiptVerdictOutcome, readCents: number | null = 15000): ReceiptValidationDetail {
  return { reason: outcome.reason, expectedCents: 15000, readCents, toleranceCents: 0, rejectBelowPercent: 50 };
}

/** Built by the domain's own e-mail builder, so the outbox row is exactly
 * what the usecase would hand over. Adult student, no guardian: one e-mail. */
function approval(paymentId: string): ReceiptAutoApproval {
  return {
    notifications: paymentApprovedEmails(
      {
        paymentId,
        student: { firstName: "Alumno", lastName: "Validacion", email: "validate@gmail.com", birthDate: new Date("2000-01-01T00:00:00.000Z") },
        guardian: null,
        courseName: "Curso (validation integration)",
        classGroupStartsOn: new Date("2026-03-02T00:00:00.000Z"),
      },
      DEFAULT_LOCALE,
    ),
    audit: {
      actorId: RECEIPT_VALIDATION_ACTOR,
      action: "payment.auto_approved",
      targetId: paymentId,
      metadata: { reason: "exact" },
      at: new Date(),
    },
  };
}

async function state(tx: Tx, seeded: Seeded) {
  const [row] = await tx
    .select({ status: payments.status, seatStatus: enrollments.seatStatus })
    .from(payments)
    .innerJoin(enrollments, eq(enrollments.id, payments.enrollmentId))
    .where(eq(payments.id, seeded.paymentId));
  return row!;
}

describe("listValidatableIds + findSubject", () => {
  it("offers only screened receipts with a level-1 row (read or failed) and no verdict yet", async () => {
    await rolledBack(async (tx) => {
      const uploads = new DrizzleReceiptUploadRepository(tx as unknown as Db);
      const repository = new DrizzleReceiptValidationRepository(tx as unknown as Db);

      const ready = await receipt(tx, (await payment(tx)).paymentId);
      const failedRead = await receipt(tx, (await payment(tx)).paymentId, { read: "failed" });
      const notScreened = await receipt(tx, (await payment(tx)).paymentId, { screened: false });
      const notRead = await receipt(tx, (await payment(tx)).paymentId, { read: "none" });
      const done = await receipt(tx, (await payment(tx)).paymentId);
      await repository.record({ subject: (await repository.findSubject(done))!, outcome: RED, detail: detail(RED), approval: null });

      const offered = await uploads.listValidatableIds(1000, TIER);
      expect(offered).toEqual(expect.arrayContaining([ready, failedRead]));
      expect(offered).not.toContain(notScreened);
      expect(offered).not.toContain(notRead);
      expect(offered).not.toContain(done);

      expect(await repository.findSubject(notScreened)).toBeNull();
      expect(await repository.findSubject(notRead)).toBeNull();
      expect(await repository.findSubject(done)).toBeNull();
      expect(await repository.findSubject(failedRead)).toMatchObject({ readAmountCents: null, readOperationNumber: null });
      expect(await repository.findSubject(ready)).toMatchObject({
        paymentStatus: "pending",
        expectedCents: 15000,
        declaredOperationNumber: "08312457",
        readAmountCents: 15000,
        readOperationNumber: "08312457",
      });
    });
  });
});

describe("record", () => {
  it("approves a green pending payment: payment, seat, outbox and audit together", async () => {
    await rolledBack(async (tx) => {
      const repository = new DrizzleReceiptValidationRepository(tx as unknown as Db);
      const seeded = await payment(tx);
      const uploadId = await receipt(tx, seeded.paymentId);

      const effect = await repository.record({
        subject: (await repository.findSubject(uploadId))!,
        outcome: GREEN,
        detail: detail(GREEN),
        approval: approval(seeded.paymentId),
      });

      expect(effect).toBe("approved");
      expect(await state(tx, seeded)).toEqual({ status: "approved", seatStatus: "confirmed" });
      const [upload] = await tx.select().from(receiptUploads).where(eq(receiptUploads.id, uploadId));
      expect(upload).toMatchObject({ validationVerdict: "approve", validationDetail: detail(GREEN) });
      expect(upload!.validatedAt).not.toBeNull();
      const audits = await tx.select().from(auditLog).where(eq(auditLog.targetId, seeded.paymentId));
      expect(audits).toMatchObject([{ actorId: RECEIPT_VALIDATION_ACTOR, action: "payment.auto_approved" }]);
      const [expected] = approval(seeded.paymentId).notifications;
      const emails = await tx.select().from(outbox).where(eq(outbox.dedupeKey, expected!.dedupeKey));
      expect(emails).toMatchObject([{ templateKey: "payment_approved" }]);
    });
  });

  it("routes a red pending payment to review and never rejects it", async () => {
    await rolledBack(async (tx) => {
      const repository = new DrizzleReceiptValidationRepository(tx as unknown as Db);
      const seeded = await payment(tx);
      const uploadId = await receipt(tx, seeded.paymentId);

      const effect = await repository.record({
        subject: (await repository.findSubject(uploadId))!,
        outcome: RED,
        detail: detail(RED, 4000),
        approval: null,
      });

      expect(effect).toBe("routed_to_review");
      expect(await state(tx, seeded)).toEqual({ status: "under_review", seatStatus: "reserved" });
      const [group] = await tx.select({ seatsTaken: classGroups.seatsTaken }).from(classGroups).where(eq(classGroups.id, GROUP));
      expect(group!.seatsTaken).toBe(10);
    });
  });

  it("only records the verdict for a payment already under review — green never approves it", async () => {
    await rolledBack(async (tx) => {
      const repository = new DrizzleReceiptValidationRepository(tx as unknown as Db);
      const seeded = await payment(tx, { status: "under_review" });
      const uploadId = await receipt(tx, seeded.paymentId);

      const effect = await repository.record({
        subject: (await repository.findSubject(uploadId))!,
        outcome: GREEN,
        detail: detail(GREEN),
        approval: approval(seeded.paymentId),
      });

      expect(effect).toBe("none");
      expect(await state(tx, seeded)).toEqual({ status: "under_review", seatStatus: "reserved" });
      const [upload] = await tx.select().from(receiptUploads).where(eq(receiptUploads.id, uploadId));
      expect(upload!.validationVerdict).toBe("approve");
    });
  });

  it("is a no-op the second time", async () => {
    await rolledBack(async (tx) => {
      const repository = new DrizzleReceiptValidationRepository(tx as unknown as Db);
      const seeded = await payment(tx);
      const uploadId = await receipt(tx, seeded.paymentId);
      const subject = (await repository.findSubject(uploadId))!;

      await repository.record({ subject, outcome: RED, detail: detail(RED), approval: null });
      const second = await repository.record({ subject, outcome: GREEN, detail: detail(GREEN), approval: approval(seeded.paymentId) });

      expect(second).toBe("already_validated");
      expect(await state(tx, seeded)).toEqual({ status: "under_review", seatStatus: "reserved" });
      const [upload] = await tx.select().from(receiptUploads).where(eq(receiptUploads.id, uploadId));
      expect(upload!.validationVerdict).toBe("reject_suggested");
    });
  });

  it("does not approve onto a released seat — it routes to review instead", async () => {
    await rolledBack(async (tx) => {
      const repository = new DrizzleReceiptValidationRepository(tx as unknown as Db);
      const seeded = await payment(tx, { seatStatus: "released" });
      const uploadId = await receipt(tx, seeded.paymentId);

      const effect = await repository.record({
        subject: (await repository.findSubject(uploadId))!,
        outcome: GREEN,
        detail: detail(GREEN),
        approval: approval(seeded.paymentId),
      });

      expect(effect).toBe("routed_to_review");
      expect(await state(tx, seeded)).toEqual({ status: "under_review", seatStatus: "released" });
    });
  });

  it("lets only the latest upload move the payment", async () => {
    await rolledBack(async (tx) => {
      const repository = new DrizzleReceiptValidationRepository(tx as unknown as Db);
      const seeded = await payment(tx);
      const older = await receipt(tx, seeded.paymentId, { createdAt: new Date(Date.now() - 60_000) });
      await receipt(tx, seeded.paymentId, { createdAt: new Date() });

      const effect = await repository.record({
        subject: (await repository.findSubject(older))!,
        outcome: GREEN,
        detail: detail(GREEN),
        approval: approval(seeded.paymentId),
      });

      expect(effect).toBe("none");
      expect(await state(tx, seeded)).toEqual({ status: "pending", seatStatus: "reserved" });
    });
  });
});
