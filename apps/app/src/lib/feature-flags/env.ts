import { z } from 'zod'
import {
  FEATURE_FLAG_KEYS,
  assertRegistry,
  flagEnvVar,
  type FeatureFlagKey,
} from './registry'

/**
 * The environment side of a flag: which deploy this is, the internal-unlock
 * secret, and the per-flag overrides. Kept apart from the registry so the
 * registry stays pure data, and apart from `src/server-env.ts` on purpose — a
 * screen that reads a flag must not be made to depend on the API address it
 * never calls (the mock portal and the public checkout are exactly that).
 */

/**
 * Which deploy this is. It decides one thing only: whether a flag may be off.
 * Production is the sole environment where a flag hides anything; local and the
 * preview deploys are ours, and there everything is on.
 *
 * Derived rather than required, and it fails *closed*: an unlabelled process
 * running a production build is treated as production, because guessing
 * "development" there would put every half-built screen on the air.
 */
function resolveAppEnv(): string {
  if (process.env.APP_ENV) return process.env.APP_ENV
  if (process.env.VERCEL_ENV === 'production') return 'production'
  if (process.env.VERCEL_ENV === 'preview') return 'preview'
  if (process.env.VERCEL_ENV === 'development') return 'development'
  return process.env.NODE_ENV === 'production' ? 'production' : 'development'
}

const envSchema = z.object({
  APP_ENV: z.enum(['development', 'preview', 'production']),
  /**
   * The shared secret that unlocks a disabled feature in production, for us
   * (`preview.ts`). Optional: without it there is simply no unlock, and
   * `/api/preview` answers 404 like any other unknown path.
   */
  FEATURE_PREVIEW_TOKEN: z.string().min(24).optional(),
})

export const featureEnv = envSchema.parse({
  APP_ENV: resolveAppEnv(),
  FEATURE_PREVIEW_TOKEN: process.env.FEATURE_PREVIEW_TOKEN,
})

const overrideSchema = z
  .enum(['on', 'off'])
  .optional()
  .describe('on | off')

export type FlagOverride = z.infer<typeof overrideSchema>

/**
 * Reads `OOC_FLAG_<KEY>`. Anything other than `on`, `off` or nothing at all is
 * a boot error, not a shrug: a flag misspelled `true` would silently resolve to
 * its registry default and nobody would know which value was in force
 * (CLAUDE.md §6 — env validada com zod no boot).
 */
export function readFlagOverride(key: FeatureFlagKey): FlagOverride {
  const name = flagEnvVar(key)
  const parsed = overrideSchema.safeParse(process.env[name])
  if (!parsed.success) {
    throw new Error(`Invalid ${name}: expected "on" or "off".`)
  }
  return parsed.data
}

/** Boot validation: the registry is coherent and every override is readable. */
export function assertFeatureFlagEnv(): void {
  assertRegistry()
  for (const key of FEATURE_FLAG_KEYS) readFlagOverride(key)
}
