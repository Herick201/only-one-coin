import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getEnrollment } from '@/lib/portal/mock-data'
import { formatDate, formatMoney } from '@/lib/portal/format'
import type { CourseMaterial, Locale } from '@/lib/portal/types'
import { Card, Field, SectionTitle, StatusBadge } from '@/components/portal/ui'
import { enrollmentTone } from '@/components/portal/status-tone'
import { Icon, type IconName } from '@/components/portal/icons'

const materialIcon: Record<CourseMaterial['kind'], IconName> = {
  doc: 'doc',
  video: 'video',
  audio: 'audio',
  link: 'external',
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ locale: string; enrollmentId: string }>
}) {
  const { locale: raw, enrollmentId } = await params
  const locale = raw as Locale
  setRequestLocale(raw)
  const t = await getTranslations('portal')

  const enrollment = getEnrollment(enrollmentId)
  if (!enrollment) notFound()

  const { course, classGroup, plan, academicPeriod } = enrollment

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/portal/cursos"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-ink"
      >
        <Icon name="arrow-left" size={16} />
        {t('common.back')}
      </Link>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {course.name}
          </h1>
          <StatusBadge
            tone={enrollmentTone[enrollment.status]}
            label={t(`enrollment_status.${enrollment.status}`)}
          />
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-sky px-2.5 py-1 text-brand-blue-deep">
            {t('modality.' + classGroup.modality)}
          </span>
          <span className="rounded-full bg-sky px-2.5 py-1 text-brand-blue-deep">
            {t('course_detail.level_label')}: {course.level}
          </span>
          <span className="rounded-full bg-sky px-2.5 py-1 text-brand-blue-deep">
            {t('course_detail.min_age_label')}:{' '}
            {t('course_detail.min_age_value', { age: course.minAge })}
          </span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* About */}
          <Card className="p-5 sm:p-6">
            <SectionTitle>{t('course_detail.about_title')}</SectionTitle>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {course.summary}
            </p>
          </Card>

          {/* Schedule & format */}
          <Card className="p-5 sm:p-6">
            <SectionTitle>{t('course_detail.schedule_title')}</SectionTitle>
            <ul className="mt-3 flex flex-col gap-2">
              {classGroup.schedule.map((slot, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-xl bg-sky-soft px-3 py-2.5 text-sm"
                >
                  <span className="text-brand-blue">
                    <Icon name="clock" size={18} />
                  </span>
                  <span className="font-semibold text-ink">
                    {t(`weekday_short.${slot.weekday}`)}
                  </span>
                  <span className="text-muted-foreground">
                    {slot.startTime}–{slot.endTime}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              {t('course_detail.period_dates', {
                start: formatDate(classGroup.startDate, locale),
                end: formatDate(classGroup.endDate, locale),
              })}
            </p>
            <div className="mt-4">
              {classGroup.meetingUrl ? (
                <a
                  href={classGroup.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-brand-blue px-5 py-2.5 text-sm font-bold text-white shadow-card transition hover:bg-brand-blue-deep"
                >
                  <Icon name="video" size={18} />
                  {t('course_detail.join_class')}
                </a>
              ) : (
                <p className="inline-flex items-center gap-2 rounded-xl bg-brand-yellow/10 px-3.5 py-2.5 text-xs font-medium text-ink">
                  <span className="text-brand-yellow-deep">
                    <Icon name="clock" size={16} />
                  </span>
                  {t('course_detail.meeting_pending')}
                </p>
              )}
            </div>
          </Card>

          {/* Materials */}
          <Card className="p-5 sm:p-6">
            <SectionTitle>{t('course_detail.materials_title')}</SectionTitle>
            {course.materials.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {t('course_detail.materials_empty')}
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {course.materials.map((m) => (
                  <li key={m.id}>
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 rounded-xl border border-line px-3.5 py-3 transition hover:border-brand-blue/40 hover:bg-sky-soft"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-sky text-brand-blue">
                        <Icon name={materialIcon[m.kind]} size={18} />
                      </span>
                      <span className="flex-1 text-sm font-medium text-ink">
                        {m.title}
                      </span>
                      <span className="text-muted-foreground transition group-hover:text-brand-blue">
                        <Icon name="external" size={16} />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Side: teacher + plan */}
        <div className="flex flex-col gap-6">
          <Card className="p-5 sm:p-6">
            <SectionTitle>{t('course_detail.teacher_title')}</SectionTitle>
            <div className="mt-3 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-sky text-brand-blue">
                <Icon name="profile" size={22} />
              </span>
              <span className="text-sm font-semibold text-ink">
                {classGroup.teacherName}
              </span>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionTitle>{t('course_detail.plan_title')}</SectionTitle>
            <dl className="mt-3 flex flex-col gap-3">
              <Field label={t('enrollments.plan_label')}>{plan.name}</Field>
              <Field label={t('course_detail.plan_price')}>
                <span className="text-lg text-ink">
                  {formatMoney(plan.priceCents, plan.currency, locale)}
                </span>
              </Field>
              <Field label={t('common.period')}>{academicPeriod.name}</Field>
            </dl>
            <p className="mt-3 border-t border-line pt-3 text-xs text-muted-foreground">
              {t('course_detail.enrolled_on', {
                date: formatDate(enrollment.createdAt, locale),
              })}
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
