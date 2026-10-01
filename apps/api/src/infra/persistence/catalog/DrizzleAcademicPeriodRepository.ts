import { AcademicPeriod, type IAcademicPeriodRepository } from "@ooc/domain";
import { academicPeriods } from "@ooc/db";
import { eq } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";

type PeriodRow = typeof academicPeriods.$inferSelect;

export function periodFromRow(row: PeriodRow): AcademicPeriod {
  return new AcademicPeriod({
    id: row.id,
    name: row.name,
    startsOn: row.startsOn,
    endsOn: row.endsOn,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  });
}

export class DrizzleAcademicPeriodRepository implements IAcademicPeriodRepository {
  constructor(private readonly db: Db) {}

  async create(period: AcademicPeriod): Promise<AcademicPeriod> {
    const [row] = await this.db
      .insert(academicPeriods)
      .values({ id: period.id, name: period.name, startsOn: period.startsOn, endsOn: period.endsOn })
      .returning();
    if (!row) throw new Error("Insert into academic_periods returned no row");
    return periodFromRow(row);
  }

  async findById(id: string): Promise<AcademicPeriod | null> {
    const [row] = await this.db.select().from(academicPeriods).where(eq(academicPeriods.id, id)).limit(1);
    return row ? periodFromRow(row) : null;
  }

  async update(period: AcademicPeriod): Promise<AcademicPeriod> {
    // deleted_at is not written here: leaving the catalog is
    // RetireCatalogEntryUseCase's job, and an edit must not undo it.
    const [row] = await this.db
      .update(academicPeriods)
      .set({ name: period.name, startsOn: period.startsOn, endsOn: period.endsOn, updatedAt: period.updatedAt })
      .where(eq(academicPeriods.id, period.id))
      .returning();
    if (!row) throw new Error("Update of academic_periods matched no row");
    return periodFromRow(row);
  }
}
