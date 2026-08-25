'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
} from './icons'

type Step = 'credentials' | 'mfa' | 'recover' | 'recover_sent'

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  )
}

/**
 * Backoffice login. Credentials go straight to Better Auth's own
 * `/api/auth/sign-in/email` — same-origin, through the proxy every other
 * `apps/api` route goes through (`docs/ARCHITECTURE.md` §5.6) — so the
 * session cookie it sets lands on this origin without a cross-origin hop.
 *
 * The MFA step below the credentials form still exists, but nothing routes
 * to it yet: Better Auth has no `twoFactor` plugin configured, so there is
 * no code to verify. `admin`/`treasury`/`mass_approver` land on the panel
 * straight after a correct password for now — CLAUDE.md §8 still calls for
 * MFA on those roles, this is a known, tracked gap, not a decision to skip it.
 *
 * The failure banner is deliberately the same whether the address doesn't
 * exist or the password is wrong (CLAUDE.md §8, anti-enumeration).
 *
 * Password recovery lives here as a step instead of its own route so the
 * anti-enumeration answer is structural: the confirmation screen is identical
 * whether or not the address exists (CLAUDE.md §8). Recovery itself is still
 * mocked — no backend route for it yet.
 */
export function BackofficeLoginForm() {
  const t = useTranslations('backoffice')
  const router = useRouter()
  const [step, setStep] = useState<Step>('credentials')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Mock only: fake a round-trip so the pending UI is exercisable. Recovery
  // still uses this — sign-in below does not.
  function mockRoundTrip(next: () => void) {
    setPending(true)
    timer.current = window.setTimeout(() => {
      setPending(false)
      next()
    }, 700)
  }

  async function onCredentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    setError(false)
    setPending(true)

    const formData = new FormData(event.currentTarget)
    const response = await fetch('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.get('email'),
        password: formData.get('password'),
      }),
    })

    setPending(false)

    if (!response.ok) {
      setError(true)
      return
    }

    router.push('/backoffice/home')
  }

  function onMfa(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    // Mocked panel — the real session (and MFA check) comes with the backend.
    mockRoundTrip(() => router.push('/backoffice/home'))
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
    'w-full rounded-xl border border-line bg-sky-soft py-2.5 pl-10 pr-3 text-base font-normal text-ink outline-none transition placeholder:text-slate-500 focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-brand-blue/12'
  const adornClass =
    'pointer-events-none absolute left-3 text-slate-400 peer-focus:text-brand-blue'
  const primaryButtonClass =
    'mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-brand-blue px-4 py-3 text-sm font-bold text-white shadow-[0_16px_30px_-14px_rgba(47,107,255,0.9)] transition hover:bg-brand-yellow hover:text-ink disabled:cursor-not-allowed disabled:opacity-60'
  const ghostButtonClass =
    'flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-cream hover:text-ink disabled:opacity-60'

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
            className="w-full rounded-xl border border-line bg-sky-soft px-3 py-3 text-center text-xl font-semibold tracking-[0.5em] text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-brand-blue/12"
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

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {t('generic_error')}
        </div>
      )}

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
              className="absolute right-2 grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-cream hover:text-ink"
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
