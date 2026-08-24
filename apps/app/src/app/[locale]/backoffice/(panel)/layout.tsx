import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Image from 'next/image'
import { cookies } from 'next/headers'
import { LogOut } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { logoutStaff } from '../actions'
import { Link } from '@/i18n/navigation'
import {
  canBrowseReports,
  canConfigureSettings,
  isRestrictedToOwnClassGroups,
} from '@/lib/backoffice/permissions'
import {
  getDashboardMetrics,
  getEnrollmentMetrics,
  getStaffSession,
} from '@/lib/backoffice/mock-data'
import { initials } from '@/lib/format'
import { BoSidebar, type BoNavGroup } from '@/components/backoffice/bo-sidebar'
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
  const { expiringSoon: expiringReservations } = getEnrollmentMetrics()
  const monogram = initials(staff.firstName, staff.lastName)

  // shadcn writes this cookie from the trigger; reading it here avoids the
  // sidebar flashing open before hydration.
  const sidebarOpen = (await cookies()).get('sidebar_state')?.value !== 'false'

  /**
   * A teacher gets the panel narrowed to their own work: their class groups
   * and their own ficha. The money, the student directory and the
   * administration group are not theirs to open — and the sidebar says so by
   * not offering them, rather than by letting the click fail.
   *
   * This is the screen honouring the rule, never enforcing it: the check that
   * counts compares the authenticated `teacher_id` inside the usecase in
   * `apps/api` (CLAUDE.md §8).
   */
  const restricted = isRestrictedToOwnClassGroups(staff.role)

  const groups: BoNavGroup[] = restricted
    ? [
        {
          key: 'home',
          items: [
            { key: 'dashboard', href: '/backoffice/home', label: t('nav.dashboard') },
          ],
        },
        {
          key: 'academic',
          label: t('nav.group_academic'),
          items: [
            {
              key: 'class_groups',
              href: '/backoffice/class-groups',
              label: t('nav.my_class_groups'),
            },
            {
              key: 'teachers',
              href: staff.teacherId
                ? `/backoffice/teachers/${staff.teacherId}`
                : '/backoffice/teachers',
              label: t('nav.my_profile'),
            },
          ],
        },
      ]
    : [
    {
      /* No label, so it renders loose above the dropdowns. Home is not a
         section of the panel — it is where the panel starts. */
      key: 'home',
      items: [
        { key: 'dashboard', href: '/backoffice/home', label: t('nav.dashboard') },
      ],
    },
    {
      key: 'operations',
      label: t('nav.group_operations'),
      items: [
        { key: 'students', href: '/backoffice/students', label: t('nav.students') },
        {
          /* One entry for the two screens of the section — the ledger and the
             seats still held by an open payment. The badge is the reservations
             about to expire: a seat nobody chased is a seat the cron hands
             back with the money already paid. */
          key: 'enrollments',
          href: '/backoffice/enrollments',
          label: t('nav.enrollments'),
          badge: expiringReservations,
        },
        {
          /* One entry for the three screens of the section — the ledger, the
             review queue and the validation parameters. The badge is the queue
             count: what the panel is opened for on a busy day. */
          key: 'payments',
          href: '/backoffice/payments',
          label: t('nav.payments'),
          badge: pendingReview,
        },
      ],
    },
    {
      key: 'academic',
      label: t('nav.group_academic'),
      items: [
        {
          /* One entry for the two screens the section is made of. They are
             read together — a course is what a class group is an instance of —
             and two sibling items reading "Turmas" and "Cursos" looked like
             the same destination twice. The tab strip on the pages carries
             the split. */
          key: 'class_groups',
          href: '/backoffice/class-groups',
          alsoMatches: ['/backoffice/courses'],
          label: t('nav.academic'),
        },
        {
          key: 'teachers',
          href: '/backoffice/teachers',
          label: t('nav.teachers'),
        },
      ],
    },
    {
      key: 'admin',
      label: t('nav.group_admin'),
      items: [
        { key: 'email', href: '/backoffice/emails', label: t('nav.email'), soon: true },
        /* Same rule as settings below: an entry that only ever opens on a
           locked state is a door that never opens. Tesorería reads its figure
           of the ciclo in Pagos, beside the receipts it settles; the teacher's
           narrowed rail never had this group. Whoever arrives by URL still
           meets the locked screen, and the role on the route in `apps/api` is
           what enforces it (CLAUDE.md §8). */
        ...(canBrowseReports(staff.role)
          ? [
              {
                key: 'reports' as const,
                href: '/backoffice/reports',
                label: t('nav.reports'),
              },
            ]
          : []),
        { key: 'staff', href: '/backoffice/team', label: t('nav.staff'), soon: true },
        /* Settings is admin's alone — it holds the grade that decides who is
           certified and the tolerance the platform approves a receipt with when
           nobody is looking. Left out of the rail rather than shown greyed:
           "pronto" promises a door that will open one day, and this one never
           opens for coordination or tesorería. The locked state on the page
           stays for whoever arrives by URL, and the role on the route in
           `apps/api` is what actually enforces it (CLAUDE.md §8). */
        ...(canConfigureSettings(staff.role)
          ? [
              {
                key: 'settings' as const,
                href: '/backoffice/settings',
                label: t('nav.settings'),
              },
            ]
          : []),
      ],
    },
  ]

  const brand = (
    <div className="flex h-14 items-center gap-2.5 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
      <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/10 group-data-[collapsible=icon]:bg-transparent">
        <Image
          src="/brand/logo-mark.png"
          alt="Only One Coin"
          width={192}
          height={66}
          className="h-auto w-7"
        />
      </span>
      <span className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
        <span className="truncate text-[15px] font-semibold text-white">
          Only One Coin
        </span>
        <span className="truncate text-xs font-medium text-slate-400">
          {t('brand.panel_label')}
        </span>
      </span>
    </div>
  )

  const footer = (
    <>
      {/*
        The person's own chip is the door to their own account — password,
        second factor, open sessions. It lives here rather than in a module
        group because it is the one screen of the panel that belongs to the
        reader instead of to the institution, and because a teacher, whose menu
        is narrowed to their own class groups, has to reach it too.
      */}
      <Link
        href="/backoffice/account"
        title={t('nav.account')}
        className="flex items-center gap-2.5 rounded-lg px-1 py-1 transition hover:bg-white/5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
      >
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-white/10 text-xs font-semibold text-white">
            {monogram}
          </AvatarFallback>
        </Avatar>
        <span className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
          <span className="truncate text-[15px] font-semibold text-white">
            {`${staff.firstName} ${staff.lastName}`}
          </span>
          <span className="truncate text-xs text-slate-400">
            {t(`role.${staff.role}`)}
          </span>
        </span>
      </Link>

      <form action={logoutStaff}>
        <button
          type="submit"
          title={t('nav.logout')}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[15px] font-semibold text-slate-400 transition hover:bg-white/5 hover:text-red-300 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <LogOut className="size-[18px] shrink-0" />
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
              {/*
                No language switch here. It used to sit on the right of every
                screen in the panel, which made a once-a-year choice into
                permanent chrome — and a control that reloads the page under
                someone mid-task. It lives in `/backoffice/account` now, with
                the rest of what a person sets about themselves. The login
                screens keep theirs: before signing in there is no account to
                open, and someone who cannot read Spanish has to switch there.
              */}
              <span className="text-sm font-semibold text-foreground">
                {t('brand.panel_label')}
              </span>
            </header>

            {/*
              The panel is a work surface, not a reading column: it grows with
              the monitor instead of parking a 72rem block in the middle of a
              wide screen while the tables inside it scroll sideways. The cap
              only stops the rows from becoming unscannable on a very wide one.

              `@container/page` names this column so anything below can size
              itself against the space it actually gets. The viewport is the
              wrong ruler here — the same 1280px window gives ~1000px with the
              sidebar open and ~1170px with it collapsed, and a `xl:` rule
              cannot tell those apart.
            */}
            <main className="@container/page mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </>
  )
}
