'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { env } from '@/env'
import type { Locale } from '@/lib/format'
import { Turnstile } from '@/components/enrollment/turnstile'
import { requestPortalReset, type NationalIdType, type SignInMethod } from '@/lib/portal/auth-client'
import { IdentifierFields } from '../login/identifier-fields'

/**
 * The confirmation is the same whether or not an account exists (CLAUDE.md
 * §8): once the API answered, this screen says "if there is an account, we
 * sent a link" — it cannot know more, because the API does not tell it.
 */
export function ForgotPasswordForm() {
  const t = useTranslations('portal_auth')
  const locale = useLocale() as Locale
  const [method, setMethod] = useState<SignInMethod>('email')
  const [nationalIdType, setNationalIdType] = useState<NationalIdType>('DNI')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaDown, setCaptchaDown] = useState(false)
  const [captchaReset, setCaptchaReset] = useState(0)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<'captcha' | 'server' | null>(null)
  const [sent, setSent] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    if (!captchaToken) {
      setError('captcha')
      return
    }
    setError(null)
    setPending(true)
    const form = new FormData(event.currentTarget)
    const ok = await requestPortalReset({
      method,
      identifier: String(form.get('identifier') ?? ''),
      nationalIdType: method === 'national_id' ? nationalIdType : undefined,
      captchaToken,
      locale,
    })
    setPending(false)
    if (!ok) {
      setError('server')
      setCaptchaToken(null)
      setCaptchaReset((n) => n + 1)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="rounded-[28px] border border-line bg-white p-6 shadow-float sm:p-7">
        <h1 className="font-display text-3xl font-semibold text-ink">{t('forgot_sent_title')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('forgot_sent_body')}</p>
        <Link href="/login" className="mt-6 inline-flex text-sm font-bold text-brand-blue hover:text-brand-blue-deep">
          {t('back_to_login')}
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate className="rounded-[28px] border border-line bg-white p-6 shadow-float sm:p-7">
      <h1 className="font-display text-3xl font-semibold text-ink">{t('forgot_title')}</h1>
      <p className="mt-2 mb-5 text-sm leading-relaxed text-muted-foreground">{t('forgot_subtitle')}</p>

      {error && (
        <p role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error === 'captcha' ? (captchaDown ? t('captcha_unavailable') : t('captcha_pending')) : t('forgot_error')}
        </p>
      )}

      <IdentifierFields
        method={method}
        onMethodChange={setMethod}
        nationalIdType={nationalIdType}
        onNationalIdTypeChange={setNationalIdType}
      />

      <div className="mt-5">
        <Turnstile
          siteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
          locale={locale}
          resetKey={captchaReset}
          onToken={setCaptchaToken}
          onUnavailable={() => setCaptchaDown(true)}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-6 flex w-full items-center justify-center rounded-full bg-brand-blue px-4 py-3.5 text-sm font-bold text-white transition hover:bg-brand-yellow hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? t('forgot_submitting') : t('forgot_submit')}
      </button>

      <p className="mt-5 text-center text-sm">
        <Link href="/login" className="font-semibold text-muted-foreground hover:text-ink">
          {t('back_to_login')}
        </Link>
      </p>
    </form>
  )
}
