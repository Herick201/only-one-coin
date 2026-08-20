import { z } from 'zod'

const schema = z.object({
  API_INTERNAL_URL: z.string().url(),
})

export const serverEnv = schema.parse({
  API_INTERNAL_URL: process.env.API_INTERNAL_URL,
})
