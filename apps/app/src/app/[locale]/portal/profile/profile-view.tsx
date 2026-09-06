'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { Student } from '@/lib/portal/types'
import { formatDate, type Locale } from '@/lib/format'
import { Card, SectionTitle } from '@/components/portal/ui'
import { Icon } from '@/components/portal/icons'
import { AutoGrid } from '@/components/layout/auto-grid'

/**
 * Profile with two kinds of data on one screen, told apart visually:
 *
 * — self-service: the student's phone, plus optional extra contacts (another
 *   e-mail, another phone). Editable inputs, mock save.
 * — record: name, document, birth date, the class-access Gmail (CLAUDE.md §1)
 *   and everything about the guardian. Shown, but locked — a padlock marks
 *   each one, and correcting them is a coordination flow, never self-service.
 */

function LockedField({
  label,
  lockedHint,
  children,
}: {
  label: string
  lockedHint: string
  children: React.ReactNode
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
        <span title={lockedHint} className="text-muted-foreground/70">
          <Icon name="lock" size={12} />
        </span>
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-ink">{children}</dd>
    </div>
  )
}

function EditableField({
  id,
  label,
  value,
  placeholder,
  error,
  inputMode,
  onChange,
}: {
  id: string
  label: string
  value: string
  placeholder?: string
  error?: string | null
  inputMode?: 'tel' | 'email'
  onChange: (next: string) => void
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm font-medium text-ink outline-none transition focus:border-brand-blue ${
          error ? 'border-red-400' : 'border-line'
        }`}
      />
      {error && (
        <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-red-600">
          <Icon name="alert" size={13} />
          {error}
        </p>
      )}
    </div>
  )
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue transition hover:text-brand-blue-deep"
    >
      <Icon name="plus" size={15} />
      {label}
    </button>
  )
}

/** A revealed optional input with its own way back out. */
function RemovableField({
  removeLabel,
  onRemove,
  children,
}: {
  removeLabel: string
  onRemove: () => void
  children: React.ReactNode
}) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">{children}</div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        title={removeLabel}
        className="mb-1 shrink-0 rounded-lg p-2 text-muted-foreground transition hover:bg-red-50 hover:text-red-600"
      >
        <Icon name="trash" size={16} />
      </button>
    </div>
  )
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ProfileView({ student }: { student: Student }) {
  const t = useTranslations('portal')
  const locale = useLocale() as Locale
  const { guardian } = student

  // What the record currently holds — the baseline "dirty" is measured
  // against. Mock: saving just moves the baseline.
  const [baseline, setBaseline] = useState({
    phone: student.phone,
    secondaryEmail: student.secondaryEmail ?? '',
    secondaryPhone: student.secondaryPhone ?? '',
  })
  const [phone, setPhone] = useState(baseline.phone)
  const [secondaryEmail, setSecondaryEmail] = useState(baseline.secondaryEmail)
  const [secondaryPhone, setSecondaryPhone] = useState(baseline.secondaryPhone)
  const [showSecondaryEmail, setShowSecondaryEmail] = useState(
    baseline.secondaryEmail !== '',
  )
  const [showSecondaryPhone, setShowSecondaryPhone] = useState(
    baseline.secondaryPhone !== '',
  )
  const [touched, setTouched] = useState(false)
  const [saved, setSaved] = useState(false)

  const phoneError = phone.trim() === '' ? t('profile.error_phone') : null
  const emailError =
    secondaryEmail.trim() !== '' && !EMAIL_SHAPE.test(secondaryEmail.trim())
      ? t('profile.error_email')
      : null

  // Nothing changed → nothing to save; the record stays as it is.
  const dirty =
    phone !== baseline.phone ||
    secondaryEmail !== baseline.secondaryEmail ||
    secondaryPhone !== baseline.secondaryPhone

  function save() {
    if (!dirty) return
    setTouched(true)
    if (phoneError || emailError) {
      setSaved(false)
      return
    }
    // Mock save — in production this hits the profile usecase in apps/api.
    setBaseline({ phone, secondaryEmail, secondaryPhone })
    setTouched(false)
    setSaved(true)
  }

  function hideSecondary(kind: 'email' | 'phone') {
    if (kind === 'email') {
      setSecondaryEmail('')
      setShowSecondaryEmail(false)
    } else {
      setSecondaryPhone('')
      setShowSecondaryPhone(false)
    }
    setSaved(false)
  }

  const lockedHint = t('profile.locked_hint')

  return (
    <>
      <AutoGrid min="24rem" gap="gap-6">
        {/* Personal details */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <SectionTitle>{t('profile.personal_title')}</SectionTitle>
            {student.isMinor && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-yellow/15 px-2.5 py-1 text-xs font-semibold text-brand-yellow-deep ring-1 ring-inset ring-brand-yellow-deep/20">
                <Icon name="shield" size={14} />
                {t('profile.minor_badge')}
              </span>
            )}
          </div>

          <AutoGrid as="dl" min="13rem" className="mt-4">
            <LockedField label={t('profile.full_name')} lockedHint={lockedHint}>
              {student.firstName} {student.lastName}
            </LockedField>
            <LockedField label={t('profile.id_label')} lockedHint={lockedHint}>
              {student.nationalIdType} {student.nationalId}
            </LockedField>
            <LockedField label={t('profile.email_label')} lockedHint={lockedHint}>
              {student.email}
            </LockedField>
            <LockedField
              label={t('profile.birth_date_label')}
              lockedHint={lockedHint}
            >
              {formatDate(student.birthDate, locale)}
            </LockedField>
          </AutoGrid>

          {/* Self-service contacts: the extras stay behind a "+ add" until
              they are wanted — an empty optional input is just noise. */}
          <div className="mt-5 flex flex-col gap-4 border-t border-line pt-4">
            <div>
              <EditableField
                id="profile-phone"
                label={t('profile.phone_label')}
                value={phone}
                inputMode="tel"
                error={touched ? phoneError : null}
                onChange={(next) => {
                  setPhone(next)
                  setSaved(false)
                }}
              />
              {!showSecondaryPhone && (
                <AddButton
                  label={t('profile.add_secondary_phone')}
                  onClick={() => setShowSecondaryPhone(true)}
                />
              )}
            </div>

            {showSecondaryPhone && (
              <RemovableField
                removeLabel={t('profile.remove_secondary')}
                onRemove={() => hideSecondary('phone')}
              >
                <EditableField
                  id="profile-secondary-phone"
                  label={t('profile.secondary_phone_label')}
                  value={secondaryPhone}
                  inputMode="tel"
                  onChange={(next) => {
                    setSecondaryPhone(next)
                    setSaved(false)
                  }}
                />
              </RemovableField>
            )}

            {showSecondaryEmail ? (
              <RemovableField
                removeLabel={t('profile.remove_secondary')}
                onRemove={() => hideSecondary('email')}
              >
                <EditableField
                  id="profile-secondary-email"
                  label={t('profile.secondary_email_label')}
                  value={secondaryEmail}
                  inputMode="email"
                  error={touched ? emailError : null}
                  onChange={(next) => {
                    setSecondaryEmail(next)
                    setSaved(false)
                  }}
                />
              </RemovableField>
            ) : (
              <AddButton
                label={t('profile.add_secondary_email')}
                onClick={() => setShowSecondaryEmail(true)}
              />
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={save}
                disabled={!dirty}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold shadow-card transition ${
                  dirty
                    ? 'bg-brand-blue text-white hover:bg-brand-yellow hover:text-ink'
                    : 'cursor-not-allowed bg-sky text-muted-foreground shadow-none'
                }`}
              >
                <Icon name="check" size={16} />
                {t('profile.save')}
              </button>
              {saved && !dirty && (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                  <Icon name="check" size={15} />
                  {t('profile.saved_note')}
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Guardian — record only */}
        <Card className="p-5 sm:p-6">
          <SectionTitle>{t('profile.guardian_title')}</SectionTitle>
          {guardian ? (
            <>
              <AutoGrid as="dl" min="13rem" className="mt-4">
                <LockedField label={t('profile.full_name')} lockedHint={lockedHint}>
                  {guardian.firstName} {guardian.lastName}
                </LockedField>
                <LockedField
                  label={t('profile.relationship_label')}
                  lockedHint={lockedHint}
                >
                  {t(`relationship.${guardian.relationship}`)}
                </LockedField>
                <LockedField label={t('profile.id_label')} lockedHint={lockedHint}>
                  {guardian.nationalIdType} {guardian.nationalId}
                </LockedField>
                <LockedField label={t('profile.email_label')} lockedHint={lockedHint}>
                  {guardian.email}
                </LockedField>
                <LockedField label={t('profile.phone_label')} lockedHint={lockedHint}>
                  {guardian.phone}
                </LockedField>
              </AutoGrid>

              <div className="mt-5 rounded-xl bg-sky-soft p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <span className="text-brand-blue">
                    <Icon name="shield" size={18} />
                  </span>
                  {t('profile.consent_title')}
                </div>
                {guardian.consent ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {t('profile.consent_accepted', {
                      date: formatDate(guardian.consent.acceptedAt, locale),
                    })}{' '}
                    ·{' '}
                    {t('profile.consent_version', {
                      version: guardian.consent.version,
                    })}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {t('profile.consent_none')}
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              {t('profile.guardian_none')}
            </p>
          )}
        </Card>
      </AutoGrid>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <Icon name="lock" size={13} />
        {t('profile.edit_note')}
      </p>
    </>
  )
}
