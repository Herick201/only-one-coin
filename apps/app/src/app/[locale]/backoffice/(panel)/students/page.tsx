import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getStaffSession, listStudents } from '@/lib/backoffice/mock-data'
import { canBrowseStudents } from '@/lib/backoffice/permissions'
import { EmptyState, MockNotice, PageHeader } from '@/components/backoffice/ui'
import { StudentsTable } from './students-table'

/**
 * Student directory. The list itself is a client component so search and the
 * status filter work without a backend; the data still comes from the server.
 */
export default async function StudentsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('bo')

  const staff = getStaffSession()

  /* A teacher reaches a student through their own class group, never through a
     roster of everybody in the institution. The screen says so; the check that
     enforces it is the role on the route in `apps/api` (CLAUDE.md §8). */
  if (!canBrowseStudents(staff.role)) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title={t('students.title')} subtitle={t('students.subtitle')} />
        <EmptyState
          icon="shield"
          title={t('students.locked_title')}
          body={t('students.locked_body')}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t('students.title')} subtitle={t('students.subtitle')} />
      <MockNotice label={t('common.mock_notice')} />
      <StudentsTable rows={listStudents()} />
    </div>
  )
}
