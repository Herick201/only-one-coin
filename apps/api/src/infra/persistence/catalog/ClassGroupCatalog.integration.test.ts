import * as schema from "@ooc/db";
import {
  academicPeriods,
  auditLog,
  classGroups,
  courses,
  enrollments,
  planPrices,
  plans,
  seatHolds,
  students,
  waitlistEntries,
} from "@ooc/db";
import { CapacityBelowSeatsTakenError, DuplicateClassGroupsUseCase, PeriodAlreadyDuplicatedError } from "@ooc/domain";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/infra/db/client.js";
import { DrizzleAuditLogRepository } from "@/infra/identity/DrizzleAuditLogRepository.js";
import { DrizzleAcademicPeriodRepository } from "./DrizzleAcademicPeriodRepository.js";
import { DrizzleClassGroupRepository } from "./DrizzleClassGroupRepository.js";

/**
 * The OOC-35 acceptance criterion, checked where it is written: duplicating a
 * period copies its live class groups as empty drafts — no dates, no seats —
 * and nothing that belongs to the old period's students comes along. And the
 * capacity guard reads the seats taken at write time, not at read time.
 *
 * Every test runs inside a transaction that never commits: insertCopies opens
 * its own transaction (a savepoint here), and plan_prices / audit_log rows
 * cannot be deleted afterwards (migrations 0011, 0017).
 */

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required: this suite exercises the class group catalog against a real, migrated Postgres.");
}

const DAY = 24 * 60 * 60 * 1000;
const ACTOR = "usr_class_group_catalog_integration";
const PERIOD_A = "018f2b5c-5b00-7000-8000-000000000001";
const PERIOD_B = "018f2b5c-5b00-7000-8000-000000000002";
const C1 = "018f2b5c-5b00-7000-8000-000000000003";
const C2 = "018f2b5c-5b00-7000-8000-000000000004";
const PLAN = "018f2b5c-5b00-7000-8000-000000000005";
const PRICE = "018f2b5c-5b00-7000-8000-000000000006";
const T1 = "018f2b5c-5b00-7000-8000-000000000011";
const T2 = "018f2b5c-5b00-7000-8000-000000000012";
const T3 = "018f2b5c-5b00-7000-8000-000000000013";

let pool: pg.Pool;
let db: Db;

beforeAll(() => {
  pool = new Pool({ connectionString: DATABASE_URL, max: 1 });
  db = drizzle(pool, { schema, casing: "snake_case" });
});
afterAll(async () => {
  await pool.end();
});

class RollBack extends Error {}

async function inRolledBackTransaction(fn: (tx: Db) => Promise<void>): Promise<void> {
  await db
    .transaction(async (tx) => {
      await fn(tx as unknown as Db);
      throw new RollBack();
    })
    .catch((error: unknown) => {
      if (!(error instanceof RollBack)) throw error;
    });
}

async function seed(tx: Db): Promise<void> {
  const now = Date.now();
  await tx.insert(academicPeriods).values([
    { id: PERIOD_A, name: "Ciclo A (class group catalog integration)", startsOn: new Date(now - 30 * DAY), endsOn: new Date(now + 60 * DAY) },
    { id: PERIOD_B, name: "Ciclo B (class group catalog integration)", startsOn: new Date(now + 61 * DAY), endsOn: new Date(now + 150 * DAY) },
  ]);
  await tx.insert(courses).values([
    { id: C1, name: "Curso vivo (class group catalog integration)", language: "Lengua de prueba", minAge: 12 },
    {
      id: C2,
      name: "Curso retirado (class group catalog integration)",
      language: "Lengua de prueba",
      minAge: 12,
      deletedAt: new Date(now - DAY),
    },
  ]);
  await tx.insert(plans).values({ id: PLAN, courseId: C1, name: "Paquete (class group catalog integration)" });
  await tx.insert(planPrices).values({ id: PRICE, planId: PLAN, amountCents: 9900, validFrom: new Date(now - DAY) });

  const [student] = await tx
    .insert(students)
    .values({
      firstName: "Alumno",
      lastName: "Del Ciclo A",
      nationalIdType: "DNI",
      nationalId: "CGCAT-INTEGRATION-1",
      email: "cg.catalog.integration@gmail.com",
      phone: "+51900000000",
      birthDate: new Date("2000-01-01T00:00:00.000Z"),
      country: "PE",
      city: "Lima",
    })
    .returning({ id: students.id });

  const dated = {
    academicPeriodId: PERIOD_A,
    schedule: "Lun 19:00",
    slots: [{ weekday: "mon", startTime: "19:00", endTime: "20:30" }],
    code: "CGCAT-01",
    teacherName: "Docente de prueba",
    startsOn: new Date(now - 7 * DAY),
    endsOn: new Date(now + 50 * DAY),
    enrollmentOpensAt: new Date(now - 30 * DAY),
    enrollmentClosesAt: new Date(now - 6 * DAY),
    capacity: 25,
  };
  await tx.insert(classGroups).values([
    { ...dated, id: T1, courseId: C1, status: "in_progress", seatsTaken: 1 },
    { ...dated, id: T2, courseId: C1, status: "enrolling", deletedAt: new Date(now - DAY) },
    { ...dated, id: T3, courseId: C2, status: "enrolling" },
  ]);

  await tx.insert(enrollments).values({ studentId: student!.id, classGroupId: T1, planPriceId: PRICE, seatStatus: "confirmed" });
  await tx.insert(waitlistEntries).values({ studentId: student!.id, classGroupId: T1 });
  await tx.insert(seatHolds).values({ classGroupId: T1, origin: "web", expiresAt: new Date(now + 15 * 60 * 1000) });
}

