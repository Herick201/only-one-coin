'use client'

import { useState } from 'react'
import { Link, usePathname } from '@/i18n/navigation'
import { Icon, type IconName } from './icons'

export interface NavItem {
  href: string
  label: string
  icon: IconName
  /**
export interface NavItem {
  href: string
  label: string
  icon: IconName
  /**
   * Announced, not built. A locked item renders as a padlocked, unclickable
   * row: the student sees what the área do aluno will hold without the portal
   * pretending the screen exists.
   */
  locked?: boolean
  /**
   * Fica fixa na barra de abas do celular. O que não é marcado vai para a
   * folha de "mais" (`portal-tabbar.tsx`). É escolha de produto, não "as N
   * primeiras": o que merece uma coluna permanente embaixo do polegar é o que
   * o aluno abre sem motivo, e isso não sai da ordem da sidebar. Um item
   * travado nunca fica fixo — ele existe para anunciar, não para ser aberto.
   */
  tabBar?: boolean
  /**
   * Rótulo para a barra de abas do celular, onde cada coluna tem ~90px:
   * "Mis cursos" não cabe em nenhum dos três idiomas. Só as seções fixas cujo
   * nome longo estoura precisam dele — o resto cai no `label`.
   */
  shortLabel?: string
}

/** A titled run of items. The first group carries no title. */
export interface NavGroup {
  title?: string
  items: NavItem[]
}

function isActive(pathname: string, href: string) {
  if (href === '/portal') return pathname === '/portal'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function PortalNav({
  groups,
  collapsed = false,
}: {
  groups: NavGroup[]
  /** Icon-only rendering for the collapsed sidebar; labels move to `title`. */
  collapsed?: boolean
}) {
  const pathname = usePathname()
  /**
   * A titled group is a dropdown, closed by default: it is a section of the
   * portal the student can look into, not a permanent column of rows. The
   * untitled first group is the nav itself and never folds.
   */
  const [openGroups, setOpenGroups] = useState<string[]>([])

  // Sidebar rides a brand-blue panel, so the palette inverts: quiet items are
  // translucent white, and the active one is the white pill.
  return (
    <nav className="flex flex-col gap-4">
      {groups.map((group, index) => {
        const foldable = group.title !== undefined && !collapsed
        const open = group.title !== undefined && openGroups.includes(group.title)
        return (
        <div key={group.title ?? index} className="flex flex-col gap-1">
          {foldable && (
            <button
              type="button"
              aria-expanded={open}
              onClick={() =>
                setOpenGroups((prev) =>
                  prev.includes(group.title!)
                    ? prev.filter((title) => title !== group.title)
                    : [...prev, group.title!],
                )
              }
              className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-white/45 transition hover:bg-white/10 hover:text-white/70"
            >
              {group.title}
              <Icon
                name="chevron-right"
                size={13}
                className={`ml-auto transition-transform ${open ? 'rotate-90' : ''}`}
              />
            </button>
          )}
          {group.title && collapsed && (
            <span className="mx-auto mb-1 h-px w-6 bg-white/20" />
          )}
          {(!foldable || open) &&
            group.items.map((item) => {
            const active = isActive(pathname, item.href)
            if (item.locked) {
              return (
                <span
                  key={item.href}
                  aria-disabled="true"
                  title={item.label}
                  aria-label={item.label}
                  className={`flex cursor-not-allowed items-center gap-3 rounded-xl text-sm font-semibold text-white/40 ${
                    collapsed ? 'justify-center px-0 py-2.5' : 'px-3.5 py-2.5'
                  }`}
                >
                  <Icon name={item.icon} size={20} />
                  {!collapsed && (
                    <>
                      {item.label}
                      <Icon name="lock" size={14} className="ml-auto" />
                    </>
                  )}
                </span>
              )
            }
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
        </div>
        )
      })}
    </nav>
  )
}
