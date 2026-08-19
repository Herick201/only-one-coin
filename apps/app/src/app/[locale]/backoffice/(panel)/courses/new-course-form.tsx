'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { CourseLanguage, CourseRow } from '@/lib/backoffice/types'
import { Card } from '@/components/backoffice/ui'
import { BoIcon } from '@/components/backoffice/icons'

const fieldClass =
  'rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15'

const labelClass =
  'text-xs font-medium uppercase tracking-wide text-muted-foreground'

/**
 * Opening a course: name, language and level only. Everything else — hours,
 * minimum age, procedures, certificate rule — is configuration, and lives in
 * the options sheet where coordination can reach it without an admin.
 *
 * Screen-local, like the class group form: the real write is a usecase in
 * `packages/domain` behind `apps/api`, never the browser (CLAUDE.md §8).
 */
export function NewCourseForm({
  languages,
  onCancel,
  onCreate,
}: {
  languages: CourseLanguage[]
  onCancel: () => void
  onCreate: (course: CourseRow) => void
}) {
  const t = useTranslations('bo')

  const [name, setName] = useState('')
  const [languageId, setLanguageId] = useState(languages[0]?.id ?? '')
  const [level, setLevel] = useState('')

  const ready = name.trim() !== '' && level.trim() !== '' && languageId !== ''

  function submit() {
    const language = languages.find((item) => item.id === languageId)
    if (!language) return
    onCreate({
      id: `crs_local_${name.trim().toLowerCase().replace(/\s+/g, '_')}`,
      name: name.trim(),
      language,
      level: level.trim(),
      // Defaults a coordinator can then adjust in the options sheet.
      minAge: 13,
      modules: 4,
      totalHours: 80,
      certificateRule: 'automatic',
      allowsFreeze: true,
      allowsTransfer: false,
      active: true,
      classGroupCount: 0,
    })
  }

  return (
    <Card className="p-5">
      <p className="mb-4 text-sm font-semibold text-ink">{t('courses.new_title')}</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className={labelClass}>{t('courses.field_language')}</span>
          <select
            value={languageId}
            onChange={(event) => setLanguageId(event.target.value)}
            className={fieldClass}
          >
            {languages.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>{t('courses.field_name')}</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('courses.name_placeholder')}
            className={fieldClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>{t('courses.field_level')}</span>
          <input
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            placeholder={t('courses.level_placeholder')}
            className={fieldClass}
          />
        </label>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{t('courses.defaults_hint')}</p>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          disabled={!ready}
          onClick={submit}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-deep disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brand-blue"
        >
          <BoIcon name="check" size={16} />
          {t('courses.create')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-muted-foreground transition hover:text-ink"
        >
          {t('courses.cancel')}
        </button>
      </div>
    </Card>
  )
}
