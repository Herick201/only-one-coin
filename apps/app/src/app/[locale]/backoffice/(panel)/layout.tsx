import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Image from 'next/image'
import { cookies } from 'next/headers'
import { LogOut } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { logoutStaff } from '../actions'
import { getDashboardMetrics, getStaffSession } from '@/lib/backoffice/mock-data'
import { initials } from '@/lib/format'
import { BoSidebar, type BoNavGroup } from '@/components/backoffice/bo-sidebar'
import { LanguageGlobe } from '@/components/language-globe'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { TooltipProvider } from '@/components/ui/tooltip'

/**
 * Backoffice shell. The whole segment stays out of the index (CLAUDE.md §8) —
 * discreet path, never linked from the landing. That is defense in depth, not
 * the defense: real access control is the role check in `apps/api`.
 *
 * Built on the shadcn sidebar primitive: it collapses to an icon rail from the
 * trigger in the header and remembers the choice in a cookie, which is read
 * here so the first server render already matches.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function BackofficePanelLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('bo')

  const staff = getStaffSession()
  const { pendingReview } = getDashboardMetrics()
  const monogram = initials(staff.firstName, staff.lastName)

  // shadcn writes this cookie from the trigger; reading it here avoids the
  // sidebar flashing open before hydration.
  const sidebarOpen = (await cookies()).get('sidebar_state')?.value !== 'false'

  const groups: BoNavGroup[] = [
    {
      label: t('nav.group_daily'),
      items: [
        { key: 'dashboard', href: '/backoffice/home', label: t('nav.dashboard') },
        { key: 'students', href: '/backoffice/students', label: t('nav.students') },
        {
          key: 'enrollments',
          href: '/backoffice/enrollments',
          label: t('nav.enrollments'),
          soon: true,
        },
        {
          key: 'payments',
          href: '/backoffice/payments',
          label: t('nav.payments'),
          soon: true,
          badge: pendingReview,
        },
      ],
    },
    {
      label: t('nav.group_academic'),
      items: [
        {
          key: 'class_groups',
          href: '/backoffice/class-groups',
          label: t('nav.class_groups'),
        },
        { key: 'courses', href: '/backoffice/courses', label: t('nav.courses') },
        {
          key: 'teachers',
          href: '/backoffice/teachers',
          label: t('nav.teachers'),
          soon: true,
        },
      ],
    },
    {
      label: t('nav.group_admin'),
      items: [
        { key: 'email', href: '/backoffice/emails', label: t('nav.email'), soon: true },
        { key: 'reports', href: '/backoffice/reports', label: t('nav.reports'), soon: true },
        { key: 'staff', href: '/backoffice/team', label: t('nav.staff'), soon: true },
        {
          key: 'settings',
          href: '/backoffice/settings',
          label: t('nav.settings'),
          soon: true,
        },
      ],
    },
  ]

  const brand = (
    <div className="flex h-14 items-center gap-2.5 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
      <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/10 group-data-[collapsible=icon]:bg-transparent">
        <Image
          src="/brand/logo.png"
          alt="Only One Coin"
          width={163}
          height={94}
          className="h-4 w-auto"
        />
      </span>
      <span className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
        <span className="truncate text-sm font-semibold text-white">
          Only One Coin
        </span>
        <span className="truncate text-[11px] font-medium text-slate-400">
          {t('brand.panel_label')}
        </span>
      </span>
    </div>
  )

  const footer = (
    <>
      <div className="flex items-center gap-2.5 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-white/10 text-xs font-semibold text-white">
            {monogram}
          </AvatarFallback>
        </Avatar>
        <span className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
          <span className="truncate text-sm font-semibold text-white">
            {`${staff.firstName} ${staff.lastName}`}
          </span>
          <span className="truncate text-[11px] text-slate-400">
            {t(`role.${staff.role}`)}
          </span>
        </span>
      </div>

      <form action={logoutStaff}>
        <button
          type="submit"
          title={t('nav.logout')}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-slate-400 transition hover:bg-white/5 hover:text-red-300 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <LogOut className="size-4 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">
            {t('nav.logout')}
          </span>
        </button>
      </form>
    </>
  )

  return (
    <>
      {/* The sidebar shows a tooltip per item once collapsed to the icon rail. */}
      <TooltipProvider delayDuration={200}>
        <SidebarProvider defaultOpen={sidebarOpen}>
          <BoSidebar
            groups={groups}
            soonLabel={t('nav.soon')}
            a11y={{
              title: t('nav.sidebar_title'),
              description: t('nav.sidebar_description'),
              close: t('nav.sidebar_close'),
              toggle: t('nav.sidebar_toggle'),
            }}
            brand={brand}
            footer={footer}
          />

          <SidebarInset className="bg-background">
            <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur">
              <SidebarTrigger
                className="-ml-1 text-muted-foreground"
                label={t('nav.sidebar_toggle')}
              />
              <Separator orientation="vertical" className="mr-1 !h-5" />
              <span className="text-sm font-semibold text-foreground">
                {t('brand.panel_label')}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <LanguageGlobe />
              </div>
            </header>

            <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </>
  )
}
