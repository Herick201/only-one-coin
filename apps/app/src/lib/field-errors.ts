import { z } from 'zod'
import { FieldErrorCodeSchema, type FieldError } from '@ooc/domain/fields'

const EnvelopeSchema = z.object({
  reason: z.literal('validation_error'),
  fields: z.array(z.object({ path: z.string(), code: FieldErrorCodeSchema })),
})

/**
 * The fields a `400 validation_error` names (OOC-64), or none. Read through a
 * schema rather than cast: the code becomes a translation key, and a code the
 * locale files do not know must never reach the screen (`CLAUDE.md` §4).
 */
export function parseFieldErrors(body: unknown): FieldError[] {
  const parsed = EnvelopeSchema.safeParse(body)
  return parsed.success ? parsed.data.fields : []
}
