'use client'

import { useTranslations } from 'next-intl'
import type { CertificateRule, CourseOptions } from '@/lib/backoffice/types'

const CERTIFICATE_RULES: CertificateRule[] = ['automatic', 'exam_required']

const fieldClass =
  'rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15'

const labelClass =
  'text-xs font-medium uppercase tracking-wide text-muted-foreground'

/**
 * The configurable half of a course, shared by the create form and the options
 * sheet. One component on purpose: whoever opens a course sets these, and
 * coordination changes them later — if the two screens drifted, a course would
 * be created with a field the sheet cannot reach, or the other way round.
 */
export function CourseOptionFields({
  value,
  onChange,
}: {
  value: CourseOptions
  onChange: (options: CourseOptions) => void
}) {
  const t = useTranslations('bo')

  function set<K extends keyof CourseOptions>(key: K, next: CourseOptions[K]) {
    onChange({ ...value, [key]: next })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Three across where there is room, two in the sheet — the sheet caps at
          `sm`, so the `lg` step only ever fires inside the wide create form. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className={labelClass}>{t('course_options.min_age')}</span>
          <input
            type="number"
            min={0}
            max={99}
            value={value.minAge}
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
            value={value.modules}
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
            value={value.totalHours}
            onChange={(event) => set('totalHours', Number(event.target.value))}
            className={`${fieldClass} tabular-nums`}
          />
        </label>

        {/* Full width: the rule names do not fit half a row, and a truncated
            one reads as a different rule. The hint carries the meaning the
            short label drops. */}
        <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
          <span className={labelClass}>{t('course_options.certificate_rule')}</span>
          <select
            value={value.certificateRule}
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
            {t(`certificate_rule_hint.${value.certificateRule}`)}
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
              checked={value[key]}
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
          checked={value.active}
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
    </div>
  )
}

/** What a course starts from before anyone touches it. */
export const DEFAULT_COURSE_OPTIONS: CourseOptions = {
  minAge: 13,
  modules: 4,
  totalHours: 80,
  certificateRule: 'automatic',
  allowsFreeze: true,
  allowsTransfer: false,
  active: true,
}
