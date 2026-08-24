'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { AccountSession } from '@/lib/backoffice/types'
import { countryName, flagEmoji } from '@/lib/geo'
import { formatDateTime, type Locale } from '@/lib/format'
import { Card, SectionTitle, StatusBadge } from '@/components/backoffice/ui'
import { Toast } from '@/components/backoffice/controls'
import { BoIcon } from '@/components/backoffice/icons'

/**
 * Where the account is open right now. This is the half of the screen that
 * answers the only question worth asking after a stolen password — "is anybody
 * else in here?" — so a session someone does not recognise has to be closable
 * from the same row that shows it, without hunting for a settings page.
 *
 * The current session has no close button: signing yourself out is the logout
 * in the sidebar, and a row that ends your own session while pretending to be
 * a security action is a trap.
 *
 * Frontend stub: dropping a row is local state. The real revocation is a
 * usecase in `apps/api` over the session store, audited like every other
 * security change (CLAUDE.md §8).
 */
export function AccountSessions({
  sessions,
  locale,
}: {
  sessions: AccountSession[]
  locale: Locale
}) {
  const t = useTranslations('bo')
  // The route locale drives the country name — `countryName` takes the code.
  const routeLocale = useLocale()
  const [open, setOpen] = useState(sessions)
  const [toast, setToast] = useState<string | null>(null)

  const others = open.filter((session) => !session.current)

  function close(id: string) {
    setOpen((prev) => prev.filter((session) => session.id !== id))
    setToast(t('account.sessions_closed_toast'))
  }

  function closeOthers() {
    setOpen((prev) => prev.filter((session) => session.current))
    setToast(t('account.sessions_closed_others_toast'))
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span className="flex min-w-72 flex-1 flex-col gap-1">
          <SectionTitle icon="device">{t('account.sessions_title')}</SectionTitle>
          <span className="text-sm text-muted-foreground">
            {t('account.sessions_subtitle')}
          </span>
        </span>
        {others.length > 0 && (
          <button
            type="button"
            onClick={closeOthers}
            className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-muted-foreground transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            {t('account.sessions_close_others')}
          </button>
        )}
      </div>

      <ul className="mt-4 divide-y divide-line">
        {open.map((session) => (
          <li
            key={session.id}
            className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <span className="flex min-w-64 flex-1 items-start gap-3">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-sky text-brand-blue">
                <BoIcon name="device" size={18} />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink">
                    {`${session.browser} · ${session.os}`}
                  </span>
                  {session.current && (
                    <StatusBadge
                      tone="success"
                      dot={false}
                      label={t('account.sessions_current')}
                    />
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {`${flagEmoji(session.country)} ${session.city}, ${countryName(
                    session.country,
                    routeLocale,
                  )} · `}
                  <span className="tabular-nums">{session.ip}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {t('account.sessions_last_active', {
                    date: formatDateTime(session.lastActiveAt, locale),
                  })}
                </span>
              </span>
            </span>

            {!session.current && (
              <button
                type="button"
                onClick={() => close(session.id)}
                className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-muted-foreground transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                {t('account.sessions_close')}
              </button>
            )}
          </li>
        ))}
      </ul>

      {others.length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {t('account.sessions_only_current')}
        </p>
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </Card>
  )
}
