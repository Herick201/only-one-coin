/**
 * Rules the account screen reads. No copy here — every message is resolved
 * through the `bo` namespace by the caller (CLAUDE.md §4).
 *
 * The password requirements are the panel's own floor, not a confirmed
 * institutional policy: they exist so the screen can say what it expects
 * *before* a save fails. They mirror `StaffPasswordPolicy`
 * (`packages/domain/src/identity/StaffPasswordPolicy.ts`) — apps/app does not
 * import the domain, so keep the two in sync. The check that counts is the
 * server's (`POST /api/v1/me/password`).
 */

export const PASSWORD_MIN_LENGTH = 12

export interface PasswordDraft {
  current: string
  next: string
  confirm: string
}

/** One requirement, and whether the draft already meets it. */
export interface PasswordRule {
  key: 'length' | 'letter_number' | 'different' | 'match'
  met: boolean
}

export function passwordRules(draft: PasswordDraft): PasswordRule[] {
  return [
    { key: 'length', met: draft.next.length >= PASSWORD_MIN_LENGTH },
    {
      key: 'letter_number',
      met: /\p{L}/u.test(draft.next) && /\d/.test(draft.next),
    },
    {
      key: 'different',
      met: draft.next.length > 0 && draft.next !== draft.current,
    },
    { key: 'match', met: draft.next.length > 0 && draft.next === draft.confirm },
  ]
}

export function canSubmitPassword(draft: PasswordDraft): boolean {
  return draft.current.length > 0 && passwordRules(draft).every((rule) => rule.met)
}
