'use client'

import { useState, type ReactNode } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { PortalNav, type NavItem } from './portal-nav'
import { StudentMenu } from './student-menu'
import { NotificationsBell, type NoticeItem } from './notifications-bell'
import { Icon } from './icons'

/**
 * The portal chrome, client-side because it is stateful: a collapsible
 * sidebar (16rem open, 4rem icons-only) plus the top-right account strip —
 * language, notifications, student menu. Pages stay server components — they
 * arrive as `children`.
 */

function BrandMark({
  portalLabel,
  mini = false,
  onBlue = false,
}: {
  portalLabel: string
  mini?: boolean
  onBlue?: boolean
}) {
  if (mini) {
    return (
      <Image
        src="/brand/favicon.png"
        alt="Only One Coin"
        width={32}
        height={32}
        className="h-8 w-8"
      />
    )
  }
  return (
    <div className="flex flex-col gap-1">
      <Image
        src="/brand/logo-mark.png"
        alt="Only One Coin"
        width={81}
        height={28}
        className="h-7 w-auto"
      />
      <span
        className={`whitespace-nowrap text-[11px] font-medium ${
          onBlue ? 'text-white/70' : 'text-muted-foreground'
        }`}
      >
        {portalLabel}
      </span>
    </div>
  )
}

export function PortalShell({
  portalLabel,
  navItems,
  studentName,
  monogram,
  notifications,
  logoutAction,
  children,
}: {
  portalLabel: string
  navItems: NavItem[]
  studentName: string
  monogram: string
  notifications: NoticeItem[]
  logoutAction: () => Promise<void>
  children: ReactNode
}) {
  const t = useTranslations('portal')
  const [collapsed, setCollapsed] = useState(false)
  const toggleLabel = collapsed ? t('nav.expand') : t('nav.collapse')

  const accountStrip = (
    <div className="flex items-center gap-2">
      <NotificationsBell notifications={notifications} align="end" />
      <StudentMenu
        name={studentName}
        monogram={monogram}
        logoutAction={logoutAction}
      />
    </div>
  )

  return (
    <div className="min-h-dvh bg-sky-soft text-ink">
      {/* Sidebar — desktop. Brand blue, so it reads as the one colored bar
          on an otherwise light screen. */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col bg-brand-blue transition-[width] duration-200 ease-in-out lg:flex ${
          collapsed ? 'w-14' : 'w-56'
        }`}
      >
        {/* The toggle rides the sidebar's edge, so it lives in the same spot
            open or closed — never stacked under the logo. */}
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={toggleLabel}
          title={toggleLabel}
          className="absolute -right-3 top-7 z-40 grid h-6 w-6 place-items-center rounded-full border border-line bg-white text-muted-foreground shadow-card transition hover:border-brand-blue hover:text-brand-blue"
        >
          <Icon
            name="chevron-right"
            size={13}
            className={`transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
          />
        </button>

        <div
          className={`flex border-b border-white/15 ${
            collapsed ? 'justify-center px-2 py-4' : 'px-4 py-4'
          }`}
        >
          <BrandMark portalLabel={portalLabel} mini={collapsed} onBlue />
        </div>

        <div
          className={`flex-1 overflow-y-auto py-4 ${collapsed ? 'px-2' : 'px-3'}`}
        >
          <PortalNav items={navItems} orientation="sidebar" collapsed={collapsed} />
        </div>
      </aside>

      {/* Top bar — mobile / tablet */}
      <div className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <BrandMark portalLabel={portalLabel} />
          {accountStrip}
        </div>
        <PortalNav items={navItems} orientation="bar" />
      </div>

      {/* Content */}
      <div
        className={`transition-[padding] duration-200 ease-in-out ${
          collapsed ? 'lg:pl-14' : 'lg:pl-56'
        }`}
      >
        {/* Desktop top bar: language, bell and the student's own menu at the
            page's top right — not buried in the sidebar. */}
        <div className="sticky top-0 z-20 hidden justify-end border-b border-line/60 bg-sky-soft/80 px-6 py-3 backdrop-blur lg:flex">
          {accountStrip}
        </div>
        {/* `@container/page` names the reading column. The viewport is the
            wrong ruler once a sidebar sits beside it: the same window yields a
            different column open vs collapsed — which is exactly why screens
            size themselves to the container, not to breakpoints. */}
        <main className="@container/page mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
