'use client'

import { useCallback, useEffect, useState, useTransition, type MouseEvent } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import type { PaymentReviewItem, ReviewDecision } from '@/lib/backoffice/types'
import {
  MIN_SEARCH_LENGTH,
  reviewQueueSearchParams,
  type ReviewQueueQuery,
} from '@/lib/backoffice/payment-ledger-query'
import { approvePayment, rejectPayment } from '@/lib/backoffice/payment-client'
import { formatDateTime, formatMoney, type Locale } from '@/lib/format'
import {
  Card,
  EmptyState,
  Pager,
  StatusBadge,
  TableShell,
  tdClass,
  thClass,
  rowActionClass,
  Toolbar,
  toolbarSearchClass,
} from '@/components/backoffice/ui'
import { Toast } from '@/components/backoffice/controls'
import { fraudSignalTone, receiptStateTone } from '@/components/backoffice/status-tone'
import { BoIcon } from '@/components/backoffice/icons'
import { ReceiptReviewDialog, deadlineState, type DecideOutcome } from './receipt-review-dialog'

/** Long enough to finish a word, short enough to feel like typing. */
const SEARCH_DEBOUNCE_MS = 350

/**
 * The queue as a work list, oldest first — a payment waiting is a student
 * waiting, and the promise on the home card is that the queue is worked from
 * the oldest one.
 *
 * The row triages; the decision happens in the dialog, next to the receipt
 * image and to what the student declared. Settling a payment from a list is
 * how a mismatch gets approved because the row looked like the one above it.
 *
 * Search and paging are the URL, and the URL is a query to Postgres
 * (`GET /api/v1/payments/review`): this component never holds more than the
 * page on screen. A decision goes to the API and the page is re-rendered from
 * the server — the row leaves because the payment is settled, not because the
 * browser dropped it.
 */
