'use client'

import { Link, usePathname } from '@/i18n/navigation'
import { Icon, type IconName } from './icons'

export interface NavItem {
  href: string
  label: string
  icon: IconName
  /**
   * Fica fixa na barra de abas do celular. O que não é marcado vai para a
   * folha de "mais" (`portal-tabbar.tsx`). É escolha de produto, não "as N
   * primeiras": o que merece uma coluna permanente embaixo do polegar é o que
   * o aluno abre sem motivo, e isso não sai da ordem da sidebar.
   */
  tabBar?: boolean
  /**
   * Rótulo para a barra de abas do celular, onde cada coluna tem ~90px:
   * "Mis cursos" não cabe em nenhum dos três idiomas. Só as seções fixas cujo
   * nome longo estoura precisam dele — o resto cai no `label`.
   */
  shortLabel?: string
}

function isActive(pathname: string, href: string) {
  if (href === '/portal') return pathname === '/portal'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function PortalNav({
  items,
  collapsed = false,
}: {
  items: NavItem[]
  /** Icon-only rendering for the collapsed sidebar; labels move to `title`. */
  collapsed?: boolean
}) {
  const pathname = usePathname()

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
