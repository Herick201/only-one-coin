import { Student, type IStudentRepository, type NationalIdType } from "@ooc/domain";
import { students } from "@ooc/db";
import type { Db } from "@/infra/db/client.js";

export class DrizzleStudentRepository implements IStudentRepository {
  constructor(private readonly db: Db) {}

  async create(student: Student): Promise<Student> {
    const [row] = await this.db
      .insert(students)
      .values({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        nationalIdType: student.nationalIdType,
        nationalId: student.nationalId,
        email: student.email,
        phone: student.phone,
        birthDate: student.birthDate,
        country: student.country,
        region: student.region,
        city: student.city,
      })
      .returning();

    if (!row) {
      throw new Error("Insert into students returned no row");
    }

    return new Student({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      nationalIdType: row.nationalIdType as NationalIdType,
      nationalId: row.nationalId,
      email: row.email,
      phone: row.phone,
      birthDate: row.birthDate,
      country: row.country,
      region: row.region,
      city: row.city,
    });
  }
}
