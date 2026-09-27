import type { EnrollmentStatus, SeatStatus } from './types'

// Client-safe on purpose: the ledger screen (a client component) builds its
// URLs with these, so nothing here may import the server-only `api-client`.

/**
 * What the reader narrowed the ledger to. Lives in the URL
 * (`/backoffice/enrollments?status=active&page=3`), so a filtered view survives
 * a reload and can be sent to a colleague as a link.
 */
export interface EnrollmentLedgerQuery {
  page: number
  status: EnrollmentStatus | null
  seat: SeatStatus | null
  /** `courses.language` — the label itself. */
  language: string | null
  /** Academic period id. */
  period: string | null
  q: string
  sort: 'newest' | 'oldest'
}

const STATUSES: EnrollmentStatus[] = ['under_review', 'active', 'completed', 'rejected']
const SEATS: SeatStatus[] = ['reserved', 'confirmed', 'released']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Mirrors the API's floor on `q` — shorter than this is no search at all. */
export const MIN_SEARCH_LENGTH = 2

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/**
 * Reads the ledger query out of the page's search params. Anything the API
 * would refuse is dropped here rather than sent: a hand-edited URL should land
 * on the unfiltered ledger, not on the "could not load" screen.
 */
export function parseEnrollmentLedgerQuery(
  params: Record<string, string | string[] | undefined>,
): EnrollmentLedgerQuery {
  const page = Number.parseInt(first(params.page) ?? '', 10)
  const status = first(params.status)
  const seat = first(params.seat)
  const language = first(params.language)?.trim()
  const period = first(params.period)
  const q = first(params.q)?.trim() ?? ''

  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    status: STATUSES.includes(status as EnrollmentStatus) ? (status as EnrollmentStatus) : null,
    seat: SEATS.includes(seat as SeatStatus) ? (seat as SeatStatus) : null,
    language: language && language.length <= 100 ? language : null,
    period: period && UUID.test(period) ? period : null,
    q: q.length >= MIN_SEARCH_LENGTH && q.length <= 100 ? q : '',
    sort: first(params.sort) === 'oldest' ? 'oldest' : 'newest',
  }
}

/** The same query as URL search params, leaving out whatever is the default. */
export function enrollmentLedgerSearchParams(query: EnrollmentLedgerQuery): URLSearchParams {
  const search = new URLSearchParams()
  if (query.page > 1) search.set('page', String(query.page))
  if (query.status) search.set('status', query.status)
  if (query.seat) search.set('seat', query.seat)
  if (query.language) search.set('language', query.language)
  if (query.period) search.set('period', query.period)
  if (query.q) search.set('q', query.q)
  if (query.sort !== 'newest') search.set('sort', query.sort)
  return search
}
