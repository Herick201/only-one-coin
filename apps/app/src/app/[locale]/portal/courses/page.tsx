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
      <PageHeader title={t('courses.title')} subtitle={t('courses.subtitle')} />

      {enrollments.length === 0 ? (
        <EmptyState
          title={t('courses.empty_title')}
          body={t('courses.empty_body')}
          icon={<Icon name="courses" size={24} />}
        />
      ) : (
        <ul className="grid gap-4">
          {enrollments.map((e) => {
            const weekdays = e.classGroup.schedule
              .map((s) => t(`weekday_short.${s.weekday}`))
              .join(' · ')
            const firstSlot = e.classGroup.schedule[0]
            return (
              <Card key={e.id} as="li" className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-ink">
                        {e.course.name}
                      </h2>
                      <StatusBadge
                        tone={enrollmentTone[e.status]}
                        label={t(`enrollment_status.${e.status}`)}
                      />
                      <span className="rounded-full bg-sky px-2 py-0.5 text-[11px] font-semibold text-brand-blue-deep">
                        {t(`modality.${e.classGroup.modality}`)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {e.classGroup.name}
                    </p>

                    <AutoGrid as="dl" min="9rem" gap="gap-x-6 gap-y-3" className="mt-4 max-w-md text-sm">
                      <div>
                        <dt className="text-xs font-medium text-muted-foreground">
                          {t('common.teacher')}
                        </dt>
                        <dd className="font-medium text-ink">
                          {e.classGroup.teacherName}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-muted-foreground">
                          {t('common.schedule')}
                        </dt>
                        <dd className="font-medium text-ink">
                          {weekdays}
                          {firstSlot ? ` — ${firstSlot.startTime}` : ''}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-muted-foreground">
                          {t('common.starts')}
                        </dt>
                        <dd className="font-medium text-ink">
                          {formatDate(e.classGroup.startDate, locale)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-muted-foreground">
                          {t('courses.seats_label')}
                        </dt>
                        <dd className="font-medium text-ink">
                          {t('courses.seats_value', {
                            taken: e.classGroup.seatsTaken,
                            capacity: e.classGroup.capacity,
                          })}
                        </dd>
                      </div>
                    </AutoGrid>

                    {e.progressPct !== null && (
                      <div className="mt-4 sm:max-w-md">
                        <ProgressBar
                          value={e.progressPct}
                          label={t('courses.progress_label')}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Icon name="doc" size={15} />
                      {t('courses.materials_count', {
                        count: e.course.materials.length,
                      })}
                    </span>
                    <Link
                      href={`/portal/courses/${e.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-brand-blue-deep"
                    >
                      {t('common.view_detail')}
                      <Icon name="arrow-right" size={16} />
                    </Link>
                  </div>
                </div>
              </Card>
            )
          })}
        </ul>
      )}
    </div>
  )
}
