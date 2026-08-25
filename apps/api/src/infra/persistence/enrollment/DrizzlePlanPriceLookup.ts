import type { IPlanPriceLookup } from "@ooc/domain";
import { planPrices } from "@ooc/db";
import { and, desc, eq, lte, sql } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";

export class DrizzlePlanPriceLookup implements IPlanPriceLookup {
  constructor(private readonly db: Db) {}

  async findCurrentPrice(planId: string): Promise<{ id: string; amountCents: number } | null> {
    const [row] = await this.db
      .select({ id: planPrices.id, amountCents: planPrices.amountCents })
      .from(planPrices)
      .where(and(eq(planPrices.planId, planId), lte(planPrices.validFrom, sql`now()`)))
      .orderBy(desc(planPrices.validFrom))
      .limit(1);

    return row ?? null;
  }
}
