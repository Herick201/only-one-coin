import * as schema from "@ooc/db";
import { academicPeriods, classGroups } from "@ooc/db";
import { Course, Plan, PlanPrice } from "@ooc/domain";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/infra/db/client.js";
import { DrizzleCourseRepository } from "./DrizzleCourseRepository.js";
import { DrizzlePlanRepository } from "./DrizzlePlanRepository.js";
import { GetCourseQuery } from "./GetCourseQuery.js";
import { ListCoursesQuery } from "./ListCoursesQuery.js";

/**
 * The OOC-36 acceptance criterion at the storage layer: a course written
 * through the repository is listed live right away and a class group can hang
 * off it. Plus the price history read — ordering and "which one is current"
 * are SQL the typecheck cannot vouch for.
 */

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required: this suite exercises the course catalog against a real, migrated Postgres.");
}

const DAY = 24 * 60 * 60 * 1000;
let pool: pg.Pool;
let db: Db;

beforeAll(() => {
  pool = new Pool({ connectionString: DATABASE_URL, max: 1 });
  db = drizzle(pool, { schema, casing: "snake_case" });
});
afterAll(async () => {
  await pool.end();
});
beforeEach(async () => {
  await pool.query("begin");
});
afterEach(async () => {
  await pool.query("rollback");
});

function aCourse(): Course {
  return Course.create({
    name: "Italiano (integration)",
    language: "Italiano",
    level: "A1",
    summary: "Italiano para principiantes.",
    minAge: 13,
    modules: 6,
    totalHours: 60,
    certificateRule: "exam_required",
    allowsFreeze: false,
    allowsTransfer: true,
  });
}

describe("course catalog storage", () => {
  it("round-trips every course column", async () => {
    const repository = new DrizzleCourseRepository(db);
    const created = await repository.create(aCourse());
    const read = await repository.findById(created.id);

    expect(read).toMatchObject({
      name: "Italiano (integration)",
      certificateRule: "exam_required",
      allowsFreeze: false,
      allowsTransfer: true,
      deletedAt: null,
    });
  });

  it("lists a new course as live, and a class group can be opened on it", async () => {
    const course = await new DrizzleCourseRepository(db).create(aCourse());

    const listed = (await new ListCoursesQuery(db).run()).find((item) => item.id === course.id);
    expect(listed).toMatchObject({ active: true, classGroupCount: 0, language: "Italiano" });

    const [period] = await db
      .insert(academicPeriods)
      .values({ name: "Ciclo (integration)", startsOn: new Date("2026-11-01T05:00:00Z"), endsOn: new Date("2027-02-28T05:00:00Z") })
      .returning();
    await db.insert(classGroups).values({
      courseId: course.id,
      academicPeriodId: period!.id,
      schedule: "",
      startsOn: new Date("2026-11-02T05:00:00Z"),
      endsOn: new Date("2027-01-30T05:00:00Z"),
      capacity: 30,
    });

    const relisted = (await new ListCoursesQuery(db).run()).find((item) => item.id === course.id);
    expect(relisted?.classGroupCount).toBe(1);
  });

  it("keeps price history and names the current price", async () => {
    const course = await new DrizzleCourseRepository(db).create(aCourse());
    const plans = new DrizzlePlanRepository(db);
    const plan = Plan.create({ courseId: course.id, name: "Paquete completo" });
    const first = PlanPrice.schedule({ planId: plan.id, amountCents: 8000 });
    await plans.createWithPrice(plan, first);
    const future = PlanPrice.schedule({ planId: plan.id, amountCents: 9000, validFrom: new Date(Date.now() + 30 * DAY) });
    await plans.addPrice(future);

    const detail = await new GetCourseQuery(db).run(course.id);

    expect(detail?.plans).toHaveLength(1);
    expect(detail?.plans[0]?.prices.map((price) => price.amountCents)).toEqual([9000, 8000]);
    expect(detail?.plans[0]?.currentPriceId).toBe(first.id);
  });

  it("answers null for a course not on file", async () => {
    expect(await new GetCourseQuery(db).run("018f2b5c-1000-7000-8000-0000000000ff")).toBeNull();
  });
});
