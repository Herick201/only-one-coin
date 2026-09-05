import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getPortalSession } from '@/lib/portal/mock-data'
import { formatDate } from '@/lib/portal/format'
import type { Locale } from '@/lib/portal/types'
import {
  Card,
  EmptyState,
  PageHeader,
  ProgressBar,
  StatusBadge,
} from '@/components/portal/ui'
import { enrollmentTone } from '@/components/portal/status-tone'
import { Icon } from '@/components/portal/icons'
import { AutoGrid } from '@/components/layout/auto-grid'

/**
 * Course cards, kept to what the student acts on: name, schedule, progress
 * and the way in. Active is the normal state and earns no badge; teacher,
 * seats and material counts live in the detail, not here.
 */
export default async function CoursesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = raw as Locale
  setRequestLocale(raw)
  const t = await getTranslations('portal')

  const { enrollments } = getPortalSession()

  return (
    <div>
      <PageHeader title={t('courses.title')} />

      {enrollments.length === 0 ? (
        <EmptyState
          title={t('courses.empty_title')}
          body={t('courses.empty_body')}
          icon={<Icon name="courses" size={24} />}
        />
      ) : (
        <AutoGrid as="ul" min="18rem">
          {enrollments.map((e) => {
            const schedule = e.classGroup.schedule
              .map(
                (s) =>
                  `${t(`weekday_short.${s.weekday}`)} ${s.startTime}–${s.endTime}`,
              )
              .join(' · ')
            return (
              <Card key={e.id} as="li" className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold text-ink">
                    {e.course.name}
                  </h2>
                  {e.status !== 'active' &&
                    e.status !== 'under_review' &&
                    e.status !== 'completed' && (
                      <StatusBadge
                        tone={enrollmentTone[e.status]}
                        label={t(`enrollment_status.${e.status}`)}
                      />
                    )}
                </div>

                {e.classAccessLock !== null && (
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
                    <Icon name="lock" size={13} className="shrink-0" />
                    {t(`access_lock.${e.classAccessLock}`)}
                  </p>
                )}

                <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="shrink-0 text-brand-blue">
                      <Icon name="clock" size={15} />
                    </span>
                    {schedule}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="shrink-0 text-brand-blue">
                      <Icon name="calendar" size={15} />
                    </span>
                    {t('courses.starts_on', {
                      date: formatDate(e.classGroup.startDate, locale),
                    })}
                  </li>
                </ul>

                {e.status === 'under_review' ? (
                  <div className="flex flex-col gap-1.5">
                    <ProgressBar
                      value={100}
                      tone="warning"
                      locked
                      label={t('courses.progress_label')}
                    />
                    {/* The state lives with the bar, not as a badge upstairs. */}
                    <p className="flex items-center gap-1.5 text-xs font-medium text-brand-yellow-deep">
                      <Icon name="clock" size={13} className="shrink-0" />
                      {t('enrollment_status.under_review')}
                    </p>
                  </div>
                ) : e.status === 'completed' ? (
                  <div className="flex flex-col gap-1.5">
                    <ProgressBar
                      value={100}
                      tone="success"
                      label={t('courses.progress_label')}
                    />
                    <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                      <Icon name="check" size={13} className="shrink-0" />
                      {t('enrollment_status.completed')}
                    </p>
                  </div>
                ) : (
                  e.progressPct !== null && (
                    <ProgressBar
                      value={e.progressPct}
                      tone={e.classAccessLock !== null ? 'danger' : 'default'}
                      locked={e.classAccessLock !== null}
                      label={t('courses.progress_label')}
                    />
                  )
                )}

                <Link
                  href={`/portal/courses/${e.id}`}
                  className="mt-auto inline-flex items-center gap-1.5 self-start rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-brand-yellow hover:text-ink"
                >
                  {t('common.view_detail')}
                  <Icon name="arrow-right" size={16} />
                </Link>
              </Card>
            )
          })}
        </AutoGrid>
      )}
    </div>
  )
}
