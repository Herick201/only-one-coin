import { cache } from 'react'
import { serverEnv } from '@/server-env'
import { FEATURE_FLAGS, type FeatureFlagKey } from './registry'

/**
 * The switchboard's own answer: the flags somebody moved from the panel
 * (CLAUDE.md §5). The registry below in `registry.ts` says what a flag is and
 * what it defaults to; this says what was decided about it since.
 *
 * It is read from `apps/api`, never from the database: `apps/app` has no
 * connection string and is not getting one (CLAUDE.md §8). The read is a
 * public route — who can *change* a flag is the door that matters
 * (`.owners()` on the panel's write route), not who can read the current
 * state, which the portal shell needs before it even knows who is browsing.
 * The call is memoized per request, so a page reading five flags still costs
 * one round trip.
 */

export type FlagOverrides = Partial<Record<FeatureFlagKey, boolean>>

/**
 * On failure the platform falls back to what the code declares, and says so in
 * the log. The alternative — treating an unreachable API as "everything off" —
 * would turn a five-second blip into a 404 across the whole panel and portal,
 * for a section that was never turned off by anybody. A flag that was turned
 * off and briefly comes back is the cheaper wrong answer of the two.
 */
export const getFlagOverrides = cache(async (): Promise<FlagOverrides> => {
  try {
    const response = await fetch(
      new URL('/api/v1/feature-flags/state', serverEnv.API_INTERNAL_URL),
      { cache: 'no-store' },
    )

    if (!response.ok) {
      console.warn(
        `[feature-flags] /feature-flags/state answered ${response.status}; falling back to the code defaults.`,
      )
      return {}
    }

    const { overrides } = (await response.json()) as {
      overrides: Record<string, boolean>
    }

    // A row whose key is no longer declared governs nothing — a flag that was
    // retired leaves its row behind, and it must not resurface as a key the
    // resolver then walks a parent chain for.
    const known: FlagOverrides = {}
    for (const [key, enabled] of Object.entries(overrides)) {
      if (key in FEATURE_FLAGS) known[key as FeatureFlagKey] = enabled
    }
    return known
  } catch (error) {
    console.warn('[feature-flags] could not read the overrides; using the code defaults.', error)
    return {}
  }
})
