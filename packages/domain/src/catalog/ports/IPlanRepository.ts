import type { Plan, PlanPrice } from "../Plan.js";

/**
 * There is no `updatePrice` and never will be (CLAUDE.md §5). `createWithPrice`
 * is one operation because a plan without a price cannot be sold and must not
 * exist half-written. `findById` answers retired plans too.
 */
export interface IPlanRepository {
  createWithPrice(plan: Plan, price: PlanPrice): Promise<void>;
  findById(id: string): Promise<Plan | null>;
  rename(plan: Plan): Promise<void>;
  addPrice(price: PlanPrice): Promise<void>;
}
