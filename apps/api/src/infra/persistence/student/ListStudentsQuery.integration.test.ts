import * as schema from "@ooc/db";
import { academicPeriods, classGroups, courses, enrollments, planPrices, plans, students } from "@ooc/db";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/infra/db/client.js";
import { ListStudentsQuery } from "./ListStudentsQuery.js";

/**
 * OOC-55: the student directory is people who got in, plus people registered
 * by hand who have not enrolled yet. Someone whose only enrollment is still
 * being settled in Payments is not listed — but the manual enrollment
 * picker (`q`) still finds them, or staff would open a second file.
 *
 * `students` is under the delete lock (migration 0011): every test runs in a
 * transaction that is always rolled back. The rows are created in 2099 so
 * they are the first page of a newest-first browse whatever else the
 * database holds.
 */

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required: this suite exercises ListStudentsQuery against a real, migrated Postgres.");
}

const PERIOD = "018f2b5c-7000-7000-8000-000000000001";
const COURSE = "018f2b5c-7000-7000-8000-000000000002";
const PLAN = "018f2b5c-7000-7000-8000-000000000003";
const PLAN_PRICE = "018f2b5c-7000-7000-8000-000000000004";
const GROUP = "018f2b5c-7000-7000-8000-000000000005";

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
      await fn(tx);
      throw new RolledBack();
    });
  } catch (error) {
    if (!(error instanceof RolledBack)) throw error;
  }
}

/** One student per seat shape: none, reserved only, confirmed, released only, confirmed + reserved. */
const SHAPES: { name: string; seats: ("reserved" | "confirmed" | "released")[]; listed: boolean }[] = [
  { name: "SinMatricula", seats: [], listed: true },
  { name: "SoloReservada", seats: ["reserved"], listed: false },
  { name: "Confirmada", seats: ["confirmed"], listed: true },
  { name: "SoloLiberada", seats: ["released"], listed: true },
  { name: "ConfirmadaYReservada", seats: ["confirmed", "reserved"], listed: true },
];

async function seed(tx: Tx): Promise<Map<string, string>> {
  await tx.insert(academicPeriods).values({
    id: PERIOD,
    name: "Ciclo de prueba (students integration)",
    startsOn: new Date("2026-03-01T00:00:00.000Z"),
    endsOn: new Date("2026-07-31T00:00:00.000Z"),
  });
  await tx.insert(courses).values({ id: COURSE, name: "Curso (students integration)", language: "Prueba", minAge: 12 });
  await tx.insert(plans).values({ id: PLAN, courseId: COURSE, name: "Paquete completo" });
  await tx.insert(planPrices).values({ id: PLAN_PRICE, planId: PLAN, amountCents: 10000 });
  await tx.insert(classGroups).values({
    id: GROUP,
    courseId: COURSE,
    academicPeriodId: PERIOD,
    schedule: "Lun/Mié 19:00",
    startsOn: new Date("2026-03-02T00:00:00.000Z"),
    endsOn: new Date("2026-06-30T00:00:00.000Z"),
    capacity: 50,
  });

  const rows = await tx
    .insert(students)
    .values(
      SHAPES.map((shape, i) => ({
        firstName: shape.name,
        lastName: "Directorio",
        nationalIdType: "DNI",
        nationalId: `DIRTEST${i}`,
        email: `dir.${i}@gmail.com`,
        phone: "+51900000000",
        birthDate: new Date("2000-01-01T00:00:00.000Z"),
        country: "PE",
        city: "Lima",
        createdAt: new Date(Date.UTC(2099, 0, 1, 0, i)),
      })),
    )
    .returning({ id: students.id, firstName: students.firstName });
  const idOf = new Map(rows.map((row) => [row.firstName, row.id]));

  const seats = SHAPES.flatMap((shape) =>
    shape.seats.map((seatStatus) => ({
      studentId: idOf.get(shape.name)!,
      classGroupId: GROUP,
      planPriceId: PLAN_PRICE,
      seatStatus,
    })),
  );
  await tx.insert(enrollments).values(seats);

  return idOf;
}

describe("student directory (no q)", () => {
  it("leaves out a student whose only enrollment is still being settled", async () => {
    await rolledBack(async (tx) => {
      const query = new ListStudentsQuery(tx as unknown as Db);
      const before = await query.run();
      const idOf = await seed(tx);
      const after = await query.run();

      const listed = new Set(after.items.map((row) => row.id));
      for (const shape of SHAPES) {
        expect(listed.has(idOf.get(shape.name)!), shape.name).toBe(shape.listed);
      }
      expect(after.total! - before.total!).toBe(SHAPES.filter((shape) => shape.listed).length);
    });
  });
});

describe("manual enrollment picker (q)", () => {
  it("still finds the student under review, so nobody opens a second file", async () => {
    await rolledBack(async (tx) => {
      const query = new ListStudentsQuery(tx as unknown as Db);
      const idOf = await seed(tx);
      const found = await query.run("SoloReservada");

      expect(found.items.map((row) => row.id)).toContain(idOf.get("SoloReservada"));
    });
  });
});
