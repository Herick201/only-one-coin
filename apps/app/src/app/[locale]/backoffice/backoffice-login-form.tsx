'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeftIcon } from './icons'

type Step = 'credentials' | 'mfa'

/**
 * Backoffice login — UI only, auth mocked. Two-step on purpose: credentials →
 * MFA. MFA in the flow is what distinguishes the backoffice from the student
 * portal (CLAUDE.md §8). No auth wiring yet; "submit" just simulates a
 * pending state and advances the step.
 */
export function BackofficeLoginForm() {
  const t = useTranslations('backoffice')
  const [step, setStep] = useState<Step>('credentials')
  const [pending, setPending] = useState(false)

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
    // No destination yet — dashboard comes with the backend. Stay on step.
    mockRoundTrip(() => undefined)
  }

  const fieldClass =
    'rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-base font-normal text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30'
  const labelClass = 'flex flex-col gap-1 text-sm font-medium text-slate-300'
  const buttonClass =
    'mt-2 flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60'

  if (step === 'mfa') {
    return (
      <form onSubmit={onMfa} className="flex flex-col gap-4" noValidate>
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            {t('mfa_title')}
          </h2>
          <p className="mt-1 text-sm text-slate-400">{t('mfa_subtitle')}</p>
        </div>

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
            className={`${fieldClass} text-center text-lg tracking-[0.4em]`}
          />
        </label>

        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? t('verifying') : t('verify')}
        </button>

        <button
          type="button"
          onClick={() => setStep('credentials')}
          disabled={pending}
          className="flex items-center justify-center gap-1 text-sm text-slate-400 transition hover:text-slate-200 disabled:opacity-60"
        >
          <ArrowLeftIcon size={16} />
          {t('back')}
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={onCredentials} className="flex flex-col gap-4" noValidate>
      <label className={labelClass}>
        {t('email_label')}
        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          placeholder={t('email_placeholder')}
          className={fieldClass}
        />
      </label>

      <label className={labelClass}>
        {t('password_label')}
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          placeholder={t('password_placeholder')}
          className={fieldClass}
        />
      </label>

      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? t('checking') : t('continue')}
      </button>
    </form>
  )
}
