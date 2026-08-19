import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getPortalSession } from '@/lib/portal/mock-data'
import { formatDateTime } from '@/lib/portal/format'
import type { Locale } from '@/lib/portal/types'
import { Card, ProgressBar, SectionTitle, StatusBadge } from '@/components/portal/ui'
import { enrollmentTone } from '@/components/portal/status-tone'
import { Icon, type IconName } from '@/components/portal/icons'

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = raw as Locale
  setRequestLocale(raw)
  const t = await getTranslations('portal')

  const { student, enrollments, nextClass } = getPortalSession()
  const current = enrollments.filter((e) => e.status !== 'completed')
  const hasUnderReview = enrollments.some((e) => e.status === 'under_review')

  const quickActions: { href: string; label: string; icon: IconName }[] = [
    { href: '/portal/documentos', label: t('dashboard.action_documents'), icon: 'documents' },
    { href: '/portal/matricula', label: t('dashboard.action_enrollments'), icon: 'enrollment' },
    { href: '/portal/perfil', label: t('dashboard.action_profile'), icon: 'profile' },
  ]

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {t('greeting.hello', { name: student.firstName })}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {t('greeting.subtitle')}
        </p>
      </header>

      {hasUnderReview && (
        <div className="flex items-start gap-3 rounded-2xl border border-brand-yellow-deep/25 bg-brand-yellow/10 px-4 py-3.5 text-sm text-ink">
          <span className="mt-0.5 text-brand-yellow-deep">
            <Icon name="clock" size={18} />
          </span>
          <p>{t('dashboard.review_note')}</p>
        </div>
      )}

      {/* Next class */}
      <section>
        <div className="mb-3">
          <SectionTitle>{t('next_class.title')}</SectionTitle>
        </div>
        {nextClass ? (
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-4 bg-brand-blue p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex flex-col gap-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/80">
                  <Icon name="calendar" size={16} />
                  {formatDateTime(nextClass.startsAt, locale)}
                </span>
                <span className="text-xl font-semibold">
                  {nextClass.courseName}
                </span>
                <span className="text-sm text-white/85">
                  {nextClass.classGroupName}
                </span>
                <span className="text-sm text-white/70">
                  {t('next_class.with_teacher', { teacher: nextClass.teacherName })}
                </span>
              </div>
              {nextClass.meetingUrl ? (
                <a
                  href={nextClass.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-brand-blue-deep shadow-card transition hover:bg-brand-yellow hover:text-ink"
                >
                  <Icon name="video" size={18} />
                  {t('next_class.join')}
                </a>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white/85">
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

      {/* My courses */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <SectionTitle>{t('dashboard.my_courses_title')}</SectionTitle>
          <Link
            href="/portal/cursos"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-blue transition hover:text-brand-blue-deep"
          >
            {t('common.see_all')}
            <Icon name="chevron-right" size={16} />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
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
              {e.progressPct !== null && (
                <ProgressBar
                  value={e.progressPct}
                  label={t('dashboard.progress_label')}
                />
              )}
              <Link
                href={`/portal/cursos/${e.id}`}
                className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand-blue transition hover:text-brand-blue-deep"
              >
                {t('common.view_detail')}
                <Icon name="arrow-right" size={16} />
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <div className="mb-3">
          <SectionTitle>{t('dashboard.quick_actions_title')}</SectionTitle>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
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
        </div>
      </section>
    </div>
  )
}
