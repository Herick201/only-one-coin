import * as schema from "@ooc/db";
import { Guardian, Student, type NationalIdType } from "@ooc/domain";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DrizzleGuardianRepository } from "./DrizzleGuardianRepository.js";
import { DrizzleStudentRepository } from "./DrizzleStudentRepository.js";
import type { Db } from "@/infra/db/client.js";

/**
 * The writes behind the student file's corrections (OOC-74): read a live
 * record by id, write it back, and never answer for a retired one. Runs
 * against a real, migrated Postgres inside a transaction that is always rolled
 * back (`pnpm db:up && pnpm db:migrate`, then `pnpm test:api:db`).
 */

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required: this suite exercises the student repositories against a real, migrated Postgres.");
}

const A_STUDENT = {
  firstName: "Rosa",
  lastName: "Repo",
  nationalIdType: "DNI" as NationalIdType,
  nationalId: "71234599",
  email: "rosa.repo@gmail.com",
  phone: "+51987654321",
  birthDate: new Date("1996-04-12T00:00:00.000Z"),
  country: "PE",
  region: "Lima",
  city: "Chorrillos",
};

let pool: pg.Pool;
let db: Db;
let students: DrizzleStudentRepository;
let guardians: DrizzleGuardianRepository;

beforeAll(() => {
  pool = new Pool({ connectionString: DATABASE_URL, max: 1 });
  db = drizzle(pool, { schema, casing: "snake_case" });
  students = new DrizzleStudentRepository(db);
  guardians = new DrizzleGuardianRepository(db);
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

describe("DrizzleStudentRepository", () => {
  it("reads a record by id and writes a correction back over it", async () => {
    const created = await students.create(Student.create(A_STUDENT));

    const loaded = (await students.findById(created.id))!;
    loaded.rewrite({ ...A_STUDENT, lastName: "Repo Quispe", nationalId: "71234598" });
    await students.update(loaded);

    const reread = (await students.findById(created.id))!;
    expect(reread.lastName).toBe("Repo Quispe");
    expect(reread.nationalId).toBe("71234598");
    expect(reread.birthDate.toISOString()).toBe(A_STUDENT.birthDate.toISOString());
    expect(reread.updatedAt.getTime()).toBeGreaterThanOrEqual(reread.createdAt.getTime());
  });

  it("does not answer for a retired record", async () => {
    const created = await students.create(Student.create(A_STUDENT));
    await db.update(schema.students).set({ deletedAt: new Date() }).where(eq(schema.students.id, created.id));

    expect(await students.findById(created.id)).toBeNull();
  });
});

describe("DrizzleGuardianRepository", () => {
  it("finds the student's guardian and writes a correction back over it", async () => {
    const student = await students.create(Student.create(A_STUDENT));
    expect(await guardians.findByStudentId(student.id)).toBeNull();

    await guardians.create(
      Guardian.create({
        studentId: student.id,
        firstName: "Ana",
        lastName: "Repo",
        relationship: "mother",
        nationalIdType: "DNI",
        nationalId: "41234599",
        email: "ana@hotmail.com",
        phone: "+51987654322",
      }),
    );

    const loaded = (await guardians.findByStudentId(student.id))!;
    loaded.rewrite({
      firstName: "Ana",
      lastName: "Repo",
      relationship: "legal_guardian",
      nationalIdType: "DNI",
      nationalId: "41234599",
      email: "ana.repo@hotmail.com",
      phone: "+51987654322",
    });
    await guardians.update(loaded);

    const reread = (await guardians.findByStudentId(student.id))!;
    expect(reread.relationship).toBe("legal_guardian");
    expect(reread.email).toBe("ana.repo@hotmail.com");
  });
});
