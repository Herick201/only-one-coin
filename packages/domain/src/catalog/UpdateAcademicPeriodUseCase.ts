import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import type { IAuditLogRepository } from "../identity/ports/IAuditLogRepository.js";
import type { AcademicPeriod, UpdateAcademicPeriodDTO } from "./AcademicPeriod.js";
import { PeriodNotFoundError } from "./errors.js";
import type { IAcademicPeriodRepository } from "./ports/IAcademicPeriodRepository.js";

export interface UpdateAcademicPeriodInput {
  actorId: string;
  id: string;
  patch: UpdateAcademicPeriodDTO;
}

/** Renames or re-dates a period. A retired period is not found. */
export class UpdateAcademicPeriodUseCase extends BaseUseCase<UpdateAcademicPeriodInput, AcademicPeriod> {
  constructor(
    private readonly periods: IAcademicPeriodRepository,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: UpdateAcademicPeriodInput): Promise<AcademicPeriod> {
    const period = await this.periods.findById(input.id);
    if (!period || period.isDeleted) throw new PeriodNotFoundError();

    const changed = period.update(input.patch);
    if (changed.length === 0) return period;

    const saved = await this.periods.update(period);

    await this.auditLog.append({
      actorId: input.actorId,
      action: "catalog.academic_period.updated",
      targetId: period.id,
      metadata: { fields: changed },
      at: saved.updatedAt,
    });

    return saved;
  }
}
