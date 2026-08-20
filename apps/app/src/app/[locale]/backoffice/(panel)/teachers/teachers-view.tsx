'use client'

import { useMemo, useState, type MouseEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import type {
  CourseLanguage,
  TeacherRow,
  TeacherStatus,
} from '@/lib/backoffice/types'
import { countryName, flagEmoji } from '@/lib/geo'
import {
  Card,
  EmptyState,
  Pager,
  StatusBadge,
  TableShell,
  tdClass,
  thClass,
  Toolbar,
  toolbarSearchClass,
} from '@/components/backoffice/ui'
import { teacherTone } from '@/components/backoffice/status-tone'
import { BoIcon } from '@/components/backoffice/icons'
import { NewTeacherForm } from './new-teacher-form'

type StatusFilter = TeacherStatus | 'all'

const STATUS_FILTERS: StatusFilter[] = ['all', 'active', 'inactive']

const ALL = 'all'

const PAGE_SIZE = 15

const selectClass =
  'rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15'

/**
 * Teacher directory. Search, filters and paging run in the browser because the
 * dataset is mocked; against the real API this becomes a server query.
 *
 * The row answers the two questions the roster is opened for: what can this
 * person teach, and are they carrying anything right now. "Free" is a filter of
 * its own rather than a state, because on-the-roster-with-no-class-group is
 * exactly who coordination is looking for when a class group needs a teacher —
 * and it reads nothing like "inactive", which is somebody who left.
 */
export function TeachersView({
  rows,
  languages,
  canCreate,
}: {
  rows: TeacherRow[]
  languages: CourseLanguage[]
  canCreate: boolean
}) {
  const t = useTranslations('bo')
  const locale = useLocale()
  const router = useRouter()

  const [created, setCreated] = useState<TeacherRow[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [language, setLanguage] = useState(ALL)
  const [freeOnly, setFreeOnly] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [creating, setCreating] = useState(false)

  const all = useMemo(() => [...created, ...rows], [created, rows])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return all.filter((row) => {
      if (status !== 'all' && row.status !== status) return false
      if (language !== ALL && !row.languages.some((item) => item.id === language)) {
        return false
      }
      if (freeOnly && (row.activeClassGroups > 0 || row.status !== 'active')) return false
      if (!needle) return true
      return [
        `${row.firstName} ${row.lastName}`,
        row.email,
        row.phone,
        ...row.languages.map((item) => item.name),
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [all, query, status, language, freeOnly])

  const counts = useMemo(
    () => ({
      all: all.length,
      active: all.filter((row) => row.status === 'active').length,
      inactive: all.filter((row) => row.status === 'inactive').length,
    }),
    [all],
  )

  const freeCount = useMemo(
    () =>
      all.filter((row) => row.status === 'active' && row.activeClassGroups === 0).length,
    [all],
  )

  const activeFilters =
    (status !== 'all' ? 1 : 0) + (language !== ALL ? 1 : 0) + (freeOnly ? 1 : 0)

  /** A filter that shrinks the list can leave the page behind it. */
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  )

  /**
   * The whole row opens the ficha, but the name stays a real link so keyboard,
   * screen reader and ctrl+click keep working.
   */
  function rowProps(id: string) {
    const href = `/backoffice/teachers/${id}`
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
            <span className="sr-only">{t('teachers.search_label')}</span>
            <BoIcon
              name="search"
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(0)
              }}
              placeholder={t('teachers.search_placeholder')}
              className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-muted-foreground focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
            />
          </label>

          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            aria-expanded={filtersOpen}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              activeFilters > 0 || filtersOpen
                ? 'border-brand-blue bg-sky text-brand-blue'
                : 'border-line bg-white text-muted-foreground hover:text-ink'
            }`}
          >
            <BoIcon name="filter" size={16} />
            {t('teachers.filters')}
            {activeFilters > 0 && (
              <span className="rounded-full bg-brand-blue px-1.5 text-xs text-white">
                {activeFilters}
              </span>
            )}
          </button>

          {canCreate && !creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-deep lg:ml-auto"
            >
              <BoIcon name="plus" size={16} />
              {t('teachers.new')}
            </button>
          )}
        </Toolbar>

        {filtersOpen && (
          <Card className="flex flex-wrap items-center gap-1.5 p-3">
            {STATUS_FILTERS.map((value) => {
              const active = status === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setStatus(value)
                    setPage(0)
                  }}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'bg-brand-blue text-white'
                      : 'border border-line bg-white text-muted-foreground hover:bg-cream hover:text-ink'
                  }`}
                >
                  {value === 'all'
                    ? t('teachers.filter_all')
                    : t(`teacher_status.${value}`)}
                  <span className={active ? 'text-white/70' : 'text-slate-400'}>
                    {counts[value]}
                  </span>
                </button>
              )
            })}

            <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />

            <button
              type="button"
              onClick={() => {
                setFreeOnly(!freeOnly)
                setPage(0)
              }}
              aria-pressed={freeOnly}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                freeOnly
                  ? 'bg-brand-blue text-white'
                  : 'border border-line bg-white text-muted-foreground hover:bg-cream hover:text-ink'
              }`}
            >
              {t('teachers.filter_free')}
              <span className={freeOnly ? 'text-white/70' : 'text-slate-400'}>
                {freeCount}
              </span>
            </button>

            <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />

            <label className="flex items-center gap-2">
              <span className="sr-only">{t('teachers.filter_language')}</span>
              <select
                value={language}
                onChange={(event) => {
                  setLanguage(event.target.value)
                  setPage(0)
                }}
                className={selectClass}
              >
                <option value={ALL}>{t('teachers.filter_language')}</option>
                {languages.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </Card>
        )}
      </div>

      {creating && (
        <NewTeacherForm
          languages={languages}
          onCancel={() => setCreating(false)}
          onCreate={(teacher) => {
            setCreated((current) => [teacher, ...current])
            setCreating(false)
            setPage(0)
          }}
        />
      )}

      <Card>
        {pageRows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon="search"
              title={t('teachers.empty_title')}
              body={t('teachers.empty_body')}
            />
          </div>
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <th className={thClass}>{t('teachers.col_teacher')}</th>
                  <th className={thClass}>{t('teachers.col_languages')}</th>
                  <th className={`${thClass} text-right`}>
                    {t('teachers.col_class_groups')}
                  </th>
                  <th className={`${thClass} text-right`}>{t('teachers.col_students')}</th>
                  <th className={thClass}>{t('teachers.col_pending')}</th>
                  <th className={thClass}>{t('teachers.col_status')}</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id} {...rowProps(row.id)}>
                    <td className={`${tdClass} whitespace-nowrap`}>
                      <Link
                        href={`/backoffice/teachers/${row.id}`}
                        className="font-semibold text-ink transition hover:text-brand-blue"
                      >
                        {`${row.firstName} ${row.lastName}`}
                      </Link>
                      {/* Origin is on the row, not only in the ficha: the
                          catalog sells the Italian class group on its
                          "docente ítalo-peruano" (`docs/REGRAS-NEGOCIO.md`
                          §3), so it is what one teacher is told from another
                          by when the class group is being advertised. */}
                      <p className="text-xs text-muted-foreground">
                        {`${flagEmoji(row.nationality)} ${countryName(row.nationality, locale)}`}
                      </p>
                    </td>
                    <td className={tdClass}>
                      <span className="flex flex-wrap gap-1">
                        {row.languages.map((item) => (
                          <span
                            key={item.id}
                            className="whitespace-nowrap rounded-full bg-sky px-2 py-0.5 text-[11px] font-semibold text-brand-blue-deep"
                          >
                            {item.name}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td
                      className={`${tdClass} text-right text-sm font-semibold tabular-nums text-ink`}
                    >
                      {row.activeClassGroups > 0 ? (
                        row.activeClassGroups
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground">
                          {t('teachers.free')}
                        </span>
                      )}
                    </td>
                    <td
                      className={`${tdClass} text-right text-sm tabular-nums text-muted-foreground`}
                    >
                      {row.studentCount}
                    </td>
                    <td className={`${tdClass} whitespace-nowrap text-xs`}>
                      <span className="flex flex-col leading-tight">
                        {row.pendingGrades > 0 && (
                          <span className="font-semibold text-amber-700">
                            {t('teachers.pending_grades', { count: row.pendingGrades })}
                          </span>
                        )}
                        {row.pendingCertificates > 0 && (
                          <span className="font-semibold text-amber-700">
                            {t('teachers.pending_certificates', {
                              count: row.pendingCertificates,
                            })}
                          </span>
                        )}
                        {row.pendingGrades === 0 && row.pendingCertificates === 0 && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </span>
                    </td>
                    <td className={tdClass}>
                      <StatusBadge
                        tone={teacherTone[row.status]}
                        label={t(`teacher_status.${row.status}`)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>

            {pageCount > 1 && (
              <Pager
                page={currentPage}
                pageCount={pageCount}
                status={t('teachers.page_status', {
                  from: currentPage * PAGE_SIZE + 1,
                  to: currentPage * PAGE_SIZE + pageRows.length,
                  total: filtered.length,
                })}
                prevLabel={t('teachers.page_prev')}
                nextLabel={t('teachers.page_next')}
                onChange={setPage}
              />
            )}
          </>
        )}
      </Card>
    </div>
  )
}
