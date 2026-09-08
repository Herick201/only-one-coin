/**
 * A flag somebody moved from the panel — the row behind one line of
 * `feature_flag_overrides` (CLAUDE.md §5).
 *
 * `key` is not typed as a union on purpose: the list of flags lives in
 * `apps/app`, next to the sections it governs, and the domain has no business
 * knowing that a section called `portal.payments` exists. What the domain
 * guarantees is narrower and does not depend on the list — that a change is
 * made by an owner, and that it is written down.
 */
export interface FeatureFlagOverride {
  key: string;
  enabled: boolean;
  /** The account that last moved it — Better Auth's own `user.id`. */
  updatedBy: string;
  updatedAt: Date;
}

/** The same row with the person's name resolved, for the screen that lists it. */
export interface FeatureFlagOverrideView extends FeatureFlagOverride {
  updatedByName: string | null;
}
