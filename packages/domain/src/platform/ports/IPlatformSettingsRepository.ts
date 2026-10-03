import type { PlatformSettings } from "../PlatformSettings.js";

/**
 * One row, read on every checkout hold and every receipt validation. Narrow on purpose, like
 * `IFeatureFlagOverrideRepository`: each setting has its own write, so a
 * change to one can never carry a stale copy of another along with it.
 */
export interface IPlatformSettingsRepository {
  get(): Promise<PlatformSettings>;
  setCheckoutHoldMinutes(minutes: number, actorId: string): Promise<void>;
  setReceiptAmountToleranceCents(cents: number, actorId: string): Promise<void>;
  setReceiptRejectBelowPercent(percent: number, actorId: string): Promise<void>;
}
