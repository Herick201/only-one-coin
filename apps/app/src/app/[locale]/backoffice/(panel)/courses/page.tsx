import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getStaffSession, listCourses } from '@/lib/backoffice/mock-data'
import { canConfigureCourse, canCreateCourse } from '@/lib/backoffice/permissions'
import { MockNotice, PageHeader } from '@/components/backoffice/ui'
import { CoursesView } from './courses-view'

/**
 * Course catalog. A course is what a class group is an instance of
 * (`docs/REQUISITOS.md` RF09), so what changes here changes every class group
 * opened from it afterwards.
 *
 * Two different gates, on purpose: opening a course is an admin call, while
 * configuring one is coordination's day-to-day. Both are screen conveniences —
 * the enforcing check is the role declared on the route in `apps/api`
 * (CLAUDE.md §8).
 */
export default async function CoursesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('bo')

  const staff = getStaffSession()

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t('courses.title')} subtitle={t('courses.subtitle')} />
      <MockNotice label={t('common.mock_notice')} />
      <CoursesView
        rows={listCourses()}
        canCreate={canCreateCourse(staff.role)}
        canConfigure={canConfigureCourse(staff.role)}
      />
    </div>
  )
}
