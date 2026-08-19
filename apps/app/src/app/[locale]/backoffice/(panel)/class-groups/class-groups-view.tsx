'use client'

import { useMemo, useState, type MouseEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import type {
  ClassGroupRow,
  ClassModality,
  Weekday,
} from '@/lib/backoffice/types'
import { formatDate, formatDateRange, type Locale } from '@/lib/format'
import {
  Card,
  EmptyState,
  Meter,
  Pager,
  StatusBadge,
  TableShell,
  tdClass,
  thClass,
} from '@/components/backoffice/ui'
import { classGroupTone, seatPressureTone } from '@/components/backoffice/status-tone'
import { BoIcon } from '@/components/backoffice/icons'

type Sort = 'newest' | 'oldest'

const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const MODALITIES: ClassModality[] = ['online', 'in_person', 'hybrid']

const ALL = 'all'

/**
 * Closed groups only grow — a year of class groups would push the active list
 * off the screen. Ten a page keeps the section scannable without hiding the
 * pending count in the header, which is what the 25-business-day deadline
 * hangs on (`docs/DOCUMENTOS-E-CERTIFICADOS.md` §3).
 */
const CLOSED_PAGE_SIZE = 10

const selectClass =
  'rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15'

/**
 * Class group directory: active groups up top, folded by language, and the
 * finished ones in their own section below.
 *
 * The split is deliberate. Day-to-day work happens on what is running, but a
 * finished class group still owes certificates — so the closed section carries
 * the pending count in its header and opens by itself while anything is
 * outstanding. Hiding that behind a collapsed section is how a deadline gets
 * missed (`docs/REGRAS-NEGOCIO.md` §6: 25 business days).
 *
 * Search and filters run in the browser because the dataset is mocked; against
 * the real API this becomes a server query.
 */
export function ClassGroupsView({
  rows,
  canCreate,
}: {
  rows: ClassGroupRow[]
  canCreate: boolean
}) {
  const t = useTranslations('bo')
  const locale = useLocale() as Locale
  const router = useRouter()

  const [created, setCreated] = useState<ClassGroupRow[]>([])
  const [query, setQuery] = useState('')
  const [language, setLanguage] = useState(ALL)
  const [teacher, setTeacher] = useState(ALL)
  const [period, setPeriod] = useState(ALL)
  const [sort, setSort] = useState<Sort>('newest')
  const [filtersOpen, setFiltersOpen] = useState(false)
  /** Language groups the user folded away. Everything starts open. */
  const [folded, setFolded] = useState<string[]>([])
  const [closedPage, setClosedPage] = useState(0)
  const [creating, setCreating] = useState(false)
  const [createdAt, setCreatedAt] = useState<string | null>(null)

  const all = useMemo(() => [...created, ...rows], [created, rows])

  const options = useMemo(() => {
    const languages = new Map(all.map((row) => [row.language.id, row.language]))
    const teachers = new Map(all.map((row) => [row.teacherId, row.teacherName]))
    const periods = [...new Set(all.map((row) => row.academicPeriodName))].sort()
    return {
      languages: [...languages.values()].sort((a, b) => a.name.localeCompare(b.name)),
      teachers: [...teachers.entries()].sort((a, b) => a[1].localeCompare(b[1])),
      periods,
    }
  }, [all])

  const activeFilters =
    (language !== ALL ? 1 : 0) + (teacher !== ALL ? 1 : 0) + (period !== ALL ? 1 : 0)

  const scheduleLabel = (row: ClassGroupRow) =>
    `${row.weekdays.map((day) => t(`weekday.${day}`)).join('/')} · ${row.startTime}`

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return all.filter((row) => {
      if (language !== ALL && row.language.id !== language) return false
      if (teacher !== ALL && row.teacherId !== teacher) return false
      if (period !== ALL && row.academicPeriodName !== period) return false
      if (!needle) return true
      return [row.courseName, row.code, row.teacherName, row.language.name]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [all, query, language, teacher, period])

  const byDate = (a: ClassGroupRow, b: ClassGroupRow) =>
    sort === 'newest'
      ? b.startDate.localeCompare(a.startDate)
      : a.startDate.localeCompare(b.startDate)

  /** Active = still enrolling or running, folded by language. */
  const activeByLanguage = useMemo(() => {
    const active = filtered.filter(
      (row) => row.status === 'enrolling' || row.status === 'in_progress',
    )
    const map = new Map<string, { id: string; name: string; groups: ClassGroupRow[] }>()
    for (const row of active) {
      const entry =
        map.get(row.language.id) ??
        { id: row.language.id, name: row.language.name, groups: [] }
      entry.groups.push(row)
      map.set(row.language.id, entry)
    }
    return [...map.values()]
      .map((entry) => ({
        ...entry,
        groups: [...entry.groups].sort(byDate),
        // Seats rolled up per language: the divider carries the number so a
        // folded language still says whether it is filling up.
        seatsTaken: entry.groups.reduce((sum, row) => sum + row.seatsTaken, 0),
        capacity: entry.groups.reduce((sum, row) => sum + row.capacity, 0),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sort])

  /** Finished or closed. Whatever still owes a certificate comes first. */
  const closed = useMemo(
    () =>
      filtered
        .filter((row) => row.status === 'finished' || row.status === 'closed')
        .sort(
          (a, b) => b.pendingCertificates - a.pendingCertificates || byDate(a, b),
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, sort],
  )

  const pendingGroups = closed.filter((row) => row.pendingCertificates > 0).length
  const activeCount = activeByLanguage.reduce((sum, e) => sum + e.groups.length, 0)

  /**
   * The page is clamped instead of reset by an effect: a filter that shrinks
   * the list would otherwise leave the user staring at an empty page, and an
   * effect for that would render twice on every keystroke.
   */
  const closedPageCount = Math.max(1, Math.ceil(closed.length / CLOSED_PAGE_SIZE))
  const currentClosedPage = Math.min(closedPage, closedPageCount - 1)
  const closedPageRows = closed.slice(
    currentClosedPage * CLOSED_PAGE_SIZE,
    currentClosedPage * CLOSED_PAGE_SIZE + CLOSED_PAGE_SIZE,
  )

  const allFolded =
    activeByLanguage.length > 0 && folded.length >= activeByLanguage.length

  function toggleAll() {
    setFolded(allFolded ? [] : activeByLanguage.map((entry) => entry.id))
  }

  function toggleLanguage(id: string) {
    setFolded((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  function clearFilters() {
    setLanguage(ALL)
    setTeacher(ALL)
    setPeriod(ALL)
  }

  /**
   * The whole row opens the class group, not just the name. The anchor stays
   * in the first cell so the keyboard, the screen reader and ctrl+click keep
   * working — the row handler only covers the mouse, and steps aside when the
   * click already landed on the link.
   */
  function rowProps(id: string) {
    const href = `/backoffice/class-groups/${id}`
    return {
      className: 'cursor-pointer transition hover:bg-sky-soft',
      onClick: (event: MouseEvent<HTMLTableRowElement>) => {
        if ((event.target as HTMLElement).closest('a')) return
        router.push(href)
      },
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1 lg:max-w-sm">
            <span className="sr-only">{t('class_groups.search_label')}</span>
            <BoIcon
              name="search"
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('class_groups.search_placeholder')}
              className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-muted-foreground focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
            />
          </label>

          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              activeFilters > 0 || filtersOpen
                ? 'border-brand-blue bg-sky text-brand-blue'
                : 'border-line bg-white text-muted-foreground hover:text-ink'
            }`}
          >
            <BoIcon name="filter" size={16} />
            {t('class_groups.filters')}
            {activeFilters > 0 && (
              <span className="rounded-full bg-brand-blue px-1.5 text-xs text-white">
                {activeFilters}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSort(sort === 'newest' ? 'oldest' : 'newest')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:text-ink"
          >
            <BoIcon name="sort" size={16} />
            {t(sort === 'newest' ? 'class_groups.sort_newest' : 'class_groups.sort_oldest')}
          </button>

          {canCreate && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-deep lg:ml-auto"
            >
              <BoIcon name="plus" size={16} />
              {t('class_groups.new_class_group')}
            </button>
          )}
        </div>

        {filtersOpen && (
          <Card className="flex flex-wrap items-end gap-3 p-4">
            <label className="flex min-w-40 flex-1 flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('class_groups.filter_language')}
              </span>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className={selectClass}
              >
                <option value={ALL}>{t('class_groups.filter_all')}</option>
                {options.languages.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex min-w-40 flex-1 flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('class_groups.filter_teacher')}
              </span>
              <select
                value={teacher}
                onChange={(event) => setTeacher(event.target.value)}
                className={selectClass}
              >
                <option value={ALL}>{t('class_groups.filter_all')}</option>
                {options.teachers.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex min-w-40 flex-1 flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('class_groups.filter_period')}
              </span>
              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                className={selectClass}
              >
                <option value={ALL}>{t('class_groups.filter_all')}</option>
                {options.periods.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            {activeFilters > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:text-ink"
              >
                {t('class_groups.clear_filters')}
              </button>
            )}
          </Card>
        )}
      </div>

      {creating && (
        <NewClassGroupForm
          languages={options.languages}
          teachers={options.teachers}
          periods={options.periods}
          onCancel={() => setCreating(false)}
          onCreate={(row) => {
            setCreated((current) => [row, ...current])
            setCreating(false)
            setCreatedAt(new Date().toISOString())
            // A new class group that lands outside the active filter would just
            // vanish. Reset the view so the user sees what they created.
            setQuery('')
            clearFilters()
          }}
        />
      )}

      {createdAt && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <BoIcon name="alert" size={14} className="mt-0.5 shrink-0" />
          {t('class_groups.created_local_only', {
            time: formatDate(createdAt, locale),
          })}
        </p>
      )}

      {/* Active, folded by language */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 className="text-base font-semibold text-ink">
            {t('class_groups.active_title')}
          </h2>
          <span className="text-sm text-muted-foreground">
            {t('class_groups.group_count', { count: activeCount })}
          </span>
          {activeByLanguage.length > 1 && (
            <button
              type="button"
              onClick={toggleAll}
              className="ml-auto text-xs font-semibold text-muted-foreground transition hover:text-brand-blue"
            >
              {t(allFolded ? 'class_groups.expand_all' : 'class_groups.collapse_all')}
            </button>
          )}
        </div>

        {activeByLanguage.length === 0 ? (
          <Card className="p-4">
            <EmptyState
              icon={query || activeFilters > 0 ? 'search' : 'courses'}
              title={t(
                query || activeFilters > 0
                  ? 'class_groups.empty_search_title'
                  : 'class_groups.empty_active_title',
              )}
              body={t(
                query || activeFilters > 0
                  ? 'class_groups.empty_search_body'
                  : 'class_groups.empty_active_body',
              )}
            />
          </Card>
        ) : (
          <Card>
            <TableShell>
              <thead>
                <tr>
                  <th className={thClass}>{t('class_groups.col_class_group')}</th>
                  <th className={thClass}>{t('class_groups.col_schedule')}</th>
                  <th className={thClass}>{t('class_groups.col_teacher')}</th>
                  <th className={thClass}>{t('class_groups.col_dates')}</th>
                  <th className={thClass}>{t('class_groups.col_seats')}</th>
                  <th className={thClass}>{t('class_groups.col_status')}</th>
                </tr>
              </thead>
              {activeByLanguage.map((entry) => {
                const open = !folded.includes(entry.id)
                return (
                  <tbody key={entry.id}>
                    {/* Language divider doubles as the fold control. One table
                        for every language keeps the columns aligned. */}
                    <tr>
                      <td colSpan={6} className="border-y border-line bg-slate-50/80 p-0">
                        <button
                          type="button"
                          onClick={() => toggleLanguage(entry.id)}
                          aria-expanded={open}
                          className="flex w-full items-center gap-2 px-4 py-1.5 text-left transition hover:bg-slate-100 focus:outline-none focus-visible:bg-slate-100"
                        >
                          <BoIcon
                            name="chevron-down"
                            size={14}
                            className={`text-muted-foreground transition-transform ${
                              open ? '' : '-rotate-90'
                            }`}
                          />
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {entry.name}
                          </span>
                          <span className="text-xs text-muted-foreground/70">
                            {t('class_groups.group_count', {
                              count: entry.groups.length,
                            })}
                          </span>
                          <span className="ml-auto text-xs tabular-nums text-muted-foreground/70">
                            {`${entry.seatsTaken} / ${entry.capacity}`}
                          </span>
                        </button>
                      </td>
                    </tr>

                    {open &&
                      entry.groups.map((row) => (
                        <tr key={row.id} {...rowProps(row.id)}>
                          <td className={tdClass}>
                            <Link
                              href={`/backoffice/class-groups/${row.id}`}
                              className="font-semibold text-ink transition hover:text-brand-blue"
                            >
                              {row.courseName}
                            </Link>
                          </td>
                          <td className={`${tdClass} whitespace-nowrap text-sm tabular-nums text-muted-foreground`}>
                            {scheduleLabel(row)}
                          </td>
                          <td className={`${tdClass} text-sm text-muted-foreground`}>
                            {row.teacherName}
                          </td>
                          <td className={`${tdClass} whitespace-nowrap text-sm tabular-nums text-muted-foreground`}>
                            {formatDateRange(row.startDate, row.endDate, locale)}
                          </td>
                          <td className={tdClass}>
                            <span className="flex w-28 flex-col gap-1.5">
                              <span className="flex items-baseline justify-between gap-1">
                                <span className="text-xs font-semibold tabular-nums text-ink">
                                  {`${row.seatsTaken} / ${row.capacity}`}
                                </span>
                                <span className="text-[11px] tabular-nums text-muted-foreground">
                                  {t('class_groups.seats_left', {
                                    count: Math.max(0, row.capacity - row.seatsTaken),
                                  })}
                                </span>
                              </span>
                              <Meter
                                value={row.seatsTaken}
                                max={row.capacity}
                                tone={seatPressureTone(row.seatsTaken, row.capacity)}
                              />
                            </span>
                          </td>
                          <td className={tdClass}>
                            <StatusBadge
                              tone={classGroupTone[row.status]}
                              label={t(`class_group_status.${row.status}`)}
                            />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                )
              })}
            </TableShell>
          </Card>
        )}
      </section>

      {/* Finished + closed. Opens by itself while a certificate is pending. */}
      <section className="flex flex-col gap-3">
        <Card as="section">
          <details open={pendingGroups > 0}>
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3.5 [&::-webkit-details-marker]:hidden">
              <BoIcon name="chevron-down" size={16} className="text-muted-foreground" />
              <span className="text-sm font-semibold text-ink">
                {t('class_groups.closed_title')}
              </span>
              <span className="text-xs text-muted-foreground">
                {t('class_groups.group_count', { count: closed.length })}
              </span>
              {pendingGroups > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                  <BoIcon name="alert" size={14} />
                  {t('class_groups.pending_warning', { count: pendingGroups })}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {t('class_groups.all_up_to_date')}
                </span>
              )}
            </summary>

            {closed.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon="doc"
                  title={t('class_groups.empty_closed_title')}
                  body={t('class_groups.empty_closed_body')}
                />
              </div>
            ) : (
              <>
                <TableShell>
                  <thead>
                    <tr>
                      <th className={thClass}>{t('class_groups.col_class_group')}</th>
                      <th className={thClass}>{t('class_groups.col_period')}</th>
                      <th className={thClass}>{t('class_groups.col_teacher')}</th>
                      <th className={thClass}>{t('class_groups.col_dates')}</th>
                      <th className={thClass}>{t('class_groups.col_status')}</th>
                      <th className={thClass}>{t('class_groups.col_pending')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closedPageRows.map((row) => (
                      <tr key={row.id} {...rowProps(row.id)}>
                        <td className={tdClass}>
                          <Link
                            href={`/backoffice/class-groups/${row.id}`}
                            className="font-semibold text-ink transition hover:text-brand-blue"
                          >
                            {row.courseName}
                          </Link>
                        </td>
                        <td className={`${tdClass} whitespace-nowrap text-sm text-muted-foreground`}>
                          {row.academicPeriodName}
                        </td>
                        <td className={`${tdClass} text-sm text-muted-foreground`}>
                          {row.teacherName}
                        </td>
                        <td className={`${tdClass} whitespace-nowrap text-sm tabular-nums text-muted-foreground`}>
                          {formatDateRange(row.startDate, row.endDate, locale)}
                        </td>
                        <td className={tdClass}>
                          <StatusBadge
                            tone={classGroupTone[row.status]}
                            label={t(`class_group_status.${row.status}`)}
                          />
                        </td>
                        <td className={tdClass}>
                          {row.pendingCertificates > 0 ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                              <BoIcon name="alert" size={14} />
                              {t('class_groups.pending_certificates', {
                                count: row.pendingCertificates,
                              })}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {t('class_groups.none_pending')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>

                {closedPageCount > 1 && (
                  <Pager
                    page={currentClosedPage}
                    pageCount={closedPageCount}
                    status={t('class_groups.page_status', {
                      from: currentClosedPage * CLOSED_PAGE_SIZE + 1,
                      to: currentClosedPage * CLOSED_PAGE_SIZE + closedPageRows.length,
                      total: closed.length,
                    })}
                    prevLabel={t('class_groups.page_prev')}
                    nextLabel={t('class_groups.page_next')}
                    onChange={setClosedPage}
                  />
                )}
              </>
            )}
          </details>
        </Card>
      </section>
    </div>
  )
}

/**
 * Creating a class group is screen-local: it prepends a row so the list can be
 * seen with it, and says so. The real write is a usecase in `packages/domain`
 * behind `apps/api` — the browser never writes (CLAUDE.md §8).
 */
function NewClassGroupForm({
  languages,
  teachers,
  periods,
  onCancel,
  onCreate,
}: {
  languages: { id: string; name: string }[]
  teachers: [string, string][]
  periods: string[]
  onCancel: () => void
  onCreate: (row: ClassGroupRow) => void
}) {
  const t = useTranslations('bo')

  const [languageId, setLanguageId] = useState(languages[0]?.id ?? '')
  const [courseName, setCourseName] = useState('')
  const [code, setCode] = useState('')
  const [teacherId, setTeacherId] = useState(teachers[0]?.[0] ?? '')
  const [modality, setModality] = useState<ClassModality>('online')
  const [academicPeriodName, setPeriod] = useState(periods[0] ?? '')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [weekdays, setWeekdays] = useState<Weekday[]>([])
  const [startTime, setStartTime] = useState('18:00')
  const [capacity, setCapacity] = useState(30)

  const ready =
    courseName.trim() !== '' &&
    code.trim() !== '' &&
    startDate !== '' &&
    endDate !== '' &&
    weekdays.length > 0

  function toggleDay(day: Weekday) {
    setWeekdays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
    )
  }

  function submit() {
    const language = languages.find((item) => item.id === languageId)
    const teacher = teachers.find(([id]) => id === teacherId)
    if (!language || !teacher) return
    onCreate({
      id: `cg_local_${startDate}_${startTime}`,
      courseName: courseName.trim(),
      code: code.trim().toUpperCase(),
      language,
      weekdays: WEEKDAYS.filter((day) => weekdays.includes(day)),
      startTime,
      teacherId: teacher[0],
      teacherName: teacher[1],
      modality,
      academicPeriodName,
      startDate,
      endDate,
      seatsTaken: 0,
      capacity,
      status: 'enrolling',
      certificateRule: 'automatic',
      // Which procedures the class group offers is catalog config; the form
      // has no field for it yet, so a new group starts with neither.
      allowsFreeze: false,
      allowsTransfer: false,
      pendingCertificates: 0,
    })
  }

  return (
    <Card className="p-5">
      <p className="mb-4 text-sm font-semibold text-ink">
        {t('class_groups.new_title')}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('class_groups.field_language')}
          </span>
          <select
            value={languageId}
            onChange={(event) => setLanguageId(event.target.value)}
            className={selectClass}
          >
            {languages.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('class_groups.field_course')}
          </span>
          <input
            value={courseName}
            onChange={(event) => setCourseName(event.target.value)}
            placeholder={t('class_groups.course_placeholder')}
            className={selectClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('class_groups.field_code')}
          </span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder={t('class_groups.code_placeholder')}
            className={`${selectClass} uppercase tabular-nums`}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('class_groups.field_teacher')}
          </span>
          <select
            value={teacherId}
            onChange={(event) => setTeacherId(event.target.value)}
            className={selectClass}
          >
            {teachers.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('class_groups.field_modality')}
          </span>
          <select
            value={modality}
            onChange={(event) => setModality(event.target.value as ClassModality)}
            className={selectClass}
          >
            {MODALITIES.map((item) => (
              <option key={item} value={item}>
                {t(`modality.${item}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('class_groups.field_period')}
          </span>
          <select
            value={academicPeriodName}
            onChange={(event) => setPeriod(event.target.value)}
            className={selectClass}
          >
            {periods.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('class_groups.field_capacity')}
          </span>
          <input
            type="number"
            min={1}
            value={capacity}
            onChange={(event) => setCapacity(Number(event.target.value))}
            className={selectClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('class_groups.field_start')}
          </span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className={selectClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('class_groups.field_end')}
          </span>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className={selectClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('class_groups.field_time')}
          </span>
          <input
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            className={selectClass}
          />
        </label>
      </div>

      <fieldset className="mt-3">
        <legend className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('class_groups.field_days')}
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((day) => {
            const on = weekdays.includes(day)
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                aria-pressed={on}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  on
                    ? 'bg-brand-blue text-white'
                    : 'border border-line bg-white text-muted-foreground hover:text-ink'
                }`}
              >
                {t(`weekday.${day}`)}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={!ready}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          <BoIcon name="check" size={16} />
          {t('class_groups.create')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-muted-foreground transition hover:text-ink"
        >
          {t('student_file.cancel')}
        </button>
      </div>
    </Card>
  )
}
