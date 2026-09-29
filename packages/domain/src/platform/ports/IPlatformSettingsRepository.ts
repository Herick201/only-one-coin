import type { PlatformSettings } from "../PlatformSettings.js";

/**
 * One row, read on every checkout hold. Narrow on purpose, like
 * `IFeatureFlagOverrideRepository`: each setting has its own write, so a
 * change to one can never carry a stale copy of another along with it.
 */
export interface IPlatformSettingsRepository {
  get(): Promise<PlatformSettings>;
  setCheckoutHoldMinutes(minutes: number, actorId: string): Promise<void>;
}
