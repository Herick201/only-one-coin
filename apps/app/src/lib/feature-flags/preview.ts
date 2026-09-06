import { featureEnv } from './env'

/**
 * The internal unlock: how *we* reach a feature that is off in production.
 *
 * Someone opens `/api/preview?token=<secret>` once, the cookie below is set,
 * and from then on every flag resolves on for that browser — with a badge on
 * screen saying so, because seeing an unreleased screen without knowing it is
 * unreleased is how a "the student can't find it" bug is born.
 *
 * The cookie carries the secret itself, `httpOnly` and `secure`: it is a bearer
 * token, not a signature to forge. No token configured, no unlock — the route
 * answers 404 rather than admitting the door exists (CLAUDE.md §8,
 * anti-enumeração).
 */

export const PREVIEW_COOKIE = 'ooc_internal_preview'

/** Twelve hours — a working day, then the unlock is gone by itself. */
export const PREVIEW_MAX_AGE_SECONDS = 12 * 60 * 60

/**
 * Constant-time comparison, written by hand so it holds on any runtime this
 * ever renders on (edge included, where `node:crypto` may not be).
 */
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

export function isPreviewTokenValid(candidate: string | undefined): boolean {
  const token = featureEnv.FEATURE_PREVIEW_TOKEN
  if (!token || !candidate) return false
  return constantTimeEquals(candidate, token)
}

/** Whether the unlock is configured at all on this deploy. */
export function isPreviewUnlockConfigured(): boolean {
  return Boolean(featureEnv.FEATURE_PREVIEW_TOKEN)
}
