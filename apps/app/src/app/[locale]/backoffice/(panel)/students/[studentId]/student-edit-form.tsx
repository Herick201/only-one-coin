'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { NationalIdType } from '@/lib/backoffice/types'
import { BoIcon } from '@/components/backoffice/icons'

export interface EditableStudent {
  firstName: string
  lastName: string
  nationalIdType: NationalIdType
  nationalId: string
  email: string
  phone: string
  birthDate: string
  city: string
}

const ID_TYPES: NationalIdType[] = ['DNI', 'CE', 'passport']

/**
 * Edit form for the student's own data. Frontend stub: `onSave` only lifts the
 * value into local state — the real write is a dedicated usecase in `apps/api`
 * (the browser never talks to the database, CLAUDE.md §8) and lands in the
 * append-only audit log.
 */
export function StudentEditForm({
  value,
  onSave,
  onCancel,
}: {
  value: EditableStudent
  onSave: (next: EditableStudent) => void
  onCancel: () => void
}) {
  const t = useTranslations('bo')
  const [draft, setDraft] = useState<EditableStudent>(value)
  const [pending, setPending] = useState(false)

  function set<K extends keyof EditableStudent>(key: K, next: EditableStudent[K]) {
    setDraft((prev) => ({ ...prev, [key]: next }))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    // Mock only: fake a round-trip so the pending state is exercisable.
    setPending(true)
    window.setTimeout(() => {
      setPending(false)
      onSave(draft)
    }, 500)
  }

  const fieldClass =
    'rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted-foreground focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15'
  const labelClass = 'flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className={labelClass}>
          {t('student_file.field_first_name')}
          <input
            className={fieldClass}
            value={draft.firstName}
            onChange={(e) => set('firstName', e.target.value)}
            required
          />
        </label>
        <label className={labelClass}>
          {t('student_file.field_last_name')}
          <input
            className={fieldClass}
            value={draft.lastName}
            onChange={(e) => set('lastName', e.target.value)}
            required
          />
        </label>
        <label className={labelClass}>
          {t('student_file.field_id_type')}
          <select
            className={fieldClass}
            value={draft.nationalIdType}
            onChange={(e) => set('nationalIdType', e.target.value as NationalIdType)}
          >
            {ID_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`national_id_type.${type}`)}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          {t('student_file.field_id_number')}
          <input
            className={`${fieldClass} tabular-nums`}
            value={draft.nationalId}
            onChange={(e) => set('nationalId', e.target.value)}
            required
          />
        </label>
        <label className={labelClass}>
          {t('student_file.field_email')}
          <input
            type="email"
            className={fieldClass}
            value={draft.email}
            onChange={(e) => set('email', e.target.value)}
            required
          />
        </label>
        <label className={labelClass}>
          {t('student_file.field_phone')}
          <input
            type="tel"
            className={fieldClass}
            value={draft.phone}
            onChange={(e) => set('phone', e.target.value)}
            required
          />
        </label>
        <label className={labelClass}>
          {t('student_file.field_birth_date')}
          <input
            type="date"
            className={fieldClass}
            value={draft.birthDate}
            onChange={(e) => set('birthDate', e.target.value)}
            required
          />
        </label>
        <label className={labelClass}>
          {t('student_file.field_city')}
          <input
            className={fieldClass}
            value={draft.city}
            onChange={(e) => set('city', e.target.value)}
            required
          />
        </label>
      </div>

      <p className="flex items-start gap-2 rounded-lg border border-dashed border-line bg-sky-soft px-3 py-2 text-xs text-muted-foreground">
        <BoIcon name="shield" size={14} className="mt-0.5 shrink-0" />
        {t('student_file.edit_audit_notice')}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          <BoIcon name="check" size={16} />
          {pending ? t('student_file.saving') : t('student_file.save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-sky disabled:opacity-60"
        >
          <BoIcon name="close" size={16} />
          {t('student_file.cancel')}
        </button>
      </div>
    </form>
  )
}
