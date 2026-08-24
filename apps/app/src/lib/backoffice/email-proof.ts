/**
 * The proof send, shared by the two screens that offer one: an automatic
 * e-mail's page and the composer for a manual send.
 *
 * Addresses are added one at a time rather than typed as a comma-separated
 * line: a list somebody has to punctuate correctly is a list that silently
 * loses an address to a missing comma, and the proof is exactly the step where
 * that must not happen.
 *
 * It only validates — the copy for every outcome stays with the caller, in the
 * locale files (CLAUDE.md §4).
 */

/** How many addresses one proof may go to (`docs/ROADMAP.md` fase 5). */
export const MAX_TEST_RECIPIENTS = 5

/** Enough to catch a typo before it becomes a bounce; the provider is the judge. */
const ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** One member per reason, so the caller narrows to the one it has to explain. */
export type AddedRecipient =
  | { ok: true; value: string }
  | { ok: false; reason: 'empty' }
  | { ok: false; reason: 'invalid' }
  | { ok: false; reason: 'duplicate' }
  | { ok: false; reason: 'max' }

export function addTestRecipient(input: string, current: string[]): AddedRecipient {
  const value = input.trim()

  if (value.length === 0) return { ok: false, reason: 'empty' }
  if (!ADDRESS.test(value)) return { ok: false, reason: 'invalid' }
  if (current.some((item) => item.toLowerCase() === value.toLowerCase())) {
    return { ok: false, reason: 'duplicate' }
  }
  if (current.length >= MAX_TEST_RECIPIENTS) return { ok: false, reason: 'max' }

  return { ok: true, value }
}
