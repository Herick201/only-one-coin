'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { NationalIdType, SignInMethod } from '@/lib/portal/auth-client'
import { HelpIcon, IdCardIcon, MailIcon } from './icons'

const NATIONAL_ID_TYPES: readonly NationalIdType[] = ['DNI', 'CE', 'passport']

export const fieldClass =
  'peer w-full rounded-2xl border border-line bg-sky-soft py-3 pl-11 pr-3 text-base font-normal text-ink outline-none transition placeholder:text-muted-foreground/70 focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-brand-blue/15'
export const adornClass =
  'pointer-events-none absolute left-3.5 text-muted-foreground transition peer-focus:text-brand-blue'

/**
 * Two doors to the same account: the e-mail the account was made with and the
 * document the student enrolled with. The document is what a student knows by
 * heart — the e-mail is personal (Gmail, `CLAUDE.md` §1), but whoever enrolled
 * months ago remembers the DNI before the account.
 *
 * Closed union, not a loose string: the screen never sends the server a
 * method it does not know (`CLAUDE.md` §4). Shared by the sign-in and the
 * forgot-password forms; the field is always `name="identifier"`.
 */
export function IdentifierFields({
  method,
  onMethodChange,
  nationalIdType,
  onNationalIdTypeChange,
}: {
  method: SignInMethod
  onMethodChange: (method: SignInMethod) => void
  nationalIdType: NationalIdType
  onNationalIdTypeChange: (type: NationalIdType) => void
}) {
  const t = useTranslations('login')
  const [hintOpen, setHintOpen] = useState(false)
  const byEmail = method === 'email'

  return (
    <>
      {/* Two buttons and not a <select>: two options, and what changes is the
          field right below — the switch has to be visible. */}
      <div
        role="group"
        aria-label={t('method_legend')}
        className="mb-5 grid grid-cols-2 gap-1 rounded-full border border-line bg-sky-soft p-1"
      >
        {/* eslint-disable-next-line i18next/no-literal-string --
            closed domain union (login method), rendered through `t()` below
            (`option === 'email' ? t(...) : t(...)`), never shown raw. */}
        {(['email', 'national_id'] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={method === option}
            onClick={() => {
              onMethodChange(option)
              setHintOpen(false)
            }}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              method === option ? 'bg-white text-ink shadow-card' : 'text-muted-foreground hover:text-ink'
            }`}
          >
            {option === 'email' ? t('method_email') : t('method_national_id')}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-5">
        {!byEmail && (
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            {t('national_id_type_label')}
            <select
              value={nationalIdType}
              onChange={(event) => onNationalIdTypeChange(event.target.value as NationalIdType)}
              className="w-full rounded-2xl border border-line bg-sky-soft px-3 py-3 text-base font-normal text-ink outline-none focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-brand-blue/15"
            >
              {NATIONAL_ID_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`national_id_type_${type}`)}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
          <span className="flex items-center gap-1.5">
            {byEmail ? t('email_label') : t('national_id_label')}
            {/* A button and not a tooltip: the audience is on phones, and a
                tooltip does not open on touch. */}
            {!byEmail && (
              <button
                type="button"
                onClick={() => setHintOpen((v) => !v)}
                aria-expanded={hintOpen}
                aria-controls="national-id-hint"
                aria-label={t('national_id_hint_label')}
                className={`grid h-5 w-5 place-items-center rounded-full border transition ${
                  hintOpen
                    ? 'border-brand-blue bg-brand-blue text-white'
                    : 'border-line bg-sky text-muted-foreground hover:border-brand-blue hover:text-brand-blue'
                }`}
              >
                <HelpIcon size={13} />
              </button>
            )}
          </span>
          <span className="relative flex items-center">
            <input
              // `key` forces a fresh field on each switch: without it React
              // reuses the input and the typed e-mail reappears in the
              // document field (and goes along on submit).
              key={method}
              type={byEmail ? 'email' : 'text'}
              name="identifier"
              inputMode={byEmail ? 'email' : nationalIdType === 'DNI' ? 'numeric' : 'text'}
              autoComplete={byEmail ? 'email' : 'username'}
              required
              placeholder={byEmail ? t('email_placeholder') : t('national_id_placeholder')}
              className={fieldClass}
            />
            {byEmail ? (
              <MailIcon size={18} className={adornClass} />
            ) : (
              <IdCardIcon size={18} className={adornClass} />
            )}
          </span>
          {!byEmail && hintOpen && (
            <span
              id="national-id-hint"
              className="rounded-2xl bg-sky px-3.5 py-2.5 text-xs font-normal leading-relaxed text-muted-foreground"
            >
              {t('national_id_hint')}
            </span>
          )}
        </label>
      </div>
    </>
  )
}
