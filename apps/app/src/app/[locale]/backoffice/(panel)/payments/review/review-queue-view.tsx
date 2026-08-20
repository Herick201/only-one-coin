'use client'

import { useMemo, useState, type MouseEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import type { ReviewFlag, ReviewQueueItem } from '@/lib/backoffice/types'
import { formatDateTime, formatMoney, type Locale } from '@/lib/format'
import { paymentMethodLabel } from '@/lib/payment-method'
import {
  Card,
  EmptyState,
  Pager,
  StatusBadge,
  TableShell,
  tdClass,
  thClass,
} from '@/components/backoffice/ui'
import { reviewFlagTone } from '@/components/backoffice/status-tone'
import { BoIcon } from '@/components/backoffice/icons'

type FlagFilter = ReviewFlag | 'all'

/** Same order as the tier ladder reads: hard blocks first, then the doubts. */
const FLAG_FILTERS: FlagFilter[] = [
  'all',
  'amount_mismatch',
  'duplicate_phash',
  'model_divergence',
  'low_confidence',
  'illegible',
]

const PAGE_SIZE = 15

/**
 * The queue as a work list. Default order is oldest first — a receipt waiting
 * is a student waiting, and the promise on the home card is that the queue is
 * worked from the oldest one.
 *
 * Filtering and paging run in the browser only because the dataset is mocked;
 * with the real API this becomes a server query (up to 20k receipts a month in
 * peak season, CLAUDE.md §1).
 */
export function ReviewQueueView({ rows }: { rows: ReviewQueueItem[] }) {
  const t = useTranslations('bo')
  const locale = useLocale() as Locale
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [flag, setFlag] = useState<FlagFilter>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sort, setSort] = useState<'oldest' | 'newest'>('oldest')
  const [page, setPage] = useState(0)

  const counts = useMemo(() => {
    const seed = { all: rows.length } as Record<FlagFilter, number>
    for (const value of FLAG_FILTERS) if (value !== 'all') seed[value] = 0
    for (const row of rows) seed[row.flag] += 1
    return seed
  }, [rows])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const list = rows.filter((row) => {
      if (flag !== 'all' && row.flag !== flag) return false
      if (!needle) return true
      return [row.studentName, row.courseName, row.operationNumber ?? '']
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
    // The server hands the list over oldest first; newest is a reversal, not a
    // second sort key.
    return sort === 'oldest' ? list : [...list].reverse()
  }, [rows, query, flag, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  )

  function search(value: string) {
    setQuery(value)
    setPage(0)
  }

  function filterByFlag(value: FlagFilter) {
    setFlag(value)
    setPage(0)
  }

  /**
   * The whole row opens the student file, but the name stays a real link so
   * the keyboard, the screen reader and ctrl+click keep working — the row
   * handler only covers the mouse.
   */
  function rowProps(studentId: string) {
    return {
      className: 'cursor-pointer transition hover:bg-sky-soft',
      onClick: (event: MouseEvent<HTMLTableRowElement>) => {
        if ((event.target as HTMLElement).closest('a')) return
        router.push(`/backoffice/students/${studentId}`)
      },
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1 lg:max-w-sm">
            <span className="sr-only">{t('review_queue.search_label')}</span>
            <BoIcon
              name="search"
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => search(event.target.value)}
              placeholder={t('review_queue.search_placeholder')}
              className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-muted-foreground focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
            />
          </label>

          {/* Six reasons is a row of chips wide enough to shove the table
              down the page — they live behind the button, like the alumnos
              list does. */}
          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            aria-expanded={filtersOpen}
            className={`inline-flex items-center gap-1.5 self-start rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              flag !== 'all' || filtersOpen
                ? 'border-brand-blue bg-sky text-brand-blue'
                : 'border-line bg-white text-muted-foreground hover:text-ink'
            }`}
          >
            <BoIcon name="filter" size={16} />
            {t('review_queue.filters')}
            {flag !== 'all' && (
              <span className="rounded-full bg-brand-blue px-1.5 text-xs text-white">
                1
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSort(sort === 'oldest' ? 'newest' : 'oldest')}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:text-ink"
          >
            <BoIcon name="sort" size={16} />
            {t(
              sort === 'oldest' ? 'review_queue.sort_oldest' : 'review_queue.sort_newest',
            )}
          </button>
        </div>

        {/* One axis only: the flag is what tells one case from another here. */}
        {filtersOpen && (
          <Card className="flex flex-wrap items-center gap-1.5 p-3">
            {FLAG_FILTERS.map((value) => {
              const active = flag === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => filterByFlag(value)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'bg-brand-blue text-white'
                      : 'border border-line bg-white text-muted-foreground hover:bg-cream hover:text-ink'
                  }`}
                >
                  {value === 'all'
                    ? t('review_queue.filter_all')
                    : t(`review_flag.${value}`)}
                  <span className={active ? 'text-white/70' : 'text-slate-400'}>
                    {counts[value]}
                  </span>
                </button>
              )
            })}
          </Card>
        )}
      </div>

      {/* min-w-0: the row is wide enough to push a flex child past the page,
          and the scroll belongs to the table, never to the page. */}
      <Card className="min-w-0">
        {pageRows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={rows.length === 0 ? 'check' : 'search'}
              title={t(
                rows.length === 0 ? 'review.empty_title' : 'review_queue.empty_search_title',
              )}
              body={t(
                rows.length === 0 ? 'review.empty_body' : 'review_queue.empty_search_body',
              )}
            />
          </div>
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <th className={thClass}>{t('review.col_student')}</th>
                  <th className={thClass}>{t('review.col_amount')}</th>
                  <th className={thClass}>{t('review.col_flag')}</th>
                  <th className={thClass}>{t('review.col_extraction')}</th>
                  <th className={thClass}>{t('review_queue.col_operation')}</th>
                  <th className={thClass}>{t('review.col_submitted')}</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => {
                  const mismatch = row.amountCents !== row.expectedAmountCents
                  return (
                    <tr key={row.id} {...rowProps(row.studentId)}>
                      {/* Course rides under the name: it says which price the
                          receipt is being checked against, and as its own
                          column it pushed the table off the screen. */}
                      <td className={tdClass}>
                        <span className="block max-w-[15rem]">
                          <Link
                            href={`/backoffice/students/${row.studentId}`}
                            className="block truncate font-semibold text-ink transition hover:text-brand-blue"
                          >
                            {row.studentName}
                          </Link>
                          <span className="block truncate text-xs text-muted-foreground">
                            {row.courseName}
                          </span>
                        </span>
                      </td>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        <span
                          className={`font-semibold tabular-nums ${
                            mismatch ? 'text-red-600' : 'text-ink'
                          }`}
                        >
                          {formatMoney(row.amountCents, 'PEN', locale)}
                        </span>
                        {/* The expected value only earns a line when it differs
                            — otherwise it is noise on every row. */}
                        {mismatch && (
                          <span className="block text-xs tabular-nums text-muted-foreground">
                            {t('review.expected', {
                              amount: formatMoney(row.expectedAmountCents, 'PEN', locale),
                            })}
                          </span>
                        )}
                      </td>
                      <td className={tdClass}>
                        <StatusBadge
                          tone={reviewFlagTone[row.flag]}
                          label={t(`review_flag.${row.flag}`)}
                        />
                      </td>
                      <td className={`${tdClass} whitespace-nowrap text-xs text-muted-foreground`}>
                        <span className="block">{t('review.tier', { tier: row.tier })}</span>
                        <span className="block">
                          {t('review.confidence', {
                            value: Math.round(row.confidence * 100),
                          })}
                        </span>
                      </td>
                      <td className={`${tdClass} whitespace-nowrap text-xs text-muted-foreground`}>
                        <span className="block font-semibold text-ink">
                          {paymentMethodLabel[row.method]}
                        </span>
                        <span className="block tabular-nums">
                          {row.operationNumber ?? t('review_queue.no_operation')}
                        </span>
                      </td>
                      <td
                        className={`${tdClass} whitespace-nowrap text-sm tabular-nums text-muted-foreground`}
                      >
                        {formatDateTime(row.submittedAt, locale)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </TableShell>

            {pageCount > 1 && (
              <Pager
                page={currentPage}
                pageCount={pageCount}
                status={t('review_queue.page_status', {
                  page: currentPage + 1,
                  pages: pageCount,
                })}
                prevLabel={t('review_queue.page_prev')}
                nextLabel={t('review_queue.page_next')}
                onChange={setPage}
              />
            )}
          </>
        )}
      </Card>
    </div>
  )
}
