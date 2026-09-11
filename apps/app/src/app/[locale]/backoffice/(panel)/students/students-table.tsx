'use client'

import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import type { StudentRow, StudentStatus } from '@/lib/backoffice/types'
import { formatDate, type Locale } from '@/lib/format'
import {
  Card,
  CursorPager,
  EmptyState,
  StatusBadge,
  TableShell,
  tdClass,
  thClass,
  Toolbar,
  toolbarSearchClass,
} from '@/components/backoffice/ui'
import { Toast } from '@/components/backoffice/controls'
import { studentTone } from '@/components/backoffice/status-tone'
import { BoIcon } from '@/components/backoffice/icons'
import { FiltersDropdown } from '@/components/backoffice/filters-dropdown'
import { NewStudentForm } from './new-student-form'

type StatusFilter = StudentStatus | 'all'

const STATUS_FILTERS: StatusFilter[] = ['all', 'active', 'under_review', 'inactive']

/**
 * The API's own floor for `q` (`apps/api/src/http/student/ListStudentsRoute.ts`,
 * `min(2)`): under two characters the search box would be asking the whole
 * directory for everything, so it stays a directory browse instead.
 */
const SEARCH_MIN = 2

/** Long enough that typing a name is one request, short enough to feel live. */
const SEARCH_DEBOUNCE_MS = 350

interface StudentPage {
  items: StudentRow[]
  nextCursor: string | null
}

/**
 * The student directory, paged by the server one screen at a time.
 *
 * It used to hold the whole list in the browser: the server's first page
 * landed in state, a "load more" button appended the next one, and search,
 * filters and counts ran over whatever had been appended so far. That reads
 * fine with a seeded database and breaks at the real size — the directory can
 * reach 20k students in a peak month (CLAUDE.md §1), which is 400 clicks to
 * reach the end and a search box that answers from the fraction already
 * downloaded without saying so.
 *
 * So nothing accumulates here. One server page is one screen, "previous" and
 * "next" are each a request (cursor pagination — there is no total to count
 * down to, only whether another page follows), and the search box asks the
 * server, which matches over every student rather than the ones on screen.
 *
 * The row carries only what tells one student from another — name, document,
 * state, load, last activity. Contact, place, age and enrollment history live
 * one click away in the ficha: repeating them per row made every line three
 * lines tall and pushed the table off the screen.
 */
