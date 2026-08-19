'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
} from './icons'

type Step = 'credentials' | 'mfa' | 'recover' | 'recover_sent'

/**
 * Backoffice login — UI only, auth mocked. Two-step on purpose: credentials →
 * MFA. MFA in the flow is what distinguishes the backoffice from the student
 * portal (CLAUDE.md §8). No auth wiring yet; "submit" just simulates a pending
 * state and advances the step.
 *
 * Password recovery lives here as a step instead of its own route so the
 * anti-enumeration answer is structural: the confirmation screen is identical
 * whether or not the address exists (CLAUDE.md §8).
 */
export function BackofficeLoginForm() {
  const t = useTranslations('backoffice')
  const [step, setStep] = useState<Step>('credentials')
  const [pending, setPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Mock only: fake a round-trip so the pending UI is exercisable.
  function mockRoundTrip(next: () => void) {
    setPending(true)
    window.setTimeout(() => {
      setPending(false)
      next()
    }, 700)
  }

  function onCredentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    mockRoundTrip(() => setStep('mfa'))
  }

  function onMfa(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    // No destination yet — the panel comes with the backend. Stay on step.
    mockRoundTrip(() => undefined)
  }

  function onRecover(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    mockRoundTrip(() => setStep('recover_sent'))
  }

  const cardClass =
    'rounded-3xl border border-line bg-white p-7 shadow-float sm:p-8'
  const labelClass = 'flex flex-col gap-1.5 text-sm font-semibold text-ink'
  const fieldWrapClass = 'relative flex items-center'
  const fieldClass =
    'w-full rounded-xl border border-line bg-sky-soft py-2.5 pl-10 pr-3 text-base font-normal text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-brand-blue/12'
  const adornClass =
    'pointer-events-none absolute left-3 text-slate-400 peer-focus:text-brand-blue'
  const primaryButtonClass =
    'mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-brand-blue px-4 py-3 text-sm font-bold text-white shadow-[0_16px_30px_-14px_rgba(47,107,255,0.9)] transition hover:bg-brand-blue-deep disabled:cursor-not-allowed disabled:opacity-60'
  const ghostButtonClass =
    'flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-muted transition hover:bg-sky hover:text-ink disabled:opacity-60'

  function Heading({ title, subtitle }: { title: string; subtitle: string }) {
    return (
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>
    )
  }

  if (step === 'recover_sent') {
    return (
      <div className={cardClass}>
        <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircleIcon size={24} />
        </div>
        <Heading title={t('recover_sent_title')} subtitle={t('recover_sent_body')} />
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setStep('credentials')}
            className={ghostButtonClass}
          >
            <ArrowLeftIcon size={16} />
            {t('back_to_login')}
          </button>
        </div>
      </div>
    )
  }

  if (step === 'recover') {
    return (
      <form onSubmit={onRecover} className={cardClass} noValidate>
        <Heading title={t('recover_title')} subtitle={t('recover_subtitle')} />

        <label className={labelClass}>
          {t('email_label')}
          <span className={fieldWrapClass}>
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              placeholder={t('email_placeholder')}
              className={`peer ${fieldClass}`}
            />
            <MailIcon size={18} className={adornClass} />
          </span>
        </label>

        <button type="submit" disabled={pending} className={`${primaryButtonClass} mt-5`}>
          {pending ? t('recover_sending') : t('recover_submit')}
        </button>

        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => setStep('credentials')}
            disabled={pending}
            className={ghostButtonClass}
          >
            <ArrowLeftIcon size={16} />
            {t('back_to_login')}
          </button>
        </div>
      </form>
    )
  }

  if (step === 'mfa') {
    return (
      <form onSubmit={onMfa} className={cardClass} noValidate>
        <Heading title={t('mfa_title')} subtitle={t('mfa_subtitle')} />

        <label className={labelClass}>
          {t('mfa_code_label')}
          <input
            type="text"
            name="mfa_code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            required
            placeholder={t('mfa_code_placeholder')}
            className="w-full rounded-xl border border-line bg-sky-soft px-3 py-3 text-center text-xl font-semibold tracking-[0.5em] text-ink outline-none transition placeholder:text-slate-300 focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-brand-blue/12"
          />
        </label>

        <button type="submit" disabled={pending} className={`${primaryButtonClass} mt-5`}>
          {pending ? t('verifying') : t('verify')}
        </button>

        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => setStep('credentials')}
            disabled={pending}
            className={ghostButtonClass}
          >
            <ArrowLeftIcon size={16} />
            {t('back')}
          </button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={onCredentials} className={cardClass} noValidate>
      <Heading title={t('title')} subtitle={t('subtitle')} />

      <div className="flex flex-col gap-4">
        <label className={labelClass}>
          {t('email_label')}
          <span className={fieldWrapClass}>
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              placeholder={t('email_placeholder')}
              className={`peer ${fieldClass}`}
            />
            <MailIcon size={18} className={adornClass} />
          </span>
        </label>

        <label className={labelClass}>
          <span className="flex items-center justify-between gap-2">
            {t('password_label')}
            <button
              type="button"
              onClick={() => setStep('recover')}
              className="text-xs font-semibold text-brand-blue transition hover:text-brand-blue-deep hover:underline"
            >
              {t('forgot_password')}
            </button>
          </span>
          <span className={fieldWrapClass}>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              required
              placeholder={t('password_placeholder')}
              className={`peer ${fieldClass} pr-11`}
            />
            <LockIcon size={18} className={adornClass} />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-pressed={showPassword}
              aria-label={showPassword ? t('hide_password') : t('show_password')}
              title={showPassword ? t('hide_password') : t('show_password')}
              className="absolute right-2 grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-sky hover:text-brand-blue"
            >
              {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
            </button>
          </span>
        </label>
      </div>

      <button type="submit" disabled={pending} className={`${primaryButtonClass} mt-6`}>
        {pending ? t('checking') : t('continue')}
      </button>
    </form>
  )
}
