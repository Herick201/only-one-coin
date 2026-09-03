import type { ReactNode } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { logout } from '../actions'
import { getPortalSession } from '@/lib/portal/mock-data'
import { initials } from '@/lib/portal/format'
import { PortalNav, type NavItem } from '@/components/portal/portal-nav'
import { LanguageSwitcher } from '@/components/portal/language-switcher'
import { Icon } from '@/components/portal/icons'

function BrandMark({ portalLabel }: { portalLabel: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-brand-blue text-white shadow-card">
        <span className="text-lg font-bold leading-none">1</span>
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-brand-yellow" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-ink">
          Only One Coin
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">{portalLabel}</span>
      </span>
    </div>
  )
}

function StudentChip({
  name,
  monogram,
  role,
}: {
  name: string
  monogram: string
  role: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky text-sm font-semibold text-brand-blue-deep">
        {monogram}
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-semibold text-ink">{name}</span>
        <span className="truncate text-[11px] text-muted-foreground">{role}</span>
      </span>
    </div>
  )
}

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

  const { student } = getPortalSession()
  const fullName = `${student.firstName} ${student.lastName}`
  const monogram = initials(student.firstName, student.lastName)

  const navItems: NavItem[] = [
    { href: '/portal', label: t('nav.dashboard'), icon: 'home' },
    { href: '/portal/courses', label: t('nav.courses'), icon: 'courses' },
    { href: '/portal/payments', label: t('nav.payments'), icon: 'card' },
    { href: '/portal/requests', label: t('nav.requests'), icon: 'clipboard' },
    { href: '/portal/enrollment', label: t('nav.enrollments'), icon: 'enrollment' },
    { href: '/portal/documents', label: t('nav.documents'), icon: 'documents' },
    { href: '/portal/profile', label: t('nav.profile'), icon: 'profile' },
  ]

  const logoutButton = (
    <form action={logout}>
      <button
        type="submit"
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-red-50 hover:text-red-600"
      >
        <Icon name="logout" size={18} />
        {t('nav.logout')}
      </button>
    </form>
  )

  return (
    <div
      className="min-h-dvh bg-sky-soft text-ink"
    >
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-white lg:flex">
        <div className="border-b border-line px-5 py-5">
          <BrandMark portalLabel={t('brand.portal_label')} />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <PortalNav items={navItems} orientation="sidebar" />
        </div>
        <div className="border-t border-line px-3 py-4">
          <div className="px-2 pb-3">
            <StudentChip
              name={fullName}
              monogram={monogram}
              role={t('brand.portal_label')}
            />
          </div>
          <div className="flex items-center justify-between px-2 pb-2">
            <LanguageSwitcher />
          </div>
          {logoutButton}
        </div>
      </aside>

      {/* Top bar — mobile / tablet */}
      <div className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <BrandMark portalLabel={t('brand.portal_label')} />
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <span className="grid h-9 w-9 place-items-center rounded-full bg-sky text-sm font-semibold text-brand-blue-deep">
              {monogram}
            </span>
            <form action={logout}>
              <button
                type="submit"
                aria-label={t('nav.logout')}
                className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-red-50 hover:text-red-600"
              >
                <Icon name="logout" size={18} />
              </button>
            </form>
          </div>
        </div>
        <PortalNav items={navItems} orientation="bar" />
      </div>

      {/* Content */}
      <div className="lg:pl-64">
        {/* `@container/page` names the reading column. The viewport is the
            wrong ruler once a 16rem sidebar sits beside it: at 1024px the
            window says "large screen" while the column has 688px to give. */}
        <main className="@container/page mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  )
}