export function StudentsTable({
  rows,
  initialNextCursor,
  canCreate,
}: {
  rows: StudentRow[]
  initialNextCursor: string | null
  canCreate: boolean
}) {
  const t = useTranslations('bo')
  const locale = useLocale() as Locale
  const router = useRouter()

  /** The page on screen — never more than the server just handed over. */
  const [pageRows, setPageRows] = useState<StudentRow[]>(rows)
  const [nextCursor, setNextCursor] = useState(initialNextCursor)
  /**
   * The cursor that fetched each page visited so far, so "previous" can ask
   * for a page again instead of keeping every row of it in memory. Index 0 is
   * the top of the listing, which needs no cursor.
   */
  const [cursorTrail, setCursorTrail] = useState<(string | null)[]>([null])
  const [pageIndex, setPageIndex] = useState(0)
  const [loading, setLoading] = useState(false)

  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  /** What actually went to the server — the typing, settled. */
  const [needle, setNeedle] = useState('')
  const searching = needle.length >= SEARCH_MIN

  /**
   * Status and age narrow the page in front of you, not the directory: the
   * list route takes neither as a parameter, so asking for "every student
   * under review" is a query this screen cannot make yet. The panel says so
   * where the choice is made, and nothing here prints a count — a total over
   * one page reads as a total over the padrón.
   */
  const [status, setStatus] = useState<StatusFilter>('all')
  const [minorsOnly, setMinorsOnly] = useState(false)

  const fetchPage = useCallback(
    async (options: { q?: string; cursor?: string | null }): Promise<StudentPage | null> => {
      const search = new URLSearchParams()
      if (options.q) search.set('q', options.q)
      if (options.cursor) search.set('cursor', options.cursor)
      const suffix = search.size > 0 ? `?${search.toString()}` : ''
      try {
        const response = await fetch(`/api/v1/students${suffix}`)
        if (!response.ok) return null
        return (await response.json()) as StudentPage
      } catch {
        return null
      }
    },
    [],
  )

  /* Typing settles before it becomes a request. */
  useEffect(() => {
    const trimmed = query.trim()
    const timer = setTimeout(
      () => setNeedle(trimmed.length >= SEARCH_MIN ? trimmed : ''),
      SEARCH_DEBOUNCE_MS,
    )
    return () => clearTimeout(timer)
  }, [query])

  /**
   * A new needle restarts the listing from the top. The first run is skipped:
   * page one of the browse already arrived rendered from the server component,
   * and refetching it on mount would flash the table for nothing.
   */
  const hydrated = useRef(false)
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true
      return
    }
    let stale = false
    setLoading(true)
    void (async () => {
      const page = await fetchPage({ q: needle || undefined })
      if (stale) return
      if (!page) {
        setToast(t('students.page_error'))
      } else {
        setPageRows(page.items)
        setNextCursor(page.nextCursor)
        setCursorTrail([null])
        setPageIndex(0)
      }
      setLoading(false)
    })()
    return () => {
      stale = true
    }
  }, [needle, fetchPage, t])

  /**
   * One turn of the pager, one request. Forward remembers the cursor it used
   * so coming back lands on the same page — the trail is a list of cursors,
   * not a cache of rows.
   */
  function turnPage(direction: 1 | -1) {
    if (loading) return
    const target = pageIndex + direction
    if (target < 0) return
    const cursor = direction === 1 ? nextCursor : (cursorTrail[target] ?? null)
    if (direction === 1 && !cursor) return

    setLoading(true)
    void (async () => {
      const page = await fetchPage({ q: needle || undefined, cursor })
      if (!page) {
        setToast(t('students.page_error'))
        setLoading(false)
        return
      }
      if (direction === 1) {
        setCursorTrail((trail) => {
          const next = [...trail]
          next[target] = cursor
          return next
        })
      }
      setPageRows(page.items)
      setNextCursor(page.nextCursor)
      setPageIndex(target)
      setLoading(false)
      /* A new page starts at its own first row, not wherever the last one was
         scrolled to. */
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })()
  }

  const visibleRows = pageRows.filter((row) => {
    if (status !== 'all' && row.status !== status) return false
    if (minorsOnly && !row.isMinor) return false
    return true
  })

  const activeFilters = (status !== 'all' ? 1 : 0) + (minorsOnly ? 1 : 0)

  /**
   * The whole row opens the ficha, but the name stays a real link in the first
   * cell so the keyboard, the screen reader and ctrl+click keep working — the
   * row handler only covers the mouse, and steps aside when the click already
   * landed on the link.
   */
  function rowProps(id: string) {
    const href = `/backoffice/students/${id}`
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
      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <Toolbar>
          <label className={toolbarSearchClass}>
            <span className="sr-only">{t('students.search_label')}</span>
            <BoIcon
              name="search"
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('students.search_placeholder')}
              className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-muted-foreground focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
            />
          </label>

          <FiltersDropdown
            label={t('students.filters')}
            count={activeFilters}
            panelClassName="flex-col items-start gap-2"
          >
            <span className="flex flex-wrap items-center gap-1.5">
              {STATUS_FILTERS.map((value) => {
                const active = status === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatus(value)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? 'bg-brand-blue text-white'
                        : 'border border-line bg-white text-muted-foreground hover:bg-cream hover:text-ink'
                    }`}
                  >
                    {value === 'all' ? t('students.filter_all') : t(`student_status.${value}`)}
                  </button>
                )
              })}

              <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />

              {/* Age is a second axis, not another status: "under review" and
                  "minor" answer different questions, and guardian consent
                  (CLAUDE.md §1) is chased across every status at once. */}
              <button
                type="button"
                onClick={() => setMinorsOnly(!minorsOnly)}
                aria-pressed={minorsOnly}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  minorsOnly
                    ? 'bg-brand-blue text-white'
                    : 'border border-line bg-white text-muted-foreground hover:bg-cream hover:text-ink'
                }`}
              >
                {t('students.minor')}
              </button>
            </span>

            <span className="text-xs text-muted-foreground">
              {t('students.filters_scope')}
            </span>
          </FiltersDropdown>

          {/* The exception path, not the way in: most students arrive by
              filling `/enrollment` themselves (CLAUDE.md §1). Hidden from
              whoever may not use it — the enforcing check is the role on the
              route in `apps/api` (CLAUDE.md §8). */}
          {canCreate && !creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="ml-auto inline-flex items-center gap-1.5 self-start rounded-lg bg-brand-blue px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-deep"
            >
              <BoIcon name="plus" size={16} />
              {t('students.new_student')}
            </button>
          )}
        </Toolbar>

        {/* A search answers from the whole directory but comes back as a short
            match list, so the screen says which of the two it is showing. */}
        {searching && (
          <p className="text-xs text-muted-foreground">{t('students.search_hint')}</p>
        )}
      </div>

      {creating && (
        <NewStudentForm
          onCancel={() => setCreating(false)}
          onCreate={(student) => {
            /* The new student belongs at the top of the listing, which is page
               one — showing them on page seven would be showing them in the
               wrong place. */
            setPageRows((current) => [student, ...current])
            setCreating(false)
            setToast(t('new_student.created'))
          }}
        />
      )}

      <Card>
        <div aria-busy={loading} className={loading ? 'opacity-60 transition' : 'transition'}>
          {visibleRows.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon="search"
                title={t('students.empty_title')}
                body={t('students.empty_body')}
              />
            </div>
          ) : (
            <>
              <TableShell
                columns={[
                  t('students.col_student'),
                  t('students.col_document'),
                  t('students.col_status'),
                  t('students.col_courses'),
                  t('students.col_last_activity'),
                ]}
              >
                <thead>
                  <tr>
                    <th className={thClass}>{t('students.col_student')}</th>
                    <th className={thClass}>{t('students.col_document')}</th>
                    <th className={thClass}>{t('students.col_status')}</th>
                    <th className={`${thClass} text-right`}>{t('students.col_courses')}</th>
                    <th className={thClass}>{t('students.col_last_activity')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.id} {...rowProps(row.id)}>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        <span className="flex items-center gap-2">
                          <Link
                            href={`/backoffice/students/${row.id}`}
                            className="font-semibold text-ink transition hover:text-brand-blue"
                          >
                            {`${row.firstName} ${row.lastName}`}
                          </Link>
                          {/* Guardian consent hangs on this one — it stays in the
                              list while everything else moved to the ficha. */}
                          {row.isMinor && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                              {t('students.minor')}
                            </span>
                          )}
                        </span>
                      </td>
                      <td
                        className={`${tdClass} whitespace-nowrap text-sm tabular-nums text-muted-foreground`}
                      >
                        {t('students.document', {
                          type: t(`national_id_type.${row.nationalIdType}`),
                          number: row.nationalId,
                        })}
                      </td>
                      <td className={tdClass}>
                        <StatusBadge
                          tone={studentTone[row.status]}
                          label={t(`student_status.${row.status}`)}
                        />
                      </td>
                      <td
                        className={`${tdClass} text-right text-sm font-semibold tabular-nums text-ink`}
                      >
                        {row.activeCourses}
                      </td>
                      <td
                        className={`${tdClass} whitespace-nowrap text-sm tabular-nums text-muted-foreground`}
                      >
                        {formatDate(row.lastActivityAt, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>

              {/* A search is one short list — there is no page two of it. */}
              {!searching && (pageIndex > 0 || nextCursor) && (
                <CursorPager
                  status={t('students.page_number', { page: pageIndex + 1 })}
                  prevLabel={t('students.page_prev')}
                  nextLabel={t('students.page_next')}
                  hasPrev={pageIndex > 0}
                  hasNext={Boolean(nextCursor)}
                  busy={loading}
                  onPrev={() => turnPage(-1)}
                  onNext={() => turnPage(1)}
                />
              )}
            </>
          )}
        </div>
      </Card>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
