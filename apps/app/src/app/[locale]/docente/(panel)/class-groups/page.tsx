import { getTranslations, setRequestLocale } from 'next-intl/server'
import { listClassGroupRostersFor } from '@/lib/backoffice/mock-data'
import { getTeacherSession } from '@/lib/backoffice/session'
import { PageHeader } from '@/components/backoffice/ui'
import { TeacherClassGroups } from './teacher-class-groups'

/**
 * A class group leaves the teacher's portal when coordination closes it
 * (decision 08/10/2026): while it is only finished it stays, because the
 * final exam's grades and the report come after the last class.
 *
 * The teacher's working screen: their class groups as tabs, and under the open
 * tab the whole management of that group, student by student. The rosters come
 * scoped by the session's `teacherId` (CLAUDE.md §8) — and the check that
 * enforces it is the usecase in `apps/api`, not this line.
 */
export default async function TeacherClassGroupsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('bo')

  const staff = await getTeacherSession()

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t('nav.my_class_groups')} />
      <TeacherClassGroups
        groups={listClassGroupRostersFor(staff).filter((group) => group.status !== 'closed')}
        teacherName={`${staff.firstName} ${staff.lastName}`}
      />
    </div>
  )
}
