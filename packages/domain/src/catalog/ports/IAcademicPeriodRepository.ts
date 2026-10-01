import type { AcademicPeriod } from "../AcademicPeriod.js";

/**
 * No delete: a period leaves the catalog through RetireCatalogEntryUseCase
 * (deleted_at). `findById` answers retired rows too — the caller decides.
 */
export interface IAcademicPeriodRepository {
  create(period: AcademicPeriod): Promise<AcademicPeriod>;
  findById(id: string): Promise<AcademicPeriod | null>;
  update(period: AcademicPeriod): Promise<AcademicPeriod>;
}
