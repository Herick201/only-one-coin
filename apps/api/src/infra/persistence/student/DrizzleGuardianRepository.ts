import {
  Guardian,
  type GuardianRelationship,
  type IGuardianRepository,
  type NationalIdType,
} from "@ooc/domain";
import { guardians } from "@ooc/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";

type GuardianRow = typeof guardians.$inferSelect;

function toGuardian(row: GuardianRow): Guardian {
  return new Guardian({
    id: row.id,
    studentId: row.studentId,
    firstName: row.firstName,
    lastName: row.lastName,
    relationship: row.relationship as GuardianRelationship,
    nationalIdType: row.nationalIdType as NationalIdType,
    nationalId: row.nationalId,
    email: row.email,
    phone: row.phone,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export class DrizzleGuardianRepository implements IGuardianRepository {
  constructor(private readonly db: Db) {}

  async findByStudentId(studentId: string): Promise<Guardian | null> {
    const [row] = await this.db
      .select()
      .from(guardians)
      .where(and(eq(guardians.studentId, studentId), isNull(guardians.deletedAt)))
      .limit(1);

    return row ? toGuardian(row) : null;
  }

  async create(guardian: Guardian): Promise<Guardian> {
    const [row] = await this.db
      .insert(guardians)
      .values({
        id: guardian.id,
        studentId: guardian.studentId,
        firstName: guardian.firstName,
        lastName: guardian.lastName,
        relationship: guardian.relationship,
        nationalIdType: guardian.nationalIdType,
        nationalId: guardian.nationalId,
        email: guardian.email,
        phone: guardian.phone,
      })
      .returning();

    if (!row) {
      throw new Error("Insert into guardians returned no row");
    }

    return toGuardian(row);
  }

  async update(guardian: Guardian): Promise<Guardian> {
    const [row] = await this.db
      .update(guardians)
      .set({
        firstName: guardian.firstName,
        lastName: guardian.lastName,
        relationship: guardian.relationship,
        nationalIdType: guardian.nationalIdType,
        nationalId: guardian.nationalId,
        email: guardian.email,
        phone: guardian.phone,
        updatedAt: sql`now()`,
      })
      .where(and(eq(guardians.id, guardian.id), isNull(guardians.deletedAt)))
      .returning();

    if (!row) {
      throw new Error("Update of guardians matched no live row");
    }

    return toGuardian(row);
  }
}
