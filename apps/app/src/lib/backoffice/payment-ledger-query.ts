// Client-safe on purpose: the ledger screen (a client component) builds its
// URLs with these, so nothing here may import the server-only `api-client`.

import type { PaymentMethod, PaymentStatus } from './types'

/**
 * What the reader narrowed the payment ledger to. Lives in the URL
 * (`/backoffice/payments?status=approved&page=3`), so a filtered view survives
 * a reload and can be sent to a colleague as a link.
 */
export interface PaymentLedgerQuery {
  page: number
  status: PaymentStatus | null
  method: PaymentMethod | null
  q: string
  sort: 'newest' | 'oldest'
}

/** The states as they are worked, not alphabetically: open ones first. */
export const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  'under_review',
  'pending',
  'approved',
  'rejected',
]

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  'yape',
  'plin',
  'bcp',
  'interbank',
  'other',
]

/** Mirrors the API's floor on `q` — shorter than this is no search at all. */
export const MIN_SEARCH_LENGTH = 2

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function oneOf<T extends string>(options: readonly T[], value: string | undefined): T | null {
  return options.find((option) => option === value) ?? null
}

/**
 * Reads the ledger query out of the page's search params. Anything the API
 * would refuse is dropped here rather than sent: a hand-edited URL should land
 * on the unfiltered ledger, not on the "could not load" screen.
 */
export function parsePaymentLedgerQuery(
  params: Record<string, string | string[] | undefined>,
): PaymentLedgerQuery {
  const page = Number.parseInt(first(params.page) ?? '', 10)
  const q = first(params.q)?.trim() ?? ''

  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    status: oneOf(PAYMENT_STATUSES, first(params.status)),
    method: oneOf(PAYMENT_METHODS, first(params.method)),
    q: q.length >= MIN_SEARCH_LENGTH && q.length <= 100 ? q : '',
    sort: first(params.sort) === 'oldest' ? 'oldest' : 'newest',
  }
}

/** The same query as URL search params, leaving out whatever is the default. */
export function paymentLedgerSearchParams(query: PaymentLedgerQuery): URLSearchParams {
  const search = new URLSearchParams()
  if (query.page > 1) search.set('page', String(query.page))
  if (query.status) search.set('status', query.status)
  if (query.method) search.set('method', query.method)
  if (query.q) search.set('q', query.q)
  if (query.sort !== 'newest') search.set('sort', query.sort)
  return search
}
