'use client'

import { Link, usePathname } from '@/i18n/navigation'
import { Icon, type IconName } from './icons'

export interface NavItem {
  href: string
  label: string
  icon: IconName
}

function isActive(pathname: string, href: string) {
  if (href === '/portal') return pathname === '/portal'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function PortalNav({
  items,
  orientation,
  collapsed = false,
}: {
  items: NavItem[]
  orientation: 'sidebar' | 'bar'
  /** Icon-only rendering for the collapsed sidebar; labels move to `title`. */
  collapsed?: boolean
}) {
  const pathname = usePathname()

  if (orientation === 'bar') {
    return (
      <nav className="flex gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                active
                  ? 'bg-brand-blue text-white'
                  : 'text-muted-foreground hover:bg-sky hover:text-ink'
              }`}
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>
    )
  }

  // Sidebar rides a brand-blue panel, so the palette inverts: quiet items are
  // translucent white, and the active one is the white pill.
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            title={collapsed ? item.label : undefined}
            aria-label={collapsed ? item.label : undefined}
            className={`flex items-center gap-3 rounded-xl text-sm font-semibold transition ${
              collapsed ? 'justify-center px-0 py-2.5' : 'px-3.5 py-2.5'
            } ${
              active
                ? 'bg-white text-brand-blue-deep shadow-card'
                : 'text-white/75 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon name={item.icon} size={20} />
            {!collapsed && item.label}
          </Link>
        )
      })}
    </nav>
  )
}
