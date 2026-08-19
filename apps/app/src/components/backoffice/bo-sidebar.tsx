'use client'

import type { ReactNode } from 'react'
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarRange,
  ClipboardList,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  Mail,
  Settings,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Link, usePathname } from '@/i18n/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar'

/** Module key -> icon. Labels never live here — they come from i18n. */
const icons = {
  dashboard: LayoutDashboard,
  students: Users,
  enrollments: ClipboardList,
  payments: CreditCard,
  class_groups: CalendarRange,
  courses: BookOpen,
  teachers: GraduationCap,
  email: Mail,
  reports: BarChart3,
  staff: UserCog,
  settings: Settings,
} satisfies Record<string, LucideIcon>

export type BoModuleKey = keyof typeof icons

export interface BoNavItem {
  key: BoModuleKey
  href: string
  label: string
  /** Module already agreed on but not built yet — shown disabled, not hidden. */
  soon?: boolean
  badge?: number
}

export interface BoNavGroup {
  label: string
  items: BoNavItem[]
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Backoffice sidebar. Collapses to an icon rail through the shadcn primitive,
 * which also persists the open/closed choice in a cookie — so the panel opens
 * the way each person left it.
 */
export function BoSidebar({
  groups,
  soonLabel,
  a11y,
  brand,
  footer,
}: {
  groups: BoNavGroup[]
  soonLabel: string
  /** Screen-reader copy for the mobile drawer (CLAUDE.md §4). */
  a11y: { title: string; description: string; close: string; toggle: string }
  brand: ReactNode
  footer: ReactNode
}) {
  const pathname = usePathname()

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0"
      a11yTitle={a11y.title}
      a11yDescription={a11y.description}
      a11yClose={a11y.close}
    >
      <SidebarHeader className="p-0">{brand}</SidebarHeader>
      <SidebarSeparator className="mx-0 bg-sidebar-border" />

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-slate-400">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = icons[item.key]
                  if (item.soon) {
                    return (
                      <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton
                          disabled
                          tooltip={`${item.label} — ${soonLabel}`}
                          className="cursor-default pr-7 text-slate-500 opacity-70 hover:bg-transparent hover:text-slate-500"
                        >
                          <Icon />
                          <span className="truncate">{item.label}</span>
                        </SidebarMenuButton>
                        <SidebarMenuBadge
                          aria-hidden="true"
                          className="right-2 min-w-0 px-0"
                        >
                          <span className="size-1.5 rounded-full bg-slate-500" />
                        </SidebarMenuBadge>
                      </SidebarMenuItem>
                    )
                  }
                  const active = isActive(pathname, item.href)
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                      >
                        <Link href={item.href}>
                          <Icon />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      {item.badge !== undefined && item.badge > 0 && (
                        <SidebarMenuBadge className="text-amber-300">
                          {item.badge}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="gap-3">{footer}</SidebarFooter>
      <SidebarRail label={a11y.toggle} />
    </Sidebar>
  )
}

/** Re-exported so the queue badge can reuse the same alert glyph. */
export const AlertGlyph = AlertTriangle
