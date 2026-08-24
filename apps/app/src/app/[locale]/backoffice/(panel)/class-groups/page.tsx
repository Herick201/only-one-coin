import { getTranslations, setRequestLocale } from 'next-intl/server'
import {
  getStaffSession,
  listClassGroupsFor,
  listCourses,
} from '@/lib/backoffice/mock-data'
import {
  canCreateClassGroup,
  isRestrictedToOwnClassGroups,
} from '@/lib/backoffice/permissions'
import { MockNotice, PageHeader } from '@/components/backoffice/ui'
import { SectionTabs } from '@/components/backoffice/section-tabs'
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

  const staff = getStaffSession()
  /* A teacher gets their own class groups and nothing else. The filter is
     built from the session, never from anything the client sent
     (CLAUDE.md §8) — and the check that enforces it is the usecase in
     `apps/api`, not this line. */
  const rows = listClassGroupsFor(staff)
  const restricted = isRestrictedToOwnClassGroups(staff.role)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={restricted ? t('nav.my_class_groups') : t('nav.academic')} />
      {/* The catalog tab is coordination's half of the section; a teacher has
          no course to configure, so the strip would be one live tab and one
          dead end. */}
      {!restricted && (
        <SectionTabs
          tabs={[
            { href: '/backoffice/class-groups', label: t('class_groups.title') },
            { href: '/backoffice/courses', label: t('courses.title') },
          ]}
        />
      )}
      <MockNotice label={t('common.mock_notice')} />
      <ClassGroupsView
        rows={rows}
        courses={listCourses()}
        canCreate={canCreateClassGroup(staff.role)}
      />
    </div>
  )
}
