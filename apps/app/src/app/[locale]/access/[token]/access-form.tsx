'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { STUDENT_PASSWORD_MIN_LENGTH, studentPasswordIssues } from '@ooc/domain/password-policy'
import { Link } from '@/i18n/navigation'
import { completePortalAccess } from '@/lib/portal/auth-client'

/** Rules shown while typing — the same module the API checks with. */
export function AccessForm({ token, purpose }: { token: string; purpose: 'activation' | 'reset' }) {
  const t = useTranslations('portal_auth')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<'mismatch' | 'weak' | 'server' | null>(null)
  const [state, setState] = useState<'form' | 'done' | 'invalid'>('form')

  const issues = studentPasswordIssues(password)
  const rules = [
    { key: 'length', met: !issues.includes('too_short') && !issues.includes('too_long'), label: t('rule_length', { min: STUDENT_PASSWORD_MIN_LENGTH }) },
    { key: 'letter', met: !issues.includes('missing_letter'), label: t('rule_letter') },
    { key: 'digit', met: !issues.includes('missing_digit'), label: t('rule_digit') },
  ]

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    if (issues.length > 0) return setError('weak')
    if (password !== confirm) return setError('mismatch')
    setError(null)
    setPending(true)
    const result = await completePortalAccess(token, password)
    setPending(false)
    if (result.ok) return setState('done')
    if (result.error === 'link_invalid') return setState('invalid')
    setError(result.error)
  }

  if (state !== 'form') {
    const done = state === 'done'
    return (
      <div className="rounded-[28px] border border-line bg-white p-6 shadow-float sm:p-7">
        <h1 className="font-display text-3xl font-semibold text-ink">{done ? t('done_title') : t('invalid_title')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{done ? t('done_body') : t('invalid_body')}</p>
        <Link
          href={done ? '/login' : '/forgot-password'}
          className="mt-6 inline-flex text-sm font-bold text-brand-blue hover:text-brand-blue-deep"
        >
          {done ? t('go_to_login') : t('request_new_link')}
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate className="rounded-[28px] border border-line bg-white p-6 shadow-float sm:p-7">
      <h1 className="font-display text-3xl font-semibold text-ink">
        {purpose === 'activation' ? t('access_title_activation') : t('access_title_reset')}
      </h1>
      <p className="mt-2 mb-5 text-sm leading-relaxed text-muted-foreground">{t('access_subtitle')}</p>

      {error && (
        <p role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error === 'mismatch' ? t('mismatch') : error === 'weak' ? t('weak') : t('server_error')}
        </p>
      )}

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
        {t('password_label')}
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-2xl border border-line bg-sky-soft px-3 py-3 text-base font-normal text-ink outline-none focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-brand-blue/15"
        />
      </label>
      <ul className="mt-2 flex flex-col gap-1 text-xs">
        {rules.map((rule) => (
          <li key={rule.key} className={rule.met ? 'text-emerald-700' : 'text-muted-foreground'}>
            {rule.label}
          </li>
        ))}
      </ul>

      <label className="mt-5 flex flex-col gap-1.5 text-sm font-semibold text-ink">
        {t('confirm_label')}
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className="w-full rounded-2xl border border-line bg-sky-soft px-3 py-3 text-base font-normal text-ink outline-none focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-brand-blue/15"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="mt-6 flex w-full items-center justify-center rounded-full bg-brand-blue px-4 py-3.5 text-sm font-bold text-white transition hover:bg-brand-yellow hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? t('submitting') : t('submit')}
      </button>
    </form>
  )
}
