'use client'

import { useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarRange,
  ChevronDown,
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
import { cn } from '@/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
  useSidebar,
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
  /**
   * Extra paths the item owns. One entry can front a section that spans more
   * than one route — the item has to stay lit on all of them, or the sidebar
   * says you left a section you are still inside.
   */
  alsoMatches?: string[]
  /** Module already agreed on but not built yet — shown disabled, not hidden. */
  soon?: boolean
  badge?: number
}

export interface BoNavGroup {
  /** Stable across locales — the label is translated, this is the state key. */
  key: string
  /** Label-less group: rendered loose at the top, with nothing to fold. */
  label?: string
  items: BoNavItem[]
}

function isActive(pathname: string, item: Pick<BoNavItem, 'href' | 'alsoMatches'>) {
  return [item.href, ...(item.alsoMatches ?? [])].some(
    (href) => pathname === href || pathname.startsWith(`${href}/`),
  )
}

/**
 * Backoffice sidebar. Collapses to an icon rail through the shadcn primitive,
 * which also persists the open/closed choice in a cookie — so the panel opens
 * the way each person left it.
 *
 * Each macro group is a dropdown: the label is the trigger, so someone who
 * lives in one section can fold the other two away. Groups open by default —
 * folding is a choice, never the state a new person finds.
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
  const { state, isMobile } = useSidebar()
  // On the icon rail there is no label left to click, so there would be no way
  // back into a folded group — the groups stay open there.
  const iconRail = state === 'collapsed' && !isMobile
  const [folded, setFolded] = useState<Record<string, boolean>>({})

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
        {groups.map((group) => {
          const open = !group.label || iconRail || !folded[group.key]
          // What the group is still asking for while folded shut — the count
          // is why the panel gets opened on a busy day, it cannot go quiet.
          const pending = group.items.reduce((sum, item) => sum + (item.badge ?? 0), 0)

          return (
            <Collapsible
              key={group.key}
              open={open}
              onOpenChange={(next) =>
                setFolded((prev) => ({ ...prev, [group.key]: !next }))
              }
              asChild
            >
              <SidebarGroup>
                {!group.label ? null : iconRail ? (
                  <SidebarGroupLabel className="text-slate-400">
                    {group.label}
                  </SidebarGroupLabel>
                ) : (
                  <SidebarGroupLabel asChild className="text-slate-400">
                    <CollapsibleTrigger className="w-full gap-1.5 transition hover:bg-white/5 hover:text-slate-200">
                      <span className="truncate">{group.label}</span>
                      {!open && pending > 0 && (
                        <span className="text-[11px] font-semibold text-amber-300">
                          {pending}
                        </span>
                      )}
                      <ChevronDown
                        aria-hidden="true"
                        className={cn(
                          'ml-auto transition-transform duration-200',
                          !open && '-rotate-90',
                        )}
                      />
                    </CollapsibleTrigger>
                  </SidebarGroupLabel>
                )}
                <CollapsibleContent>
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
                        const active = isActive(pathname, item)
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
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          )
        })}
      </SidebarContent>

      <SidebarFooter className="gap-3">{footer}</SidebarFooter>
      <SidebarRail label={a11y.toggle} />
    </Sidebar>
  )
}

/** Re-exported so the queue badge can reuse the same alert glyph. */
export const AlertGlyph = AlertTriangle
