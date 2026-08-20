'use client'

import { Link, usePathname } from '@/i18n/navigation'
import { BoIcon, type BoIconName } from './icons'

export interface SectionTab {
  href: string
  label: string
  /**
   * Lights the tab on its own path only. Needed when a section's index is the
   * parent of its siblings (`/payments` over `/payments/review`): the prefix
   * match would otherwise leave two tabs lit at once.
   */
  exact?: boolean
}

export interface SectionAction {
  href: string
  /** Named, never drawn: the icon is the whole button (CLAUDE.md §4). */
  label: string
  icon: BoIconName
}

/**
 * The two halves of a section that share one sidebar entry. Real routes, not
 * client state: a class group opened from a tab is still a link somebody can
 * bookmark or send to a colleague, and the detail pages under it keep their
 * own URLs.
 */
export function SectionTabs({
  tabs,
  action,
}: {
  tabs: SectionTab[]
  /**
   * A screen of the section that is not a place the reader works — the
   * parameters behind it. It sits apart, as an icon on the far side, because
   * a fourth tab reads like a fourth place to go and it is one nobody opens
   * twice a month.
   */
  action?: SectionAction
}) {
  const pathname = usePathname()
  const actionActive = action !== undefined && pathname === action.href

  return (
    <nav className="-mt-2 flex items-center gap-1 border-b border-line">
      {tabs.map((tab) => {
        /* The detail page of a class group belongs to the class group tab —
           matching the prefix keeps the tab lit while you are inside it. */
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition ${
              active
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-muted-foreground hover:border-line hover:text-ink'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}

      {action && (
        <Link
          href={action.href}
          aria-current={actionActive ? 'page' : undefined}
          aria-label={action.label}
          title={action.label}
          className={`-mb-px ml-auto border-b-2 px-2.5 py-2 transition ${
            actionActive
              ? 'border-brand-blue text-brand-blue'
              : 'border-transparent text-muted-foreground hover:border-line hover:text-ink'
          }`}
        >
          <BoIcon name={action.icon} size={18} />
        </Link>
      )}
    </nav>
  )
}
