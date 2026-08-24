import {
  Guardian,
  type GuardianRelationship,
  type IGuardianRepository,
  type NationalIdType,
} from "@ooc/domain";
import { guardians } from "@ooc/db";
import type { Db } from "@/infra/db/client.js";

export class DrizzleGuardianRepository implements IGuardianRepository {
  constructor(private readonly db: Db) {}

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
    });
  }
}
