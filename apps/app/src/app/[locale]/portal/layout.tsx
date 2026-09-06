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
   * A ordem é a da sidebar no desktop. Quem fica fixo na barra de abas do
   * celular é dito item a item (`tabBar`), não pela posição: são as seções que
   * o aluno abre sem motivo — ver a próxima aula, ver os cursos, pedir um
   * trâmite. O resto vai para a folha de "mais" (`portal-tabbar.tsx`).
   *
   * **Pagamentos não fica na barra**: mensalidade e comprovante são visita com
   * hora marcada, não navegação de todo dia — e uma coluna permanente para o
   * dinheiro faz o portal parecer uma cobrança. O aviso de módulo em atraso já
   * chega pelo sino e pelo cadeado no curso, que é o caminho por onde a pessoa
   * realmente entra ali.
   *
   * `shortLabel` só nas fixas cujo nome longo não cabe numa coluna de ~90px.
   */
  const navItems: NavItem[] = [
    {
      href: '/portal',
      label: t('nav.dashboard'),
      shortLabel: t('nav.tab_dashboard'),
      icon: 'home',
      tabBar: true,
    },
    {
      href: '/portal/courses',
      label: t('nav.courses'),
      shortLabel: t('nav.tab_courses'),
      icon: 'courses',
      tabBar: true,
    },
    { href: '/portal/payments', label: t('nav.payments'), icon: 'card' },
    {
      href: '/portal/requests',
      label: t('nav.requests'),
      shortLabel: t('nav.tab_requests'),
      icon: 'clipboard',
      tabBar: true,
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
