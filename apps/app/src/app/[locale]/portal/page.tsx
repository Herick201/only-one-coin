import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getPortalSession } from '@/lib/portal/mock-data'
import { formatDateTime } from '@/lib/portal/format'
import type { Locale, NotificationKind } from '@/lib/portal/types'
import { Card, ProgressBar, SectionTitle, StatusBadge } from '@/components/portal/ui'
import { enrollmentTone } from '@/components/portal/status-tone'
import { Icon, type IconName } from '@/components/portal/icons'
import { AutoGrid } from '@/components/layout/auto-grid'

/** Where each kind of notice sends the reader, and how it looks on the way. */
const noticeMeta: Record<
  NotificationKind,
  { icon: IconName; href: string; tone: 'warning' | 'info' | 'success' }
> = {
  monthly_payment_due: { icon: 'lock', href: '/portal/payments', tone: 'warning' },
  next_level_invite: { icon: 'star', href: '/portal/continue', tone: 'info' },
  document_ready: { icon: 'documents', href: '/portal/documents', tone: 'success' },
}

const noticeStyles = {
  warning: 'border-brand-yellow-deep/25 bg-brand-yellow/10',
  info: 'border-brand-blue/20 bg-sky',
  success: 'border-emerald-600/20 bg-emerald-50',
} as const

const noticeIconStyles = {
  warning: 'text-brand-yellow-deep',
  info: 'text-brand-blue',
  success: 'text-emerald-700',
} as const

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = raw as Locale
  setRequestLocale(raw)
  const t = await getTranslations('portal')

  const { student, enrollments, nextClass, notifications } = getPortalSession()
  const current = enrollments.filter((e) => e.status !== 'completed')
  const hasUnderReview = enrollments.some((e) => e.status === 'under_review')

  const quickActions: { href: string; label: string; icon: IconName }[] = [
    { href: '/portal/payments', label: t('dashboard.action_payments'), icon: 'card' },
    { href: '/portal/requests', label: t('dashboard.action_requests'), icon: 'clipboard' },
    { href: '/portal/documents', label: t('dashboard.action_documents'), icon: 'documents' },
    { href: '/portal/profile', label: t('dashboard.action_profile'), icon: 'profile' },
  ]

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {t('greeting.hello', { name: student.firstName })}
        </h1>
      </header>

      {/* Next class — first thing on the page, and the one block in brand
          yellow: everything else on screen is blue, so the bar the student
          actually clicks to attend is the one that looks different. */}
      <section className="-mt-2">
        <div className="mb-3">
          <SectionTitle>{t('next_class.title')}</SectionTitle>
        </div>
        {nextClass ? (
          <Card className="overflow-hidden border-brand-yellow-deep/30">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-brand-yellow p-5 text-ink sm:p-6">
              <div className="flex flex-col gap-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/70">
                  <Icon name="calendar" size={16} />
                  {formatDateTime(nextClass.startsAt, locale)}
                </span>
                <span className="text-xl font-semibold">
                  {nextClass.courseName}
                </span>
                <span className="text-sm text-ink/80">
                  {nextClass.classGroupName}
                </span>
                <span className="text-sm text-ink/60">
                  {t('next_class.with_teacher', { teacher: nextClass.teacherName })}
                </span>
              </div>
              {nextClass.classAccessLock !== null ? (
                <Link
                  href="/portal/payments"
                  className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink/10 px-4 py-2 text-xs font-semibold text-ink transition hover:bg-ink/20"
                >
                  <Icon name="lock" size={16} />
                  {t('next_class.locked')}
                </Link>
              ) : nextClass.meetingUrl ? (
                <a
                  href={nextClass.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white shadow-card transition hover:bg-brand-blue-deep"
                >
                  <Icon name="video" size={18} />
                  {t('next_class.join')}
                </a>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white/50 px-4 py-2 text-xs font-semibold text-ink/80">
                  <Icon name="clock" size={16} />
                  {t('next_class.no_link_yet')}
                </span>
              )}
            </div>
          </Card>
        ) : (
          <Card className="flex flex-col items-start gap-1 p-6">
            <p className="text-base font-semibold text-ink">
              {t('next_class.none_title')}
            </p>
            <p className="text-sm text-muted-foreground">{t('next_class.none_body')}</p>
          </Card>
        )}
      </section>

      {/* Notices — the portal side of the reminder e-mails (CLAUDE.md §1). */}
      {notifications.length > 0 && (
        <section className="flex flex-col gap-3">
          {notifications.map((n) => {
            const meta = noticeMeta[n.kind]
            return (
              <Link
                key={n.id}
                href={meta.href}
                className={`group flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm text-ink transition hover:brightness-[0.98] ${noticeStyles[meta.tone]}`}
              >
                <span className={`shrink-0 ${noticeIconStyles[meta.tone]}`}>
                  <Icon name={meta.icon} size={18} />
                </span>
                <span className="flex-1">
                  {t(`notice.${n.kind}`, { course: n.courseName ?? '' })}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-brand-blue">
                  {t(`notice_cta.${n.kind}`)}
                  <Icon name="chevron-right" size={14} />
                </span>
              </Link>
            )
          })}
        </section>
      )}

      {hasUnderReview && (
        <div className="-mt-4 flex items-start gap-3 rounded-2xl border border-brand-yellow-deep/25 bg-brand-yellow/10 px-4 py-3.5 text-sm text-ink">
          <span className="mt-0.5 text-brand-yellow-deep">
            <Icon name="clock" size={18} />
          </span>
          <p>{t('dashboard.review_note')}</p>
        </div>
      )}

      {/* My courses */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <SectionTitle>{t('dashboard.my_courses_title')}</SectionTitle>
          <Link
            href="/portal/courses"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-blue transition hover:text-brand-blue-deep"
          >
            {t('common.see_all')}
            <Icon name="chevron-right" size={16} />
          </Link>
        </div>
        <AutoGrid min="18rem">
          {current.map((e) => (
            <Card key={e.id} as="article" className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-ink">
                    {e.course.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {e.classGroup.teacherName}
                  </p>
                </div>
                <StatusBadge
                  tone={enrollmentTone[e.status]}
                  label={t(`enrollment_status.${e.status}`)}
                />
              </div>
              {e.classAccessLock !== null && (
                <p className="inline-flex items-center gap-1.5 self-start rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/15">
                  <Icon name="lock" size={13} />
                  {t(`access_lock.${e.classAccessLock}`)}
                </p>
              )}
              {e.progressPct !== null && (
                <ProgressBar
                  value={e.progressPct}
                  label={t('dashboard.progress_label')}
                />
              )}
              <Link
                href={`/portal/courses/${e.id}`}
                className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand-blue transition hover:text-brand-blue-deep"
              >
                {t('common.view_detail')}
                <Icon name="arrow-right" size={16} />
              </Link>
            </Card>
          ))}
        </AutoGrid>
      </section>

      {/* Quick actions */}
      <section>
        <div className="mb-3">
          <SectionTitle>{t('dashboard.quick_actions_title')}</SectionTitle>
        </div>
        <AutoGrid min="14rem" gap="gap-3">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-card transition hover:border-brand-blue/40 hover:bg-sky-soft"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky text-brand-blue transition group-hover:bg-brand-blue group-hover:text-white">
                <Icon name={a.icon} size={20} />
              </span>
              <span className="text-sm font-semibold text-ink">{a.label}</span>
              <Icon
                name="chevron-right"
                size={16}
                className="ml-auto text-muted-foreground"
              />
            </Link>
          ))}
        </AutoGrid>
      </section>
    </div>
  )
}
