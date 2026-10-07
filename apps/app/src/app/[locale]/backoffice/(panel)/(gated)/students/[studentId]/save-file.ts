// Client-safe: the two edit forms of the student file call the same-origin
// `/api/v1` proxy with these, never the database (CLAUDE.md §8).

import type { FieldErrorCode } from '@ooc/domain/fields'
import { parseFieldErrors } from '@/lib/field-errors'

/**
 * Why a save failed, as something the form can say — never the API's
 * `reason` string carried into the markup (CLAUDE.md §4).
 */
export type SaveFailure =
  | { kind: 'invalid'; fields: Partial<Record<string, FieldErrorCode>> }
  | { kind: 'duplicate' }
  | { kind: 'guardian_required' }
  | { kind: 'generic' }

export type SaveResult<T> = { ok: true; value: T } | { ok: false; failure: SaveFailure }

/**
 * PUTs one half of the file and reads the answer. Field errors come keyed by
 * the bare field name: a body the route refused names `email`, a rule the
 * domain refused names `student.email`, and the form only knows `email`.
 */
export async function saveFile<T>(url: string, body: unknown): Promise<SaveResult<T>> {
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (response.ok) return { ok: true, value: (await response.json()) as T }

    const failure = (await response.json().catch(() => null)) as { reason?: string } | null
    const fields = parseFieldErrors(failure)
    if (fields.length > 0) {
      return {
        ok: false,
        failure: {
          kind: 'invalid',
          fields: Object.fromEntries(
            fields.map((field) => [field.path.replace(/^(student|guardian)\./, ''), field.code]),
          ),
        },
      }
    }
    if (failure?.reason === 'student.already_registered') return { ok: false, failure: { kind: 'duplicate' } }
    if (failure?.reason === 'student.guardian_required_for_minor') {
      return { ok: false, failure: { kind: 'guardian_required' } }
    }
    return { ok: false, failure: { kind: 'generic' } }
  } catch {
    return { ok: false, failure: { kind: 'generic' } }
  }
}
