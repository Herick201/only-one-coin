import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import type { IAuditLogRepository } from "../identity/ports/IAuditLogRepository.js";
import { PlanNotFoundError } from "./errors.js";
import { PlanPrice } from "./Plan.js";
import type { IPlanRepository } from "./ports/IPlanRepository.js";

export interface SchedulePlanPriceInput {
  actorId: string;
  planId: string;
  amountCents: number;
  validFrom?: Date;
}

/**
 * Puts a new price in force, now or on a future date. The old price keeps
 * answering until then, and keeps answering for every enrollment that froze
 * it. Correcting a wrong price is scheduling another one — never an edit.
 */
export class SchedulePlanPriceUseCase extends BaseUseCase<SchedulePlanPriceInput, PlanPrice> {
  constructor(
    private readonly plans: IPlanRepository,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: SchedulePlanPriceInput): Promise<PlanPrice> {
    const plan = await this.plans.findById(input.planId);
    if (!plan || plan.isDeleted) throw new PlanNotFoundError();

    const price = PlanPrice.schedule({ planId: plan.id, amountCents: input.amountCents, validFrom: input.validFrom });
    await this.plans.addPrice(price);

    await this.auditLog.append({
      actorId: input.actorId,
      action: "catalog.plan_price.scheduled",
      targetId: plan.id,
      metadata: { priceId: price.id, amountCents: price.amountCents, validFrom: price.validFrom.toISOString() },
      at: price.createdAt,
    });

    return price;
  }
}
