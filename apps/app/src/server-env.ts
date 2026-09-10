import { z } from 'zod'
import { assertFeatureFlagEnv } from '@/lib/feature-flags/env'

const schema = z.object({
  API_INTERNAL_URL: z.string().url(),
})

export const serverEnv = schema.parse({
  API_INTERNAL_URL: process.env.API_INTERNAL_URL,
})

// Same boot, same contract: a malformed OOC_FLAG_* is an error here, not a
// surprise on the screen it was supposed to govern. The flag environment
// validates itself in `@/lib/feature-flags/env` — this only makes sure the
// check also runs on the boot path of whoever talks to the API.
assertFeatureFlagEnv()
