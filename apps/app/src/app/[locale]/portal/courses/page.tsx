import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getPortalSession } from '@/lib/portal/mock-data'
import { formatDateNumeric } from '@/lib/portal/format'
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

/**
 * Course list, one row per enrollment. Every row says the same four things in
 * the same place — name, when it runs, how far along, where to go — so the eye
 * reads down a column instead of re-parsing each row.
 *
 * What was cut, and why: the "Progresso" caption (the bar is the caption), the
 * clock and calendar icons (two decorations for one line of text), the repeated
 * "Ver detalhe" button (the whole row is the link), the second copy of a
 * repeated class time (Mon and Wed at 18:00 is one time, not two) and the
 * spelled-out lock warning — the red bar and its padlock already say it, and
 * the reason waits in the course's own screen.
 *
 * The row is `flex-wrap`, never a breakpoint grid: it breaks when the column it
 * got is actually too narrow, which is the only thing it can see (CLAUDE.md §5).
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
        <Card>
          <ul className="divide-y divide-line">
            {enrollments.map((e) => {
              // Days that share a time are one entry: "Lun · Mié 18:00–19:30".
              const slots: { time: string; days: string[] }[] = []
              for (const s of e.classGroup.schedule) {
                const time = `${s.startTime}–${s.endTime}`
                const day = t(`weekday_short.${s.weekday}`)
                const last = slots.find((slot) => slot.time === time)
                if (last) last.days.push(day)
                else slots.push({ time, days: [day] })
              }
              const schedule = slots
                .map((slot) => `${slot.days.join(' · ')} ${slot.time}`)
                .join(' · ')

              return (
                <li key={e.id}>
                  <Link
                    href={`/portal/courses/${e.id}`}
                    className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 transition hover:bg-sky-soft"
                  >
                    <div className="min-w-0 flex-1 basis-72">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <h2 className="text-base font-semibold text-ink">
                          {e.course.name}
                        </h2>
                        {e.status !== 'active' && (
                          <StatusBadge
                            tone={enrollmentTone[e.status]}
                            label={t(`enrollment_status.${e.status}`)}
                          />
                        )}
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {schedule}
                        {' · '}
                        {t('courses.starts_on', {
                          date: formatDateNumeric(e.classGroup.startDate, locale),
                        })}
                      </p>

                    </div>

                    {/* No progress to draw while the enrollment is under review;
                        the badge by the name already carries that state. */}
                    {e.progressPct !== null && (
                      <div className="flex max-w-56 grow basis-40 items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <ProgressBar
                            value={e.status === 'completed' ? 100 : e.progressPct}
                            tone={
                              e.status === 'completed'
                                ? 'success'
                                : e.classAccessLock !== null
                                  ? 'danger'
                                  : 'default'
                            }
                          />
                        </div>
                        <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-muted-foreground">
                          {e.classAccessLock !== null ? (
                            <Icon
                              name="lock"
                              size={13}
                              className="ml-auto text-red-600"
                            />
                          ) : (
                            `${e.status === 'completed' ? 100 : e.progressPct}%`
                          )}
                        </span>
                      </div>
                    )}

                    <span className="shrink-0 text-muted-foreground">
                      <Icon name="chevron-right" size={18} />
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
