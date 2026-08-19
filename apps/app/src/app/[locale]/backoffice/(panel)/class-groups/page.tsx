import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getStaffSession, listClassGroups } from '@/lib/backoffice/mock-data'
import { canCreateClassGroup } from '@/lib/backoffice/permissions'
import { MockNotice, PageHeader } from '@/components/backoffice/ui'
import { ClassGroupsView } from './class-groups-view'

/**
 * Class group directory. The list is a client component so search, filters and
 * ordering work without a backend; the data and the role gate come from the
 * server. Hiding "new class group" from a teacher is a screen convenience —
 * the enforcing check is the role declared on the route in `apps/api`
 * (CLAUDE.md §8).
 */
export default async function ClassGroupsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('bo')

  const rows = listClassGroups()
  const staff = getStaffSession()

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('class_groups.title')}
        subtitle={t('class_groups.subtitle')}
      />
      <MockNotice label={t('common.mock_notice')} />
      <ClassGroupsView rows={rows} canCreate={canCreateClassGroup(staff.role)} />
    </div>
  )
}
