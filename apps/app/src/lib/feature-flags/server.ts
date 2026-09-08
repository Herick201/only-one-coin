import { cache } from 'react'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { featureEnv, readFlagOverride } from './env'
import { getFlagOverrides, type FlagOverrides } from './overrides'
import { PREVIEW_COOKIE, isPreviewTokenValid } from './preview'
import {
  FEATURE_FLAGS,
  FEATURE_FLAG_KEYS,
  type FeatureFlagKey,
} from './registry'

/**
 * Reading a flag. Server side only, on purpose: a flag never reaches the
 * client bundle, so what is off in production is not a list a reader can pull
 * out of the JavaScript. Client components receive the resolved boolean as a
 * prop, never the registry.
 */

export type FeatureFlagState = Readonly<Record<FeatureFlagKey, boolean>>

function parentOf(key: FeatureFlagKey): FeatureFlagKey | undefined {
  // The registry is `as const`, so only the flags that declare a parent carry
  // the field; this reads it uniformly. The boot check proves the name is real.
  const spec: { surface: string; production: boolean; parent?: string } =
    FEATURE_FLAGS[key]
  return spec.parent as FeatureFlagKey | undefined
}

/**
 * The flag's own answer, before its parent has a say. Four sources, strongest
 * first — and the order is the whole design (CLAUDE.md §5):
 *
 * 1. `OOC_FLAG_*`, the deploy's own env var. It outranks the panel on purpose:
 *    it is the way back when the panel itself is what broke.
 * 2. The switchboard — what somebody turned in Funcionalidades. Scoped to this
 *    environment by nothing more than the database it was written in.
 * 3. Outside production, on. Local and preview are ours, and a branch is never
 *    demoed with half a panel missing.
 * 4. What the registry declares.
 *
 * Note that (2) beats (3): a person clicking a switch in *this* environment is
 * not the forgotten registry default the "everything on outside production"
 * rule was written to protect against — it is a deliberate act, and testing
 * the off state locally is exactly what somebody would open that screen for.
 */
function resolveOwn(key: FeatureFlagKey, overrides: FlagOverrides): boolean {
  const envOverride = readFlagOverride(key)
  if (envOverride) return envOverride === 'on'

  const panelOverride = overrides[key]
  if (panelOverride !== undefined) return panelOverride

  if (featureEnv.APP_ENV !== 'production') return true
  return FEATURE_FLAGS[key].production
}

function resolve(key: FeatureFlagKey, overrides: FlagOverrides): boolean {
  let current: FeatureFlagKey | undefined = key
  // The chain is three deep at most and the boot check proves every parent
  // exists; the guard is against a cycle someone introduces later.
  const seen = new Set<FeatureFlagKey>()
  while (current) {
    if (seen.has(current)) {
      throw new Error(`Feature flag cycle through "${current}".`)
    }
    seen.add(current)
    if (!resolveOwn(current, overrides)) return false
    current = parentOf(current)
  }
  return true
}

/**
 * Every flag, resolved for this request. Memoized per request: the layout, the
 * nav and each gate below read the same answer, and the cookie is read once.
 */
export const getFeatureFlags = cache(async (): Promise<FeatureFlagState> => {
  const [unlocked, overrides] = await Promise.all([isInternalPreview(), getFlagOverrides()])
  const state = {} as Record<FeatureFlagKey, boolean>
  for (const key of FEATURE_FLAG_KEYS) {
    state[key] = unlocked || resolve(key, overrides)
  }
  return state
})

/**
 * Whether this browser carries the internal unlock. Everything a flag hides is
 * visible to it — that is the whole point of "desativado fica só pra nós".
 */
export const isInternalPreview = cache(async (): Promise<boolean> => {
  const jar = await cookies()
  return isPreviewTokenValid(jar.get(PREVIEW_COOKIE)?.value)
})

export async function isFeatureEnabled(key: FeatureFlagKey): Promise<boolean> {
  return (await getFeatureFlags())[key]
}

/**
 * The gate. A disabled section is not a locked screen with an explanation —
 * it does not exist: `notFound()`, the same answer a typo in the URL gets, so
 * nothing on the air hints at what is being built (CLAUDE.md §8).
 *
 * Called from the `layout.tsx` of each section, never from a single page, so
 * a screen added to a gated section tomorrow inherits the gate instead of
 * needing to remember it.
 */
export async function requireFeature(key: FeatureFlagKey): Promise<void> {
  if (!(await isFeatureEnabled(key))) notFound()
}
