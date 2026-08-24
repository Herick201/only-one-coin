'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { AccountMfa } from '@/lib/backoffice/types'
import { formatDate, type Locale } from '@/lib/format'
import { SectionTitle, StatusBadge } from '@/components/backoffice/ui'
import { Toast } from '@/components/backoffice/controls'
import { BoIcon } from '@/components/backoffice/icons'

/** Mock enrollment secret — the real one is issued by `apps/api` per device. */
const DEMO_SECRET = 'JBSW Y3DP EHPK 3PXP'

const CODE_LENGTH = 6

/**
 * The second factor, as its owner sees it. Two shapes, and the difference is
 * the role: for administración, tesorería and aprobación masiva it is not a
 * preference — the panel never draws a switch that turns it off (CLAUDE.md §8),
 * because those accounts move money and hand out roles. For the rest it is a
 * choice, offered rather than imposed.
 *
 * Frontend stub: enrolment and recovery codes are local state. The real flow
 * issues the secret server-side, verifies the first code there, and lands in
 * the append-only audit log.
 */
export function AccountMfaCard({
  mfa,
  mandatory,
  locale,
}: {
  mfa: AccountMfa
  mandatory: boolean
  locale: Locale
}) {
  const t = useTranslations('bo')
  const [state, setState] = useState<AccountMfa>(mfa)
  const [enrolling, setEnrolling] = useState(false)
  const [code, setCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function confirmEnrolment() {
    if (code.length !== CODE_LENGTH) return
    setState({
      ...state,
      enabled: true,
      enrolledAt: new Date().toISOString(),
    })
    setEnrolling(false)
    setCode('')
    setToast(t('account.mfa_enabled_toast'))
  }

  function disable() {
    if (mandatory) return
    setState({ ...state, enabled: false, enrolledAt: null })
    setRecoveryCodes(null)
    setToast(t('account.mfa_disabled_toast'))
  }

  function regenerate() {
    // Mock codes, generated on click so nothing has to match a server render.
    const codes = Array.from({ length: 8 }, () =>
      Math.random().toString(36).slice(2, 6).toUpperCase() +
      '-' +
      Math.random().toString(36).slice(2, 6).toUpperCase(),
    )
    setRecoveryCodes(codes)
    setState({ ...state, recoveryCodesLeft: codes.length })
    setToast(t('account.mfa_recovery_toast'))
  }

  return (
    <section className="flex flex-col p-5">
      {/* The badge sits with the title, not pushed to the far edge: on a
          full-width card that put the state a screen away from what it is the
          state of. */}
      <div className="flex flex-wrap items-center gap-2.5">
        <SectionTitle icon="key">{t('account.mfa_title')}</SectionTitle>
        <StatusBadge
          tone={state.enabled ? 'success' : mandatory ? 'danger' : 'neutral'}
          label={state.enabled ? t('account.mfa_on') : t('account.mfa_off')}
        />
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {mandatory ? t('account.mfa_required_hint') : t('account.mfa_optional_hint')}
      </p>

      {state.enabled && state.enrolledAt && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t('account.mfa_enrolled', { date: formatDate(state.enrolledAt, locale) })}
        </p>
      )}

      {mandatory && !state.enabled && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          <BoIcon name="alert" size={14} className="mt-0.5 shrink-0" />
          {t('account.mfa_required_missing')}
        </p>
      )}

      {enrolling ? (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-line bg-sky-soft p-3.5">
          <p className="text-sm font-semibold text-ink">
            {t('account.mfa_enroll_title')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('account.mfa_enroll_body')}
          </p>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('account.mfa_secret_label')}
            </p>
            <p className="mt-0.5 select-all font-mono text-sm font-semibold tracking-wider text-ink">
              {DEMO_SECRET}
            </p>
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('account.mfa_code_label')}
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={CODE_LENGTH}
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))
              }
              className="w-36 rounded-lg border border-line bg-white px-3 py-2 text-center text-base font-semibold tracking-[0.4em] tabular-nums text-ink outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={confirmEnrolment}
              disabled={code.length !== CODE_LENGTH}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-yellow hover:text-ink active:bg-brand-yellow-deep disabled:cursor-not-allowed disabled:opacity-40"
            >
              <BoIcon name="check" size={16} />
              {t('account.mfa_confirm')}
            </button>
            <button
              type="button"
              onClick={() => {
                setEnrolling(false)
                setCode('')
              }}
              className="rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-muted-foreground transition hover:text-ink"
            >
              {t('account.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEnrolling(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-brand-blue transition hover:border-brand-yellow hover:bg-cream hover:text-ink"
          >
            <BoIcon name="device" size={16} />
            {state.enabled ? t('account.mfa_rebind') : t('account.mfa_enable')}
          </button>
          {state.enabled && !mandatory && (
            <button
              type="button"
              onClick={disable}
              className="rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-muted-foreground transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              {t('account.mfa_disable')}
            </button>
          )}
        </div>
      )}

      {state.enabled && (
        <div className="mt-4 border-t border-line pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex flex-col">
              <span className="text-sm font-semibold text-ink">
                {t('account.mfa_recovery_title')}
              </span>
              <span className="text-xs text-muted-foreground">
                {t('account.mfa_recovery_left', { count: state.recoveryCodesLeft })}
              </span>
            </span>
            <button
              type="button"
              onClick={regenerate}
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-brand-blue transition hover:border-brand-yellow hover:bg-cream hover:text-ink"
            >
              {t('account.mfa_recovery_regenerate')}
            </button>
          </div>

          {recoveryCodes && (
            <div className="mt-3 rounded-lg bg-sky-soft p-3">
              <p className="text-xs text-muted-foreground">
                {t('account.mfa_recovery_note')}
              </p>
              <ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-sm text-ink">
                {recoveryCodes.map((recoveryCode) => (
                  <li key={recoveryCode} className="select-all tabular-nums">
                    {recoveryCode}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </section>
  )
}
