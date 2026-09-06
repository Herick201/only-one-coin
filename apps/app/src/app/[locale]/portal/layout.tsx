import type { ReactNode } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { logout } from '../actions'
import { getPortalSession } from '@/lib/portal/mock-data'
import { initials } from '@/lib/portal/format'
import type { NavItem } from '@/components/portal/portal-nav'
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

  const navItems: NavItem[] = [
    { href: '/portal', label: t('nav.dashboard'), icon: 'home' },
    { href: '/portal/courses', label: t('nav.courses'), icon: 'courses' },
    { href: '/portal/payments', label: t('nav.payments'), icon: 'card' },
    { href: '/portal/requests', label: t('nav.requests'), icon: 'clipboard' },
    { href: '/portal/enrollment', label: t('nav.enrollments'), icon: 'enrollment' },
    { href: '/portal/documents', label: t('nav.documents'), icon: 'documents' },
  ]

  const noticeItems: NoticeItem[] = notifications.map((n) => ({
    id: n.id,
    kind: n.kind,
    courseName: n.courseName,
  }))

  return (
    <PortalShell
      portalLabel={t('brand.portal_label')}
      navItems={navItems}
      studentName={fullName}
      monogram={monogram}
      notifications={noticeItems}
      logoutAction={logout}
    >
      {children}
    </PortalShell>
  )
}
