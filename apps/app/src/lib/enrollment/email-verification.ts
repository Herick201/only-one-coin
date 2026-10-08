import { normalizeEmail } from '@ooc/domain/fields'
import type { CheckoutDraft } from './types'

/**
 * The checkout's e-mail proof (spec 2026-10-07). The server decides; this
 * file only talks to it and reads its answers into outcomes the screen
 * translates — never a reason string on screen (CLAUDE.md §4).
 */

export type SendCodeOutcome =
  | { kind: 'sent'; resendAfterSeconds: number }
  | {
      kind:
        | 'cooldown'
        | 'too_many_sends'
        | 'captcha_failed'
        | 'captcha_unavailable'
        | 'rate_limited'
        | 'hold_expired'
        | 'invalid_email'
        | 'failed'
    }

export type ConfirmCodeOutcome =
  | 'verified'
  | 'code_invalid'
  | 'code_expired'
  | 'attempts_exhausted'
  | 'not_found'
  | 'rate_limited'
  | 'failed'

/** The proof counts only for this hold and this address. */
export function isEmailVerified(draft: CheckoutDraft, holdId: string | null): boolean {
  const proof = draft.emailVerification
  return (
    proof !== null &&
    holdId !== null &&
    proof.holdId === holdId &&
    normalizeEmail(proof.email) === normalizeEmail(draft.student.email)
  )
}

async function reasonOf(response: Response): Promise<string | null> {
  const body = (await response.json().catch(() => null)) as { reason?: unknown } | null
  return typeof body?.reason === 'string' ? body.reason : null
}

function post(path: string, body: unknown): Promise<Response> {
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function sendVerificationCode(body: {
  holdId: string
  email: string
  recipientName: string
  locale: 'es-PE' | 'en' | 'pt-BR'
  captchaToken: string
}): Promise<SendCodeOutcome> {
  try {
    const response = await post('/api/v1/enrollments/email-verifications', body)
    if (response.status === 202) {
      const ok = (await response.json()) as { resendAfterSeconds: number }
      return { kind: 'sent', resendAfterSeconds: ok.resendAfterSeconds }
    }
    if (response.status === 400) return { kind: 'invalid_email' }
    if (response.status === 503) return { kind: 'captcha_unavailable' }
    const reason = await reasonOf(response)
    if (reason === 'email_verification.cooldown') return { kind: 'cooldown' }
    if (reason === 'email_verification.too_many_sends') return { kind: 'too_many_sends' }
    if (reason === 'captcha.failed') return { kind: 'captcha_failed' }
    if (reason === 'enrollment.seat_hold_expired') return { kind: 'hold_expired' }
    if (response.status === 429) return { kind: 'rate_limited' }
    return { kind: 'failed' }
  } catch {
    return { kind: 'failed' }
  }
}

export async function confirmVerificationCode(body: {
  holdId: string
  email: string
  code: string
}): Promise<ConfirmCodeOutcome> {
  try {
    const response = await post('/api/v1/enrollments/email-verifications/confirm', body)
    if (response.ok) return 'verified'
    if (response.status === 429) return 'rate_limited'
    if (response.status === 400) return 'code_invalid'
    const reason = await reasonOf(response)
    if (reason === 'email_verification.code_invalid') return 'code_invalid'
    if (reason === 'email_verification.code_expired') return 'code_expired'
    if (reason === 'email_verification.attempts_exhausted') return 'attempts_exhausted'
    if (reason === 'email_verification.not_found') return 'not_found'
    return 'failed'
  } catch {
    return 'failed'
  }
}
