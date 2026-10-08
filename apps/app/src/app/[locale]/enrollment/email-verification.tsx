'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { normalizeEmail } from '@ooc/domain/fields'
import { env } from '@/env'
import type { Locale } from '@/lib/format'
import {
  confirmVerificationCode,
  sendVerificationCode,
  type ConfirmCodeOutcome,
  type SendCodeOutcome,
} from '@/lib/enrollment/email-verification'
import { Turnstile } from '@/components/enrollment/turnstile'
import { GhostButton, Note, PrimaryButton, TextInput } from '@/components/enrollment/ui'
import { CheckoutIcon } from '@/components/enrollment/icons'

const apiLocale: Record<Locale, 'es-PE' | 'en' | 'pt-BR'> = { es: 'es-PE', en: 'en', pt: 'pt-BR' }

/** Every answer the server can give that leaves the block where it is.
 * Derived from the two outcome unions, so a new outcome lands here too. */
type VerifyError =
  | Exclude<SendCodeOutcome['kind'], 'sent' | 'hold_expired'>
  | Exclude<ConfirmCodeOutcome, 'verified'>

/** One copy key per error — a `Record`, so an outcome added to the unions
 * above fails the typecheck until it has words (CLAUDE.md §4). */
const ERROR_COPY: Record<VerifyError, string> = {
  code_invalid: 'step.student.verify.error.code_invalid',
  code_expired: 'step.student.verify.error.code_expired',
  attempts_exhausted: 'step.student.verify.error.attempts_exhausted',
  not_found: 'step.student.verify.error.not_found',
  cooldown: 'step.student.verify.error.cooldown',
  too_many_sends: 'step.student.verify.error.too_many_sends',
  captcha_failed: 'step.student.verify.error.captcha_failed',
  captcha_unavailable: 'step.student.verify.error.captcha_unavailable',
  rate_limited: 'step.student.verify.error.rate_limited',
  invalid_email: 'step.student.verify.error.invalid_email',
  failed: 'step.student.verify.error.failed',
}

/**
 * The student's Gmail, proven with a 6-digit code (spec 2026-10-07). The
 * server decides — this block only asks it and keeps the screen honest about
 * what it said. A code sent to one address does not prove another: editing
 * the e-mail after sending puts the block back at the start.
 *
 * The resend countdown belongs to the seat hold, not to the address — the
 * server's cooldown is per hold — so changing the e-mail does not restart it.
 */
