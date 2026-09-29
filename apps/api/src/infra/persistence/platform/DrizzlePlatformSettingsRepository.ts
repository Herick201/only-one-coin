import { platformSettings } from "@ooc/db";
import type { IPlatformSettingsRepository, PlatformSettings } from "@ooc/domain";
import { sql } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";

/**
 * Migration 0014 inserts the one row; the defaults below answer only if it
 * was somehow never there, and they are the column defaults of that same
 * migration — reading settings must never be the thing that takes the
 * checkout down.
 */
const DEFAULTS: PlatformSettings = { checkoutHoldMinutes: 15 };

export class DrizzlePlatformSettingsRepository implements IPlatformSettingsRepository {
  constructor(private readonly db: Db) {}

  async get(): Promise<PlatformSettings> {
    const [row] = await this.db
      .select({ checkoutHoldMinutes: platformSettings.checkoutHoldMinutes })
      .from(platformSettings)
      .limit(1);

    return row ?? DEFAULTS;
  }

  async setCheckoutHoldMinutes(minutes: number, actorId: string): Promise<void> {
    // Upsert against the singleton key, so a missing row is created rather
    // than the write silently matching nothing.
    await this.db
      .insert(platformSettings)
      .values({ id: true, checkoutHoldMinutes: minutes, updatedBy: actorId })
      .onConflictDoUpdate({
        target: platformSettings.id,
        set: { checkoutHoldMinutes: minutes, updatedBy: actorId, updatedAt: sql`now()` },
      });
  }
}
