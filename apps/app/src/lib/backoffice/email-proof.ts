/**
 * The proof send, shared by the two screens that offer one: an automatic
 * e-mail's page and the composer for a manual send.
 *
 * It only parses — the copy for every outcome stays with the caller, in the
 * locale files (CLAUDE.md §4).
 */

/** How many addresses one proof may go to (`docs/ROADMAP.md` fase 5). */
export const MAX_TEST_RECIPIENTS = 5

/** Enough to catch a typo before it becomes a bounce; the provider is the judge. */
const ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** One member per reason, so the caller narrows down to the one that carries
 *  the offending address. */
export type TestRecipients =
  | { ok: true; list: string[] }
  | { ok: false; reason: 'empty' }
  | { ok: false; reason: 'max' }
  | { ok: false; reason: 'invalid'; value: string }

export function parseTestRecipients(input: string): TestRecipients {
  const list = input
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  if (list.length === 0) return { ok: false, reason: 'empty' }
  if (list.length > MAX_TEST_RECIPIENTS) return { ok: false, reason: 'max' }

  const bad = list.find((value) => !ADDRESS.test(value))
  if (bad) return { ok: false, reason: 'invalid', value: bad }

  return { ok: true, list }
}
