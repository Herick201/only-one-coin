import type { ReactNode } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { logout } from '../actions'
import { getPortalSession } from '@/lib/portal/mock-data'
import { initials } from '@/lib/portal/format'
import type { NavGroup } from '@/components/portal/portal-nav'
import { PortalShell } from '@/components/portal/portal-shell'
import type { NoticeItem } from '@/components/portal/notifications-bell'

export default async function PortalLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('portal')

  const { student, notifications } = getPortalSession()
  const fullName = `${student.firstName} ${student.lastName}`
  const monogram = initials(student.firstName, student.lastName)

  /**
   * Two groups. The second one is announced, not built: tarefas, provas, sala
   * de aula and estudar are the classroom side of the portal, and today the
   * class itself lives outside the platform (CLAUDE.md §2 — no own
   * videoconference, no Classroom API). Padlocked rows say what is coming
   * without the portal pretending the screens exist.
   */
  const navGroups: NavGroup[] = [
    {
      items: [
        { href: '/portal', label: t('nav.dashboard'), icon: 'home' },
        { href: '/portal/courses', label: t('nav.courses'), icon: 'courses' },
        { href: '/portal/payments', label: t('nav.payments'), icon: 'card' },
        { href: '/portal/enrollment', label: t('nav.enrollments'), icon: 'enrollment' },
        { href: '/portal/documents', label: t('nav.documents'), icon: 'documents' },
      ],
    },
    {
      title: t('nav.student_area'),
      items: [
        { href: '/portal/tasks', label: t('nav.tasks'), icon: 'clipboard', locked: true },
        { href: '/portal/exams', label: t('nav.exams'), icon: 'doc', locked: true },
        { href: '/portal/classroom', label: t('nav.classroom'), icon: 'video', locked: true },
        { href: '/portal/study', label: t('nav.study'), icon: 'pencil', locked: true },
      ],
    },
  ]

  const noticeItems: NoticeItem[] = notifications.map((n) => ({
    id: n.id,
    kind: n.kind,
    courseName: n.courseName,
  }))

  return (
    <PortalShell
      portalLabel={t('brand.portal_label')}
      navGroups={navGroups}
      studentName={fullName}
      monogram={monogram}
      notifications={noticeItems}
      logoutAction={logout}
    >
      {children}
    </PortalShell>
  )
}
