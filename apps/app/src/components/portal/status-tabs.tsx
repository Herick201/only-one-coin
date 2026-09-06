'use client'

import { useState, type ReactNode } from 'react'

export type StatusTab = {
  id: string
  label: string
  count: number
  content: ReactNode
}

/**
 * Tabs over a list that is already grouped by state — enrollments today.
 * A student with four enrollments should land on the ones that are running,
 * not scroll past them to find out something is still under review.
 *
 * The content of every tab is rendered on the server and handed here as
 * `ReactNode`: this component only decides which one is visible, so the pages
 * behind it stay server components.
 */
export function StatusTabs({ tabs }: { tabs: StatusTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? '')

  return (
    <div>
      <div
        role="tablist"
        className="mb-5 flex flex-wrap items-center gap-1 border-b border-line"
      >
        {tabs.map((tab) => {
          const selected = tab.id === active
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(tab.id)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition ${
                selected
                  ? 'border-brand-blue text-ink'
                  : 'border-transparent text-muted-foreground hover:text-ink'
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                  selected ? 'bg-brand-blue text-white' : 'bg-sky text-muted-foreground'
                }`}
              >
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {tabs.map((tab) => (
        <div key={tab.id} role="tabpanel" hidden={tab.id !== active}>
          {tab.content}
        </div>
      ))}
    </div>
  )
}
