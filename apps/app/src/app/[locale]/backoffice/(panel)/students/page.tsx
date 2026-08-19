import { getTranslations, setRequestLocale } from 'next-intl/server'
import { listStudents } from '@/lib/backoffice/mock-data'
import { MockNotice, PageHeader } from '@/components/backoffice/ui'
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

  const rows = listStudents()

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t('students.title')} subtitle={t('students.subtitle')} />
      <MockNotice label={t('common.mock_notice')} />
      <StudentsTable rows={rows} />
    </div>
  )
}
