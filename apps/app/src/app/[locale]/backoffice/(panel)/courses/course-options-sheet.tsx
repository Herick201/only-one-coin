'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import type {
  CertificateRule,
  CourseOptions,
  CourseRow,
} from '@/lib/backoffice/types'
import { BoIcon } from '@/components/backoffice/icons'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

const CERTIFICATE_RULES: CertificateRule[] = ['automatic', 'exam_required']

const fieldClass =
  'rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15'

const labelClass =
  'text-xs font-medium uppercase tracking-wide text-muted-foreground'

/**
 * Course options — what coordination may change on a course that already
 * exists. The name and the language are not here: renaming a course after
 * class groups hang off it rewrites what students enrolled in, and that
 * belongs to whoever may create one.
 *
 * Price is absent for the same reason it is absent from the course type: it is
 * versioned and never edited, and the enrollment freezes the version in force
 * (CLAUDE.md §5).
 */
export function CourseOptionsSheet({
  course,
  onClose,
  onSave,
}: {
  course: CourseRow | null
  onClose: () => void
  onSave: (course: CourseRow, options: CourseOptions) => void
}) {
  const t = useTranslations('bo')
  const [draft, setDraft] = useState<CourseOptions | null>(null)

  // The draft follows whichever course the sheet was opened on, and is thrown
  // away on close — a half-edited course must not leak into the next one.
  useEffect(() => {
    setDraft(
      course && {
        minAge: course.minAge,
        modules: course.modules,
        totalHours: course.totalHours,
        certificateRule: course.certificateRule,
        allowsFreeze: course.allowsFreeze,
        allowsTransfer: course.allowsTransfer,
        active: course.active,
      },
    )
  }, [course])

  function set<K extends keyof CourseOptions>(key: K, value: CourseOptions[K]) {
    setDraft((current) => current && { ...current, [key]: value })
  }

  return (
    <Sheet
      open={course !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent
        side="right"
        closeLabel={t('course_options.close')}
        className="w-full gap-0 overflow-y-auto bg-white p-0 sm:max-w-md"
      >
        {course && draft && (
          <>
            <SheetHeader className="gap-2 border-b border-line p-5 pr-14">
              <SheetTitle className="text-base font-semibold text-ink">
                {course.name}
              </SheetTitle>
              <SheetDescription>
                {t('course_options.subtitle', { language: course.language.name })}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-4 p-5">
              <p className="flex items-start gap-2 rounded-lg border border-dashed border-line bg-sky-soft px-3 py-2 text-xs text-muted-foreground">
                <BoIcon name="alert" size={14} className="mt-0.5 shrink-0" />
                {t('course_options.applies_forward')}
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>{t('course_options.min_age')}</span>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={draft.minAge}
                    onChange={(event) => set('minAge', Number(event.target.value))}
                    className={`${fieldClass} tabular-nums`}
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className={labelClass}>{t('course_options.modules')}</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={draft.modules}
                    onChange={(event) => set('modules', Number(event.target.value))}
                    className={`${fieldClass} tabular-nums`}
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className={labelClass}>{t('course_options.total_hours')}</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={draft.totalHours}
                    onChange={(event) => set('totalHours', Number(event.target.value))}
                    className={`${fieldClass} tabular-nums`}
                  />
                </label>

                {/* Full width: the rule names do not fit half a row, and a
                    truncated one reads as a different rule. The hint below
                    carries the meaning the short label drops. */}
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className={labelClass}>
                    {t('course_options.certificate_rule')}
                  </span>
                  <select
                    value={draft.certificateRule}
                    onChange={(event) =>
                      set('certificateRule', event.target.value as CertificateRule)
                    }
                    className={fieldClass}
                  >
                    {CERTIFICATE_RULES.map((rule) => (
                      <option key={rule} value={rule}>
                        {t(`certificate_rule.${rule}`)}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-muted-foreground">
                    {t(`certificate_rule_hint.${draft.certificateRule}`)}
                  </span>
                </label>
              </div>

              <fieldset className="flex flex-col gap-2.5">
                <legend className={`mb-1 ${labelClass}`}>
                  {t('course_options.procedures')}
                </legend>
                {(
                  [
                    ['allowsTransfer', 'course_options.allows_transfer'],
                    ['allowsFreeze', 'course_options.allows_freeze'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-start gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={draft[key]}
                      onChange={(event) => set(key, event.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-brand-blue"
                    />
                    {t(label)}
                  </label>
                ))}
              </fieldset>

              <label className="flex items-start gap-2 border-t border-line pt-4 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(event) => set('active', event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-brand-blue"
                />
                <span className="flex flex-col gap-0.5">
                  {t('course_options.active')}
                  <span className="text-xs text-muted-foreground">
                    {t('course_options.active_hint')}
                  </span>
                </span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSave(course, draft)
                    onClose()
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-deep"
                >
                  <BoIcon name="check" size={16} />
                  {t('course_options.save')}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-muted-foreground transition hover:text-ink"
                >
                  {t('course_options.cancel')}
                </button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