export function EmailVerification({
  holdId,
  email,
  recipientName,
  ready,
  verified,
  onVerified,
  onHoldExpired,
}: {
  holdId: string | null
  email: string
  recipientName: string
  /** The address passes the student rules — only then can a code go out. */
  ready: boolean
  verified: boolean
  onVerified: (email: string) => void
  onHoldExpired: () => void
}) {
  const t = useTranslations('enrollment')
  const locale = useLocale() as Locale
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<VerifyError | null>(null)
  const [resendAt, setResendAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false)

  const normalized = normalizeEmail(email)

  // The address changed after the code went out: that code proves nothing here.
  useEffect(() => {
    if (sentTo !== null && sentTo !== normalized) {
      setSentTo(null)
      setCode('')
      setError(null)
    }
  }, [normalized, sentTo])

  // Ticks once a second while the cooldown runs, and stops at zero.
  useEffect(() => {
    if (resendAt <= now) return
    const timer = window.setTimeout(() => setNow(Date.now()), 1000)
    return () => window.clearTimeout(timer)
  }, [resendAt, now])

  if (verified) {
    return <Note tone="success">{t('step.student.verify.verified')}</Note>
  }

  const secondsToResend = Math.max(0, Math.ceil((resendAt - now) / 1000))

  async function send() {
    if (!holdId || !captchaToken || busy) return
    setBusy(true)
    setError(null)
    const outcome = await sendVerificationCode({
      holdId,
      email: normalized,
      recipientName,
      locale: apiLocale[locale],
      captchaToken,
    })
    setBusy(false)
    // A Turnstile token is good for one request, whatever the answer was.
    setCaptchaResetKey((key) => key + 1)
    if (outcome.kind === 'sent') {
      setSentTo(normalized)
      setCode('')
      setResendAt(Date.now() + outcome.resendAfterSeconds * 1000)
      setNow(Date.now())
      return
    }
    if (outcome.kind === 'hold_expired') {
      onHoldExpired()
      return
    }
    setError(outcome.kind)
  }

  async function confirm() {
    if (!holdId || busy || !/^\d{6}$/.test(code)) return
    setBusy(true)
    setError(null)
    const outcome = await confirmVerificationCode({ holdId, email: normalized, code })
    setBusy(false)
    if (outcome === 'verified') {
      onVerified(normalized)
      return
    }
    setError(outcome)
  }

  function changeEmail() {
    setSentTo(null)
    setCode('')
    setError(null)
    document.getElementById('email')?.focus()
  }

  const countdown =
    secondsToResend > 0 ? t('step.student.verify.resend_in', { seconds: secondsToResend }) : null

  return (
    // On a phone the block bleeds to the card's edges: the Turnstile widget is
    // a fixed 300px, and inside the card's padding plus this block's own a
    // 375px screen leaves ~270px — the widget would hang out of the box.
    <div className="-mx-5 flex flex-col gap-3 border-y border-line bg-sky-soft p-4 sm:mx-0 sm:rounded-2xl sm:border">
      <p className="text-sm font-bold text-ink">{t('step.student.verify.title')}</p>

      {!ready ? (
        <p className="text-sm text-muted-foreground">{t('step.student.verify.fill_email_first')}</p>
      ) : sentTo === null ? (
        <p className="text-sm text-ink">{t('step.student.verify.intro', { email: normalized })}</p>
      ) : (
        <>
          <p className="text-sm text-ink">{t('step.student.verify.sent', { email: sentTo })}</p>
          <label htmlFor="verification-code" className="text-sm font-medium text-ink">
            {t('step.student.verify.code_label')}
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <TextInput
              id="verification-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="max-w-[10rem] tracking-[0.3em]"
              value={code}
              invalid={error === 'code_invalid'}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <PrimaryButton onClick={() => void confirm()} disabled={busy || code.length !== 6}>
              {busy ? t('step.student.verify.confirming') : t('step.student.verify.confirm')}
            </PrimaryButton>
          </div>
        </>
      )}

      {ready && (
        <div className="flex flex-col gap-2">
          <Turnstile
            siteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            locale={locale}
            resetKey={captchaResetKey}
            onToken={setCaptchaToken}
            onUnavailable={() => setCaptchaUnavailable(true)}
          />
          {captchaUnavailable ? (
            <Note tone="danger">{t('step.student.verify.error.captcha_unavailable')}</Note>
          ) : (
            !captchaToken && <p className="text-xs text-muted-foreground">{t('step.student.verify.captcha_hint')}</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {sentTo === null ? (
              // After "change e-mail" the hold's cooldown may still be running:
              // the button waits it out rather than earning a `cooldown`.
              <PrimaryButton
                onClick={() => void send()}
                disabled={busy || !captchaToken || !holdId || secondsToResend > 0}
              >
                {busy ? t('step.student.verify.sending') : (countdown ?? t('step.student.verify.send'))}
              </PrimaryButton>
            ) : (
              <>
                <GhostButton
                  onClick={() => void send()}
                  disabled={busy || secondsToResend > 0 || !captchaToken}
                >
                  <CheckoutIcon name="arrow-right" size={16} />
                  {countdown ?? t('step.student.verify.resend')}
                </GhostButton>
                <GhostButton onClick={changeEmail} disabled={busy}>
                  {t('step.student.verify.change_email')}
                </GhostButton>
              </>
            )}
          </div>
        </div>
      )}

      {error && <Note tone="danger">{t(ERROR_COPY[error])}</Note>}
    </div>
  )
}
