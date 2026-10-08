import * as schema from "@ooc/db";
import { auditLog, enrollments, payments, students } from "@ooc/db";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ACTIVITY_PAGE_SIZE, StudentActivityQuery } from "./StudentActivityQuery.js";
import type { Db } from "@/infra/db/client.js";

/**
 * The student file's activity tab (OOC-75): every `audit_log` entry about
 * the person — written against the student, one of their enrollments or one
 * of those enrollments' payments — newest first, with the author, and never
 * an entry about somebody else. Runs against a real, migrated Postgres inside
 * a transaction that is always rolled back.
 */

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required: this suite exercises StudentActivityQuery against a real, migrated Postgres.");
}

const PERIOD = "018f2b5c-4000-7000-8000-000000000001";
const COURSE = "018f2b5c-4000-7000-8000-000000000002";
const PLAN = "018f2b5c-4000-7000-8000-000000000003";
const PLAN_PRICE = "018f2b5c-4000-7000-8000-000000000004";
const GROUP = "018f2b5c-4000-7000-8000-000000000005";
const STUDENT = "018f2b5c-4000-7000-8000-000000000006";
const OTHER = "018f2b5c-4000-7000-8000-000000000007";
const ENROLLMENT = "018f2b5c-4000-7000-8000-000000000008";
const PAYMENT = "018f2b5c-4000-7000-8000-000000000009";
const ACTOR = "activity-integration-actor";

let pool: pg.Pool;
let db: Db;
let query: StudentActivityQuery;

beforeAll(() => {
  pool = new Pool({ connectionString: DATABASE_URL, max: 1 });
  db = drizzle(pool, { schema, casing: "snake_case" });
  query = new StudentActivityQuery(db);
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await pool.query("begin");
  await seed();
});

afterEach(async () => {
  await pool.query("rollback");
});

const at = (minute: number) => new Date(Date.UTC(2026, 9, 1, 12, minute));

async function seed(): Promise<void> {
  await db.execute(
    sql`insert into "user" ("id", "name", "email", "emailVerified", "role") values (${ACTOR}, 'Coordinación Prueba', 'activity-actor@example.com', true, 'enrollment_supervisor')`,
  );
  await db.insert(schema.academicPeriods).values({
    id: PERIOD,
    name: "Ciclo (activity)",
    startsOn: new Date("2026-03-01T00:00:00.000Z"),
    endsOn: new Date("2026-07-31T00:00:00.000Z"),
  });
  await db.insert(schema.courses).values({ id: COURSE, name: "Curso (activity)", language: "Lengua (activity)", minAge: 12 });
  await db.insert(schema.plans).values({ id: PLAN, courseId: COURSE, name: "Paquete" });
  await db.insert(schema.planPrices).values({ id: PLAN_PRICE, planId: PLAN, amountCents: 10000 });
  await db.insert(schema.classGroups).values({
    id: GROUP,
    courseId: COURSE,
    academicPeriodId: PERIOD,
    schedule: "Lun 19:00",
    startsOn: new Date("2026-03-02T00:00:00.000Z"),
    endsOn: new Date("2026-06-30T00:00:00.000Z"),
    capacity: 10,
  });
  await db.insert(students).values(
    [STUDENT, OTHER].map((id, i) => ({
      id,
      firstName: `Alumno${i}`,
      lastName: "Activity",
      nationalIdType: "DNI",
      nationalId: `ACTIVITY${i}`,
      email: `activity.${i}@gmail.com`,
      phone: "+51900000000",
      birthDate: new Date("2000-01-01T00:00:00.000Z"),
      country: "PE",
      city: "Lima",
    })),
  );
  await db.insert(enrollments).values({ id: ENROLLMENT, studentId: STUDENT, classGroupId: GROUP, planPriceId: PLAN_PRICE });
  await db.insert(payments).values({
    id: PAYMENT,
    enrollmentId: ENROLLMENT,
    idempotencyKey: "activity-integration",
    method: "yape",
    amountCents: 10000,
    operationNumber: "OPACT0001",
  });

  await db.insert(auditLog).values([
    { actorId: ACTOR, action: "student.registered", targetId: STUDENT, createdAt: at(1) },
    { actorId: ACTOR, action: "enrollment.created", targetId: ENROLLMENT, createdAt: at(2) },
    { actorId: ACTOR, action: "payment.approved", targetId: PAYMENT, createdAt: at(3) },
    {
      actorId: ACTOR,
      action: "student.updated",
      targetId: STUDENT,
      metadata: { fields: ["firstName", "nationalId", "somethingUnknown"] },
      createdAt: at(4),
    },
    // Somebody else's history, and an action the tab does not show.
    { actorId: ACTOR, action: "student.registered", targetId: OTHER, createdAt: at(5) },
    { actorId: ACTOR, action: "catalog.course.updated", targetId: STUDENT, createdAt: at(6) },
    // An account that no longer exists still left its entry.
    { actorId: "gone-account", action: "student.guardian_added", targetId: STUDENT, createdAt: at(7) },
  ]);
}

describe("StudentActivityQuery", () => {
  it("lists the student's, their enrollment's and their payment's entries, newest first", async () => {
    const { items, nextCursor } = await query.run(STUDENT);

    expect(items.map((item) => item.action)).toEqual([
      "guardian_added",
      "student_updated",
      "payment_approved",
      "enrollment_created",
      "student_registered",
    ]);
    expect(nextCursor).toBeNull();
  });

  it("names the author and their cargo, and survives an author who is gone", async () => {
    const { items } = await query.run(STUDENT);

    expect(items.find((item) => item.action === "student_registered")).toMatchObject({
      actorName: "Coordinación Prueba",
      actorRole: "enrollment_supervisor",
    });
    expect(items.find((item) => item.action === "guardian_added")).toMatchObject({ actorName: null, actorRole: null });
  });

  it("carries a reference the screen can translate — course, operation or field names", async () => {
    const { items } = await query.run(STUDENT);
    const byAction = new Map(items.map((item) => [item.action, item.reference]));

    expect(byAction.get("enrollment_created")).toEqual({ kind: "course", name: "Curso (activity)" });
    expect(byAction.get("payment_approved")).toEqual({ kind: "operation", number: "OPACT0001" });
    expect(byAction.get("student_updated")).toEqual({ kind: "fields", fields: ["first_name", "id_number"] });
    expect(byAction.get("student_registered")).toBeNull();
  });

  it("pages by cursor without repeating or skipping an entry", async () => {
    const extra = Array.from({ length: ACTIVITY_PAGE_SIZE + 3 }, () => ({
      actorId: ACTOR,
      action: "payment.receipt_viewed",
      targetId: PAYMENT,
      // Same instant for all of them: the id has to break the tie.
      createdAt: at(30),
    }));
    await db.insert(auditLog).values(extra);

    const first = await query.run(STUDENT);
    const second = await query.run(STUDENT, first.nextCursor!);

    expect(first.items).toHaveLength(ACTIVITY_PAGE_SIZE);
    expect(first.nextCursor).not.toBeNull();
    const ids = [...first.items, ...second.items].map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(ACTIVITY_PAGE_SIZE + 3 + 5);
    expect(second.nextCursor).toBeNull();
  });
});
