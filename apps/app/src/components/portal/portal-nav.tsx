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
}: {
  items: NavItem[]
  orientation: 'sidebar' | 'bar'
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

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
              active
                ? 'bg-brand-blue text-white shadow-card'
                : 'text-muted-foreground hover:bg-sky hover:text-ink'
            }`}
          >
            <Icon name={item.icon} size={20} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
