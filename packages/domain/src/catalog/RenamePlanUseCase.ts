import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import type { IAuditLogRepository } from "../identity/ports/IAuditLogRepository.js";
import { PlanNotFoundError } from "./errors.js";
import type { Plan } from "./Plan.js";
import type { IPlanRepository } from "./ports/IPlanRepository.js";

export interface RenamePlanInput {
  actorId: string;
  id: string;
  name: string;
}

export class RenamePlanUseCase extends BaseUseCase<RenamePlanInput, Plan> {
  constructor(
    private readonly plans: IPlanRepository,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: RenamePlanInput): Promise<Plan> {
    const plan = await this.plans.findById(input.id);
    if (!plan) throw new PlanNotFoundError();

    const previous = plan.name;
    if (!plan.rename(input.name)) return plan;

    await this.plans.rename(plan);
    await this.auditLog.append({
      actorId: input.actorId,
      action: "catalog.plan.renamed",
      targetId: plan.id,
      metadata: { from: previous, to: plan.name },
      at: plan.updatedAt,
    });

    return plan;
  }
}
