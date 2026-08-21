'use client'

import { useLocale, useTranslations } from 'next-intl'
import type { CheckoutDraft, PublicCatalog } from '@/lib/enrollment/types'
import { courseById, groupById } from '@/lib/enrollment/checkout'
import { scheduleLine } from '@/lib/enrollment/schedule'
import { formatDate, type Locale } from '@/lib/format'
import { Card, Note, SummaryRow } from '@/components/enrollment/ui'
import { CheckoutIcon } from '@/components/enrollment/icons'

/**
 * The screen after submit.
 *
 * It is careful not to congratulate anybody on being enrolled. The seat is
 * `reserved`, the payment is waiting on the OCR ladder and a human may still
 * look at it (`CLAUDE.md` §5) — a page saying "¡Matrícula confirmada!" here is
 * a page that generates a support conversation the day one gets rejected.
 *
 * What it does instead is state the three things the reader actually needs:
 * what was received, what happens next, and when to expect the credentials.
 */
export function Submitted({
  catalog,
  draft,
  reference,
}: {
  catalog: PublicCatalog
  draft: CheckoutDraft
  /** Human-readable handle for the request. Not a technical id (`CLAUDE.md` §4). */
  reference: string
}) {
  const t = useTranslations('enrollment')
  const locale = useLocale() as Locale

  const course = courseById(catalog, draft.course.courseId)
  const group = groupById(catalog, draft.course.classGroupId)
  const notifyEmail = draft.guardian.consentAccepted
    ? draft.guardian.email
    : draft.student.email

  const steps = ['received', 'review', 'credentials'] as const

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-6 text-center sm:p-8">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-700">
          <CheckoutIcon name="check" size={28} />
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          {t('submitted.title')}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {t('submitted.subtitle', { email: notifyEmail })}
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky px-4 py-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('submitted.reference_label')}
          </span>
          <span className="font-mono text-sm font-bold text-ink">{reference}</span>
        </p>
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold text-ink">
          {t('submitted.what_now')}
        </p>
        <ol className="flex flex-col gap-4">
          {steps.map((step, i) => (
            <li key={step} className="flex gap-3">
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  i === 0
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-sky text-muted-foreground'
                }`}
              >
                {i === 0 ? <CheckoutIcon name="check" size={14} /> : i + 1}
              </span>
              <span className="flex min-w-0 flex-col leading-snug">
                <span className="text-sm font-semibold text-ink">
                  {t(`submitted.timeline.${step}.title`)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t(`submitted.timeline.${step}.body`, {
                    days: catalog.settings.reservationDays,
                  })}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </Card>

      {course && group && (
        <Card className="p-5">
          <p className="mb-2 text-sm font-semibold text-ink">
            {t('submitted.summary_label')}
          </p>
          <dl className="divide-y divide-line">
            <SummaryRow label={t('summary.course')}>{course.name}</SummaryRow>
            <SummaryRow label={t('summary.schedule')}>
              {scheduleLine(
                group,
                (day) => t(`weekday.${day}`),
                (vars) => t('schedule_line', vars),
              )}
            </SummaryRow>
            <SummaryRow label={t('summary.starts_on')}>
              {formatDate(group.startDate, locale)}
            </SummaryRow>
          </dl>
        </Card>
      )}

      {/* Every class is online (`CLAUDE.md` §1) — no address, no campus, and
          nothing that could read as one. */}
      <Note tone="info">{t('submitted.online_note')}</Note>
    </div>
  )
}
