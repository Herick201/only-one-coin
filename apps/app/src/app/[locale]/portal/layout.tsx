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

  /**
   * A ordem manda em duas telas ao mesmo tempo: é a sequência da sidebar no
   * desktop e, no celular, decide o que fica fixo na barra de abas — as quatro
   * primeiras — e o que vai para a folha de "mais" (`portal-tabbar.tsx`). As
   * quatro da frente são as que o aluno abre no dia a dia; matrícula e
   * documentos são visitas de começo e de fim de curso.
   *
   * `shortLabel` só onde o nome longo não cabe numa coluna de ~72px.
   */
  const navItems: NavItem[] = [
    {
      href: '/portal',
      label: t('nav.dashboard'),
      shortLabel: t('nav.tab_dashboard'),
      icon: 'home',
    },
    {
      href: '/portal/courses',
      label: t('nav.courses'),
      shortLabel: t('nav.tab_courses'),
      icon: 'courses',
    },
    {
      href: '/portal/payments',
      label: t('nav.payments'),
      shortLabel: t('nav.tab_payments'),
      icon: 'card',
    },
    {
      href: '/portal/requests',
      label: t('nav.requests'),
      shortLabel: t('nav.tab_requests'),
      icon: 'clipboard',
    },
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