// Against a managed Postgres every round trip costs ~140ms; the duplication
// test makes ~20 of them inside one transaction, past the 5 s default.
describe("class group catalog", { timeout: 30_000 }, () => {
  it("duplicating a period copies class groups with dates and seats zeroed, and no enrollment comes along", async () => {
    await inRolledBackTransaction(async (tx) => {
      await seed(tx);
      const periods = new DrizzleAcademicPeriodRepository(tx);
      const groups = new DrizzleClassGroupRepository(tx);
      const audit = new DrizzleAuditLogRepository(tx);

      const result = await new DuplicateClassGroupsUseCase(periods, groups, audit).run({
        actorId: ACTOR,
        sourcePeriodId: PERIOD_A,
        targetPeriodId: PERIOD_B,
      });
      expect(result).toEqual({ copied: 1, skippedRetired: 2 });

      const copies = await tx.select().from(classGroups).where(eq(classGroups.academicPeriodId, PERIOD_B));
      expect(copies).toHaveLength(1);
      expect(copies[0]).toMatchObject({
        courseId: C1,
        status: "draft",
        startsOn: null,
        endsOn: null,
        enrollmentOpensAt: null,
        enrollmentClosesAt: null,
        seatsTaken: 0,
        capacity: 25,
        code: "CGCAT-01",
        teacherName: "Docente de prueba",
        slots: [{ weekday: "mon", startTime: "19:00", endTime: "20:30" }],
        sourceClassGroupId: T1,
        deletedAt: null,
      });

      const copyId = copies[0]!.id;
      expect(await tx.select().from(enrollments).where(eq(enrollments.classGroupId, copyId))).toEqual([]);
      expect(await tx.select().from(waitlistEntries).where(eq(waitlistEntries.classGroupId, copyId))).toEqual([]);
      expect(await tx.select().from(seatHolds).where(eq(seatHolds.classGroupId, copyId))).toEqual([]);

      const audited = await tx
        .select()
        .from(auditLog)
        .where(and(eq(auditLog.targetId, PERIOD_B), eq(auditLog.action, "catalog.academic_period.duplicated")));
      expect(audited).toHaveLength(1);
      expect(audited[0]).toMatchObject({ actorId: ACTOR, metadata: { sourcePeriodId: PERIOD_A, copied: 1, skippedRetired: 2 } });

      await expect(
        new DuplicateClassGroupsUseCase(periods, groups, audit).run({
          actorId: ACTOR,
          sourcePeriodId: PERIOD_A,
          targetPeriodId: PERIOD_B,
        }),
      ).rejects.toBeInstanceOf(PeriodAlreadyDuplicatedError);
      expect(await tx.select().from(classGroups).where(eq(classGroups.academicPeriodId, PERIOD_B))).toHaveLength(1);
    });
  });

  it("refuses to shrink capacity below seats taken, atomically", async () => {
    await inRolledBackTransaction(async (tx) => {
      await seed(tx);
      const groups = new DrizzleClassGroupRepository(tx);
      const group = (await groups.findById(T1))!;
      group.update({ capacity: 1 }); // 1 seat taken: allowed
      expect((await groups.update(group)).capacity).toBe(1);

      // simulate the checkout taking a seat after we read the row
      await tx.update(classGroups).set({ capacity: 3, seatsTaken: 2 }).where(eq(classGroups.id, T1));
      const stale = (await groups.findById(T1))!;
      await tx.update(classGroups).set({ seatsTaken: 3 }).where(eq(classGroups.id, T1));
      stale.update({ capacity: 2 });
      await expect(groups.update(stale)).rejects.toBeInstanceOf(CapacityBelowSeatsTakenError);

      const [row] = await tx.select().from(classGroups).where(eq(classGroups.id, T1));
      expect(row).toMatchObject({ capacity: 3, seatsTaken: 3 });
    });
  });

  it("round-trips a period through the repository", async () => {
    await inRolledBackTransaction(async (tx) => {
      await seed(tx);
      const periods = new DrizzleAcademicPeriodRepository(tx);
      const period = (await periods.findById(PERIOD_A))!;
      period.update({ name: "Ciclo A renombrado (class group catalog integration)" });
      const saved = await periods.update(period);
      expect(saved.name).toBe("Ciclo A renombrado (class group catalog integration)");
      expect(saved.isDeleted).toBe(false);
      expect(await periods.findById("018f2b5c-5b00-7000-8000-0000000000ff")).toBeNull();
    });
  });
});
