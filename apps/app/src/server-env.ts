import { z } from 'zod'
import { assertFeatureFlagEnv } from '@/lib/feature-flags/env'

const schema = z.object({
  API_INTERNAL_URL: z.string().url(),
  /**
   * The shared secret `apps/api` demands on its internal routes — today the
   * feature-flag state the resolver reads before it knows who is browsing
   * (CLAUDE.md §5). Optional so a fresh clone runs locally with nothing to
   * invent; in production the API refuses the read without it and the flags
   * fall back to what the code declares.
   */
  INTERNAL_API_TOKEN: z.string().min(24).optional(),
})

export const serverEnv = schema.parse({
  API_INTERNAL_URL: process.env.API_INTERNAL_URL,
  INTERNAL_API_TOKEN: process.env.INTERNAL_API_TOKEN,
})

// Same boot, same contract: a malformed OOC_FLAG_* is an error here, not a
// surprise on the screen it was supposed to govern. The flag environment
// validates itself in `@/lib/feature-flags/env` — this only makes sure the
// check also runs on the boot path of whoever talks to the API.
assertFeatureFlagEnv()