export function ReviewQueueView({
  items,
  total,
  pageSize,
  query,
  canReview,
  openReceiptId,
  renderedAt,
}: {
  items: PaymentReviewItem[]
  /** Open payments matching the query, across every page. */
  total: number
  pageSize: number
  query: ReviewQueueQuery
  canReview: boolean
  /**
   * One payment to open on arrival — another screen sent the reader straight
   * to it. Honoured only if it is on this page and they may settle it: a link
   * is a request, not a permission (CLAUDE.md §8).
   */
  openReceiptId?: string | null
  /** When the server rendered the page — what the deadline is measured from. */
  renderedAt: number
}) {
  const t = useTranslations('bo')
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()

  const [reviewing, setReviewing] = useState<PaymentReviewItem | null>(() =>
    canReview && openReceiptId
      ? (items.find((item) => item.id === openReceiptId) ?? null)
      : null,
  )
  const [toast, setToast] = useState<string | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])

  /**
   * True while the server renders the page the reader just asked for. The
   * table stays on screen, dimmed, instead of blanking.
   */
  const [pending, startTransition] = useTransition()

  /** Any change to the query goes back to page 1, unless it IS the page. */
  function navigate(next: Partial<ReviewQueueQuery>, mode: 'push' | 'replace' = 'push') {
    const search = reviewQueueSearchParams({ ...query, page: 1, ...next }).toString()
    const href = search ? `${pathname}?${search}` : pathname
    startTransition(() => {
      router[mode](href, { scroll: false })
    })
  }

  /**
   * Typed into locally, sent after a pause — a request per keystroke would be
   * a full-queue ILIKE per keystroke. Under the API's minimum length it is not
   * a search yet, so nothing is sent.
   */
  const [searchText, setSearchText] = useState(query.q)
  useEffect(() => {
    const needle = searchText.trim()
    if (needle === query.q) return
    if (needle.length > 0 && needle.length < MIN_SEARCH_LENGTH) return

    const timer = setTimeout(() => navigate({ q: needle }, 'replace'), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
    // `navigate` closes over `query`, which is already a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, query])

  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(query.page, pageCount) - 1

  /** Closes the case, says why, and re-reads the queue from the server. */
  function settled(message: string) {
    setReviewing(null)
    setToast(message)
    startTransition(() => {
      router.refresh()
    })
  }

  async function decide(paymentId: string, decision: ReviewDecision): Promise<DecideOutcome> {
    const result =
      decision.kind === 'approve'
        ? await approvePayment(paymentId)
        : await rejectPayment(paymentId, decision.reason, decision.note)

    if (result.ok) {
      settled(t(decision.kind === 'approve' ? 'review.approved_toast' : 'review.rejected_toast'))
      return { kind: 'done' }
    }
    switch (result.error) {
      // Somebody else decided it first. Not an error of this reader: the case
      // is closed and the queue is re-read so the row disappears.
      case 'already_settled':
      case 'not_found':
        settled(t('review.already_settled_toast'))
        return { kind: 'done' }
      // The seat went back to the class group while the payment waited; the
      // case changed under the reader, so the queue is re-read too.
      case 'seat_released':
        settled(t('review.seat_released_toast'))
        return { kind: 'done' }
      default:
        return { kind: 'stay', error: result.error }
    }
  }

  /**
   * The row opens the payment, it does not leave the queue. Sending a reviewer
   * to the student file mid-triage loses the page and the place in the list.
   * The button in the last column is the keyboard path; this only covers the
   * mouse.
   */
  function rowProps(item: PaymentReviewItem) {
    if (!canReview) return {}
    return {
      className: 'cursor-pointer transition hover:bg-sky-soft',
      onClick: (event: MouseEvent<HTMLTableRowElement>) => {
        if ((event.target as HTMLElement).closest('a,button')) return
        setReviewing(item)
      },
    }
  }

  const columns = [
    t('review.col_student'),
    t('review.col_course'),
    t('receipt_review.check_expected'),
    t('review.col_submitted'),
    t('review.col_deadline'),
    t('review.col_receipt'),
    t('review.col_signals'),
    '',
  ]

  return (
    <div className="flex flex-col gap-4">
      <Toolbar>
        <label className={toolbarSearchClass}>
          <span className="sr-only">{t('review_queue.search_label')}</span>
          <BoIcon
            name="search"
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder={t('review_queue.search_placeholder')}
            className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-muted-foreground focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
          />
        </label>
      </Toolbar>

      {/* min-w-0: the row is wide enough to push a flex child past the page,
          and the scroll belongs to the table, never to the page. */}
      <Card
        className={`min-w-0 transition-opacity ${pending ? 'opacity-60' : ''}`}
        aria-busy={pending}
      >
        {items.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={query.q ? 'search' : 'check'}
              title={t(query.q ? 'review_queue.empty_search_title' : 'review.empty_title')}
              body={t(query.q ? 'review_queue.empty_search_body' : 'review.empty_body')}
            />
          </div>
        ) : (
          <>
            <TableShell columns={columns}>
              <thead>
                <tr>
                  {columns.slice(0, -1).map((label) => (
                    <th key={label} className={thClass}>
                      {label}
                    </th>
                  ))}
                  <th className={thClass}>
                    <span className="sr-only">{t('common.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const deadline = deadlineState(item.reviewDeadline, renderedAt)
                  return (
                    <tr key={item.id} {...rowProps(item)}>
                      <td className={tdClass}>
                        <span className="block max-w-[14rem] truncate font-semibold text-ink">
                          {item.studentName}
                        </span>
                      </td>

                      {/* The class group rides under the course: it says which
                          seat the payment is holding. */}
                      <td className={tdClass}>
                        <span className="block max-w-[15rem]">
                          <span className="block truncate text-sm text-ink">
                            {item.courseName}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {item.classGroupName}
                          </span>
                        </span>
                      </td>

                      <td className={`${tdClass} whitespace-nowrap font-semibold tabular-nums`}>
                        {formatMoney(item.expectedAmountCents, item.currency, locale)}
                      </td>

                      <td
                        className={`${tdClass} whitespace-nowrap text-sm tabular-nums text-muted-foreground`}
                      >
                        {formatDateTime(item.submittedAt, locale)}
                      </td>

                      {/* Red from a day out: the window closing is what the
                          reviewer needs to see before it happens. */}
                      <td
                        className={`${tdClass} whitespace-nowrap text-sm tabular-nums ${
                          deadline !== 'ok'
                            ? 'font-semibold text-red-600'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {formatDateTime(item.reviewDeadline, locale)}
                        {deadline === 'overdue' && (
                          <span className="block text-xs">{t('review.deadline_overdue')}</span>
                        )}
                      </td>

                      <td className={tdClass}>
                        <StatusBadge
                          tone={receiptStateTone[item.receipt]}
                          label={t(`receipt_state.${item.receipt}`)}
                        />
                      </td>

                      <td className={tdClass}>
                        {item.fraudSignals.length > 0 && (
                          <span className="flex flex-wrap gap-1">
                            {item.fraudSignals.map((signal) => (
                              <StatusBadge
                                key={signal}
                                tone={fraudSignalTone[signal]}
                                label={t(`fraud_signal.${signal}`)}
                              />
                            ))}
                          </span>
                        )}
                      </td>

                      <td className={`${tdClass} whitespace-nowrap text-right`}>
                        {canReview && (
                          <button
                            type="button"
                            onClick={() => setReviewing(item)}
                            className={rowActionClass}
                          >
                            {t('receipt_review.open')}
                            <BoIcon name="chevron-right" size={14} />
                          </button>
                        )}
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
                onChange={(page) => navigate({ page: page + 1 })}
              />
            )}
          </>
        )}
      </Card>

      <ReceiptReviewDialog
        payment={reviewing}
        renderedAt={renderedAt}
        onClose={() => setReviewing(null)}
        onDecide={decide}
      />
      <Toast message={toast} onDismiss={dismissToast} />
    </div>
  )
}
