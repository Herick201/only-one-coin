import type { FeatureFlagOverride, FeatureFlagOverrideView } from "../FeatureFlagOverride.js";

/**
 * Deliberately narrow, like `IUserRoleRepository`: no generic `update`. A flag
 * is either set to a value or handed back to the code default (`clear`) —
 * there is no third way to write this table, and no way at all to delete a
 * whole set of them.
 */
export interface IFeatureFlagOverrideRepository {
  /** Every override in force. The resolver reads this on every request. */
  list(): Promise<FeatureFlagOverride[]>;
  /** The same list with the last actor's name resolved, for the panel. */
  listForPanel(): Promise<FeatureFlagOverrideView[]>;
  find(key: string): Promise<FeatureFlagOverride | null>;
  /** Upsert — the row's identity is the flag it governs. */
  set(key: string, enabled: boolean, actorId: string): Promise<void>;
  /** Back to whatever the code declares. Silent when there was no row. */
  clear(key: string): Promise<void>;
}
