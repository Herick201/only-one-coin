'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type {
  AvailabilitySlot,
  CourseLanguage,
  TeacherRow,
} from '@/lib/backoffice/types'
import { COUNTRIES, countryName, DEFAULT_COUNTRY, flagEmoji } from '@/lib/geo'
import { Card } from '@/components/backoffice/ui'
import { BoIcon } from '@/components/backoffice/icons'
import { AvailabilityFields, slotsAreValid } from './availability-fields'
import { AutoGrid } from '@/components/layout/auto-grid'

const fieldClass =
  'rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15'

const labelClass =
  'text-xs font-medium uppercase tracking-wide text-muted-foreground'

/**
 * Registering a teacher: who they are, how to reach them, what they can teach
 * and when they are free (`docs/REQUISITOS.md` RF03).
 *
 * Availability is filled in here rather than left for later because it is the
 * whole reason the record exists on the day it is created — a teacher on the
 * roster with no windows cannot be allocated to anything, so the class group
 * that prompted the hire still has nobody to run it.
 *
 * Screen-local, like the course and class group forms: the real write is a
 * usecase in `packages/domain` behind `apps/api`, never the browser
 * (CLAUDE.md §8). Creating the *login* for this teacher is a separate,
 * admin-only usecase with fresh re-authentication (CLAUDE.md §8) — not this
 * form.
 */
export function NewTeacherForm({
  languages,
  onCancel,
  onCreate,
}: {
  languages: CourseLanguage[]
  onCancel: () => void
  onCreate: (teacher: TeacherRow) => void
}) {
  const t = useTranslations('bo')
  const locale = useLocale()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [nationality, setNationality] = useState(DEFAULT_COUNTRY)
  const [languageIds, setLanguageIds] = useState<string[]>([])
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([])

  const ready =
    firstName.trim() !== '' &&
    lastName.trim() !== '' &&
    email.trim() !== '' &&
    languageIds.length > 0 &&
    slotsAreValid(availability)

  function toggleLanguage(id: string) {
    setLanguageIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  function submit() {
    onCreate({
      id: `tea_local_${email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      status: 'active',
      languages: languages.filter((item) => languageIds.includes(item.id)),
      nationality,
      // Everything countable comes from the class groups, and a teacher created
      // a second ago runs none.
      activeClassGroups: 0,
      studentCount: 0,
      pendingGrades: 0,
      pendingCertificates: 0,
      joinedAt: new Date().toISOString().slice(0, 10),
    })
  }

  return (
    <Card className="p-5">
      <p className="mb-4 text-sm font-semibold text-ink">{t('teachers.new_title')}</p>

      <AutoGrid min="15rem" gap="gap-3">
        <label className="flex flex-col gap-1">
          <span className={labelClass}>{t('teachers.field_first_name')}</span>
          <input
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className={fieldClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>{t('teachers.field_last_name')}</span>
          <input
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className={fieldClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>{t('teachers.field_nationality')}</span>
          <select
            value={nationality}
            onChange={(event) => setNationality(event.target.value)}
            className={fieldClass}
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {`${flagEmoji(country.code)} ${countryName(country.code, locale)}`}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>{t('teachers.field_email')}</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={fieldClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>{t('teachers.field_phone')}</span>
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={fieldClass}
          />
        </label>
      </AutoGrid>

      <div className="mt-5 border-t border-line pt-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('teachers.field_languages')}
        </p>
        <p className="mb-3 text-xs text-muted-foreground">
          {t('teachers.languages_hint')}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {languages.map((language) => {
            const active = languageIds.includes(language.id)
            return (
              <button
                key={language.id}
                type="button"
                onClick={() => toggleLanguage(language.id)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-brand-blue text-white'
                    : 'border border-line bg-white text-muted-foreground hover:bg-cream hover:text-ink'
                }`}
              >
                {active && <BoIcon name="check" size={13} />}
                {language.name}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-5 border-t border-line pt-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('availability.title')}
        </p>
        <p className="mb-3 text-xs text-muted-foreground">{t('availability.hint')}</p>
        <AvailabilityFields value={availability} onChange={setAvailability} />
      </div>

      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          disabled={!ready}
          onClick={submit}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-deep disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brand-blue"
        >
          <BoIcon name="check" size={16} />
          {t('teachers.create')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-muted-foreground transition hover:text-ink"
        >
          {t('teachers.cancel')}
        </button>
      </div>
    </Card>
  )
}
