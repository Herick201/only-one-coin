import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import type { IAuditLogRepository } from "../identity/ports/IAuditLogRepository.js";
import { AcademicPeriod, type CreateAcademicPeriodDTO } from "./AcademicPeriod.js";
import type { IAcademicPeriodRepository } from "./ports/IAcademicPeriodRepository.js";

export interface CreateAcademicPeriodInput {
  actorId: string;
  period: CreateAcademicPeriodDTO;
}

/** Opens a sales period (OOC-35). */
export class CreateAcademicPeriodUseCase extends BaseUseCase<CreateAcademicPeriodInput, AcademicPeriod> {
  constructor(
    private readonly periods: IAcademicPeriodRepository,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: CreateAcademicPeriodInput): Promise<AcademicPeriod> {
    const created = await this.periods.create(AcademicPeriod.create(input.period));

    await this.auditLog.append({
      actorId: input.actorId,
      action: "catalog.academic_period.created",
      targetId: created.id,
      metadata: { name: created.name },
      at: created.createdAt,
    });

    return created;
  }
}
