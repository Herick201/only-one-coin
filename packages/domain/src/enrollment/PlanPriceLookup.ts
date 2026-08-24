/**
 * Read-only lookup, not a full plan/catalog repository — this bounded
 * context only ever needs "what does this plan cost right now", never CRUD
 * over plans (that belongs to a catalog context nobody has built yet).
 */
export interface IPlanPriceLookup {
  /** The plan_prices row with the greatest valid_from <= now(), or null if
   * the plan has no price on file. */
  findCurrentPrice(planId: string): Promise<{ id: string; amountCents: number } | null>;
}
