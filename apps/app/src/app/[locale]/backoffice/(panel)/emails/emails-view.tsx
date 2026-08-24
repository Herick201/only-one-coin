'use client'

import { useMemo, useState, type MouseEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import type { EmailFlow, EmailMetrics } from '@/lib/backoffice/types'
import { formatDate, formatNumber, formatPercent, type Locale } from '@/lib/format'
import { AutoGrid } from '@/components/layout/auto-grid'
import {
  Card,
  EmptyState,
  StatCard,
  StatusBadge,
  TableShell,
  tdClass,
  thClass,
  Toolbar,
  toolbarSearchClass,
  rowActionClass,
} from '@/components/backoffice/ui'
import { BoIcon } from '@/components/backoffice/icons'

/** Share of what left that the receiving server accepted. */
function deliveryRate(flow: EmailFlow): number | null {
  return flow.metrics.sent === 0 ? null : flow.metrics.delivered / flow.metrics.sent
}

/**
 * The catalog of automatic e-mails. Search and the paused filter run in the
 * browser because the list is mocked and short — ten rows that grow to maybe
 * twenty, not a ledger, so it is never paged.
 *
 * The list only ever reads. Switching a flow, and reading the template it
 * renders, happen on the e-mail's own page: turning off the one that carries
 * the portal credentials means nobody gets in, and that is not a decision to
 * hand to a stray click in a list.
 */
export function EmailsView({
  flows,
  metrics,
}: {
  flows: EmailFlow[]
  metrics: EmailMetrics
}) {
  const t = useTranslations('bo')
  const locale = useLocale() as Locale
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [pausedOnly, setPausedOnly] = useState(false)

  /* Names and triggers are translated, so the search runs over what the reader
     actually sees — searching the template codes would find nothing they typed. */
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return flows.filter((flow) => {
      if (pausedOnly && flow.enabled) return false
      if (!needle) return true
      return [
        t(`email_template.${flow.template}`),
        t(`email_trigger.${flow.template}`),
        t(`email_audience.${flow.audience}`),
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [flows, query, pausedOnly, t])

  const pausedCount = flows.filter((flow) => !flow.enabled).length

  /**
   * The whole row opens the e-mail, and the button inside it stays a real
   * link — so keyboard, screen reader and ctrl+click keep working.
   */
  function rowProps(template: string) {
    const href = `/backoffice/emails/${template}`
    return {
      className: 'cursor-pointer transition hover:bg-sky-soft',
      onClick: (event: MouseEvent<HTMLTableRowElement>) => {
        if ((event.target as HTMLElement).closest('a')) return
        router.push(href)
      },
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <AutoGrid min="15rem">
        <StatCard
          icon="email"
          label={t('emails.stat_sent')}
          value={formatNumber(metrics.sent, locale)}
          hint={t('emails.stat_sent_hint', { days: metrics.windowDays })}
        />
        <StatCard
          icon="check"
          tone="success"
          label={t('emails.stat_delivered')}
          value={formatNumber(metrics.delivered, locale)}
          hint={t('emails.stat_delivered_hint', {
            rate: formatPercent(
              metrics.sent === 0 ? 0 : metrics.delivered / metrics.sent,
              locale,
            ),
          })}
        />
        <StatCard
          icon="alert"
          tone={metrics.bounced > 0 ? 'warning' : 'neutral'}
          label={t('emails.stat_bounced')}
          value={formatNumber(metrics.bounced, locale)}
          hint={t('emails.stat_bounced_hint')}
        />
        {/* A paused flow is the one number on this header that is somebody's
            errand — it counts people who are waiting for an e-mail that is
            never coming. */}
        <StatCard
          icon="clock"
          tone={pausedCount > 0 ? 'warning' : 'neutral'}
          label={t('emails.stat_paused')}
          value={formatNumber(pausedCount, locale)}
          hint={t('emails.stat_paused_hint', { count: pausedCount })}
        />
      </AutoGrid>

      <Toolbar>
        <label className={toolbarSearchClass}>
          <span className="sr-only">{t('emails.search_label')}</span>
          <BoIcon
            name="search"
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('emails.search_placeholder')}
            className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-muted-foreground focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
          />
        </label>

        <button
          type="button"
          onClick={() => setPausedOnly(!pausedOnly)}
          aria-pressed={pausedOnly}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            pausedOnly
              ? 'border-brand-blue bg-sky text-brand-blue'
              : 'border-line bg-white text-muted-foreground hover:text-ink'
          }`}
        >
          <BoIcon name="filter" size={16} />
          {t('emails.filter_paused')}
          <span className={pausedOnly ? 'text-brand-blue/60' : 'text-slate-400'}>
            {pausedCount}
          </span>
        </button>
      </Toolbar>

      <Card>
        {filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon="search"
              title={t('emails.empty_title')}
              body={t('emails.empty_body')}
            />
          </div>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <th className={thClass}>{t('emails.col_flow')}</th>
                <th className={thClass}>{t('emails.col_audience')}</th>
                <th className={thClass}>{t('emails.col_state')}</th>
                <th className={`${thClass} text-right`}>{t('emails.col_sent')}</th>
                <th className={`${thClass} text-right`}>{t('emails.col_delivered')}</th>
                <th className={thClass}>{t('emails.col_template')}</th>
                <th className={thClass}>
                  <span className="sr-only">{t('common.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((flow) => {
                const rate = deliveryRate(flow)
                return (
                  <tr key={flow.template} {...rowProps(flow.template)}>
                    <td className={tdClass}>
                      <span className="flex min-w-0 flex-col">
                        <Link
                          href={`/backoffice/emails/${flow.template}`}
                          className="font-semibold text-ink transition hover:text-brand-blue"
                        >
                          {t(`email_template.${flow.template}`)}
                        </Link>
                        {/* What fires it, on the row: a catalog of names alone
                            does not say which of two similar e-mails is the
                            one going out at the wrong moment. */}
                        <span className="text-xs text-muted-foreground">
                          {t(`email_trigger.${flow.template}`)}
                        </span>
                      </span>
                    </td>
                    <td className={`${tdClass} whitespace-nowrap text-sm text-muted-foreground`}>
                      {t(`email_audience.${flow.audience}`)}
                    </td>
                    <td className={tdClass}>
                      <StatusBadge
                        tone={flow.enabled ? 'success' : 'warning'}
                        label={t(flow.enabled ? 'emails.state_on' : 'emails.state_off')}
                      />
                    </td>
                    <td
                      className={`${tdClass} text-right text-sm tabular-nums text-ink`}
                    >
                      {formatNumber(flow.metrics.sent, locale)}
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <span className="flex flex-col leading-tight">
                        <span className="text-sm tabular-nums text-ink">
                          {formatNumber(flow.metrics.delivered, locale)}
                        </span>
                        {rate !== null && (
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {formatPercent(rate, locale)}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className={`${tdClass} whitespace-nowrap`}>
                      <span className="flex flex-col leading-tight">
                        <span className="text-sm text-ink">
                          {t('emails.version', { version: flow.version })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(flow.updatedAt, locale)}
                        </span>
                      </span>
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <Link
                        href={`/backoffice/emails/${flow.template}`}
                        className={rowActionClass}
                      >
                        {t('emails.open')}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </TableShell>
        )}
      </Card>
    </div>
  )
}
