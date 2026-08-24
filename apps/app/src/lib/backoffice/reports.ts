import type {
  ClassGroupDetail,
  ClassGroupRow,
  CourseLanguage,
  EnrollmentRow,
} from './types'

/**
 * Report aggregation, in one place.
 *
 * The reports screen does not hold a dataset of its own: it is the enrollment
 * ledger and the class group list read from a different angle. Money comes from
 * the enrollments (approved is collected, open is owed, rejected is neither)
 * and occupancy comes from the class groups — a seat is taken the moment it is
 * reserved, so the seat map is never rebuilt from enrollment history.
 *
 * Paid procedures (the constancia, `docs/REGRAS-NEGOCIO.md` §5) are deliberately
 * out: they are settled in the payments section and carry no academic period to
 * be reported under. The screen says so rather than folding them in silently.
 *
 * UI-side derivation for the mockup — against the real API these numbers are a
 * server query, because the ledger reaches 20k rows a month in peak season
 * (CLAUDE.md §1) and nobody aggregates that in a browser.
 */

/** How the table is cut. The period is a filter, not a cut — it scopes them all. */
export type ReportDimension = 'course' | 'language' | 'teacher'

/** Every period, filter included. `all` is a scope, never a period's name. */
export const ALL_PERIODS = 'all'

/**
 * The row's name is catalogue data — a course, a language, a teacher — and is
 * shown as written (CLAUDE.md §4). The exception is history pointing at a
 * course the catalog dropped: there is no name left to print, and the locale
 * has to say so in words rather than the screen showing an empty cell.
 */
export type ReportLabel = { kind: 'name'; name: string } | { kind: 'unknown' }

export interface ReportRow {
  key: string
  label: ReportLabel
  /** Second line of the name cell — the language a course belongs to. */
  sublabel: string | null
  enrollments: number
  active: number
  /** Seats held by an enrollment whose payment is not settled yet. */
  reserved: number
  /** Approved money, integer cents (CLAUDE.md §5). */
  collectedCents: number
  /** Money still open — pending or under review. Rejected is not owed. */
  pendingCents: number
  currency: 'PEN'
  seatsTaken: number
  capacity: number
  classGroups: number
}

export interface ReportTotals {
  enrollments: number
  active: number
  reserved: number
  collectedCents: number
  pendingCents: number
  /** How many enrollments make up `pendingCents` — money owed by how many. */
  pendingCount: number
  currency: 'PEN'
  seatsTaken: number
  capacity: number
  classGroups: number
}

export interface ReportMonth {
  /** `2026-08` — resolved to a month name by the reader's locale. */
  month: string
  enrollments: number
  collectedCents: number
}

export interface ReportData {
  rows: ReportRow[]
  totals: ReportTotals
  /** Oldest first, with the empty months in between kept: a gap is a fact. */
  months: ReportMonth[]
}

/** Money already in the account. Everything else is either owed or gone. */
function isCollected(row: EnrollmentRow): boolean {
  return row.paymentStatus === 'approved'
}

/** Money still expected — a rejected receipt is not a debt, it is a no. */
function isOwed(row: EnrollmentRow): boolean {
  return row.paymentStatus === 'pending' || row.paymentStatus === 'under_review'
}

/** The periods present in the data, newest first — never a list kept by hand. */
export function listReportPeriods(
  enrollments: EnrollmentRow[],
  classGroups: ClassGroupRow[],
): string[] {
  const periods = new Set<string>()
  for (const row of enrollments) periods.add(row.academicPeriodName)
  for (const group of classGroups) periods.add(group.academicPeriodName)
  return [...periods].sort((a, b) => b.localeCompare(a))
}

/**
 * Course name → language, read off the catalogue side. The enrollment carries
 * its own language, but it is resolved through the class group whose roster
 * claims it, and a roster that claims the wrong enrollment files a French
 * student under English. The catalogue is what a course's language actually is,
 * so it wins; the enrollment's copy is only the fallback for a course no class
 * group in the data opens any more.
 *
 * Built from every class group, never from the ones in scope: a course does not
 * change language between periods.
 */
function languageIndex(classGroups: ClassGroupRow[]): Map<string, CourseLanguage> {
  return new Map(classGroups.map((group) => [group.courseName, group.language]))
}

function languageOf(
  row: EnrollmentRow,
  index: Map<string, CourseLanguage>,
): CourseLanguage | null {
  return index.get(row.courseName) ?? row.language
}

/** The key both sides of the join agree on, so a course meets its own seats. */
function enrollmentKey(
  row: EnrollmentRow,
  dimension: ReportDimension,
  language: CourseLanguage | null,
): string {
  switch (dimension) {
    case 'course':
      return `course:${row.courseName}`
    case 'language':
      return language ? `language:${language.id}` : 'language:unknown'
    case 'teacher':
      return `teacher:${row.teacherName}`
  }
}

function classGroupKey(group: ClassGroupRow, dimension: ReportDimension): string {
  switch (dimension) {
    case 'course':
      return `course:${group.courseName}`
    case 'language':
      return `language:${group.language.id}`
    case 'teacher':
      return `teacher:${group.teacherName}`
  }
}

function enrollmentLabel(
  row: EnrollmentRow,
  dimension: ReportDimension,
  language: CourseLanguage | null,
): { label: ReportLabel; sublabel: string | null } {
  switch (dimension) {
    case 'course':
      return {
        label: { kind: 'name', name: row.courseName },
        sublabel: language?.name ?? null,
      }
    case 'language':
      return {
        label: language ? { kind: 'name', name: language.name } : { kind: 'unknown' },
        sublabel: null,
      }
    case 'teacher':
      return { label: { kind: 'name', name: row.teacherName }, sublabel: null }
  }
}

function classGroupLabel(
  group: ClassGroupRow,
  dimension: ReportDimension,
): { label: ReportLabel; sublabel: string | null } {
  switch (dimension) {
    case 'course':
      return {
        label: { kind: 'name', name: group.courseName },
        sublabel: group.language.name,
      }
    case 'language':
      return { label: { kind: 'name', name: group.language.name }, sublabel: null }
    case 'teacher':
      return { label: { kind: 'name', name: group.teacherName }, sublabel: null }
  }
}

function emptyRow(
  key: string,
  label: ReportLabel,
  sublabel: string | null,
): ReportRow {
  return {
    key,
    label,
    sublabel,
    enrollments: 0,
    active: 0,
    reserved: 0,
    collectedCents: 0,
    pendingCents: 0,
    currency: 'PEN',
    seatsTaken: 0,
    capacity: 0,
    classGroups: 0,
  }
}

/** `2026-08` from an ISO instant, as the ledger stores it. */
function monthOf(iso: string): string {
  return iso.slice(0, 7)
}

/** Every month from the first to the last, so a month with nothing reads as a
 *  gap in the line instead of disappearing from it. */
function monthsBetween(first: string, last: string): string[] {
  const months: string[] = []
  let year = Number(first.slice(0, 4))
  let month = Number(first.slice(5, 7))
  const end = last
  for (let guard = 0; guard < 240; guard += 1) {
    const key = `${year}-${String(month).padStart(2, '0')}`
    months.push(key)
    if (key >= end) break
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return months
}

/**
 * One cut of the report: the rows, the totals behind them and the month line.
 *
 * `period` scopes both sides — `ALL_PERIODS` reads the whole history, which is
 * what a course's lifetime figure is, and a single ciclo is what the institution
 * closes against.
 */
export function buildReport(
  enrollments: EnrollmentRow[],
  classGroups: ClassGroupRow[],
  dimension: ReportDimension,
  period: string = ALL_PERIODS,
): ReportData {
  const inScope = (name: string) => period === ALL_PERIODS || name === period

  const scopedEnrollments = enrollments.filter((row) =>
    inScope(row.academicPeriodName),
  )
  const scopedGroups = classGroups.filter((group) =>
    inScope(group.academicPeriodName),
  )

  const languages = languageIndex(classGroups)
  const rows = new Map<string, ReportRow>()

  for (const row of scopedEnrollments) {
    const language = languageOf(row, languages)
    const key = enrollmentKey(row, dimension, language)
    const { label, sublabel } = enrollmentLabel(row, dimension, language)
    const entry = rows.get(key) ?? emptyRow(key, label, sublabel)
    entry.enrollments += 1
    if (row.status === 'active') entry.active += 1
    if (row.seatStatus === 'reserved') entry.reserved += 1
    if (isCollected(row)) entry.collectedCents += row.amountCents
    if (isOwed(row)) entry.pendingCents += row.amountCents
    rows.set(key, entry)
  }

  for (const group of scopedGroups) {
    const key = classGroupKey(group, dimension)
    const { label, sublabel } = classGroupLabel(group, dimension)
    const entry = rows.get(key) ?? emptyRow(key, label, sublabel)
    // A class group carries the catalogue name; an enrollment of a dropped
    // course does not. Whichever side has a name wins the cell.
    if (entry.label.kind === 'unknown') entry.label = label
    entry.sublabel = sublabel ?? entry.sublabel
    entry.seatsTaken += group.seatsTaken
    entry.capacity += group.capacity
    entry.classGroups += 1
    rows.set(key, entry)
  }

  const totals: ReportTotals = {
    enrollments: scopedEnrollments.length,
    active: scopedEnrollments.filter((row) => row.status === 'active').length,
    reserved: scopedEnrollments.filter((row) => row.seatStatus === 'reserved').length,
    collectedCents: scopedEnrollments
      .filter(isCollected)
      .reduce((total, row) => total + row.amountCents, 0),
    pendingCents: scopedEnrollments
      .filter(isOwed)
      .reduce((total, row) => total + row.amountCents, 0),
    pendingCount: scopedEnrollments.filter(isOwed).length,
    currency: 'PEN',
    seatsTaken: scopedGroups.reduce((total, group) => total + group.seatsTaken, 0),
    capacity: scopedGroups.reduce((total, group) => total + group.capacity, 0),
    classGroups: scopedGroups.length,
  }

  return {
    rows: [...rows.values()],
    totals,
    months: buildMonths(scopedEnrollments),
  }
}

/** The month line, by the date the enrollment was opened. */
function buildMonths(enrollments: EnrollmentRow[]): ReportMonth[] {
  if (enrollments.length === 0) return []

  const byMonth = new Map<string, ReportMonth>()
  for (const row of enrollments) {
    const month = monthOf(row.createdAt)
    const entry = byMonth.get(month) ?? { month, enrollments: 0, collectedCents: 0 }
    entry.enrollments += 1
    if (isCollected(row)) entry.collectedCents += row.amountCents
    byMonth.set(month, entry)
  }

  const keys = [...byMonth.keys()].sort()
  return monthsBetween(keys[0], keys[keys.length - 1]).map(
    (month) => byMonth.get(month) ?? { month, enrollments: 0, collectedCents: 0 },
  )
}

/** Occupancy as a whole percentage. No class group open is not zero occupancy. */
export function occupancyPct(seatsTaken: number, capacity: number): number | null {
  if (capacity === 0) return null
  return Math.round((seatsTaken / capacity) * 100)
}


/* -------------------------------------------------------------------------- */
/* Rankings and trend — the four counts, drawn                                 */
/* -------------------------------------------------------------------------- */

/**
 * The four questions coordination asks of a ciclo, in the order they get asked:
 * what sells, what freezes, what fails, what people walk away from.
 *
 * Always by course, whatever cut the table is on: "which course freezes most"
 * is a question about the catalog, and it would stop being one if the answer
 * changed to a teacher's name because a chip was clicked.
 */
export type RankingMetric = 'volume' | 'frozen' | 'low_grades' | 'withdrawn'

export const RANKING_METRICS: RankingMetric[] = [
  'volume',
  'frozen',
  'low_grades',
  'withdrawn',
]

export interface RankedCourse {
  courseName: string
  count: number
}

/**
 * A grade that did not pass: below the minimum, or a DA — the student who never
 * sat the final exam (`docs/REGRAS-NEGOCIO.md` §3). An open grade is not a low
 * one, which is why a ciclo still running reports none.
 */
function isLowGrade(status: ClassGroupDetail['students'][number]['gradeStatus']): boolean {
  return status === 'failed' || status === 'auto_failed'
}

function ranked(counts: Map<string, number>): RankedCourse[] {
  return [...counts]
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([courseName, count]) => ({ courseName, count }))
}

/**
 * Each count, by course, biggest first — the shape a bar chart is drawn from.
 *
 * Volume is read off the enrollment ledger; the other three are read off the
 * class group rosters, because that is where a grade and an administrative
 * procedure are recorded — a procedure is something coordination registers over
 * an enrollment (`docs/REGRAS-NEGOCIO.md` §5), never something the ledger row
 * carries by itself.
 *
 * An empty list means nothing of the kind happened in the period. That is an
 * answer, not a missing number: a ciclo still enrolling has no closed grades
 * yet, and the chart has to say so instead of drawing courses at zero.
 */
export function buildRankings(
  enrollments: EnrollmentRow[],
  rosters: ClassGroupDetail[],
  period: string = ALL_PERIODS,
): Record<RankingMetric, RankedCourse[]> {
  const inScope = (name: string) => period === ALL_PERIODS || name === period

  const volume = new Map<string, number>()
  for (const row of enrollments) {
    if (!inScope(row.academicPeriodName)) continue
    volume.set(row.courseName, (volume.get(row.courseName) ?? 0) + 1)
  }

  const frozen = new Map<string, number>()
  const withdrawn = new Map<string, number>()
  const lowGrades = new Map<string, number>()

  for (const group of rosters) {
    if (!inScope(group.academicPeriodName)) continue
    for (const student of group.students) {
      if (student.procedure === 'frozen') {
        frozen.set(group.courseName, (frozen.get(group.courseName) ?? 0) + 1)
      }
      if (student.procedure === 'withdrawn') {
        withdrawn.set(group.courseName, (withdrawn.get(group.courseName) ?? 0) + 1)
      }
      if (isLowGrade(student.gradeStatus)) {
        lowGrades.set(group.courseName, (lowGrades.get(group.courseName) ?? 0) + 1)
      }
    }
  }

  return {
    volume: ranked(volume),
    frozen: ranked(frozen),
    low_grades: ranked(lowGrades),
    withdrawn: ranked(withdrawn),
  }
}

export interface TrendSeries {
  key: string
  label: ReportLabel
  /** One value per period, in the same order as `TrendData.periods`. */
  values: number[]
}

export interface TrendData {
  /** Oldest ciclo first — a trend read right to left is not a trend. */
  periods: string[]
  series: TrendSeries[]
}

/**
 * How each course — or language, or teacher — moved from one ciclo to the next.
 *
 * Deliberately **not** scoped by the period filter: a single ciclo has no
 * trend in it, and a chart that emptied out the moment somebody filtered would
 * be answering a different question than the one it is titled with. It follows
 * the cut, so it stays the same subject as the rest of the screen, and it is
 * capped at `limit` lines — past four, a line chart is a plate of spaghetti.
 */
export function buildTrend(
  enrollments: EnrollmentRow[],
  classGroups: ClassGroupRow[],
  dimension: ReportDimension,
  limit: number,
): TrendData {
  // Chronological, which is the reverse of how the filter lists them.
  const periods = listReportPeriods(enrollments, classGroups).reverse()
  const index = new Map(periods.map((period, position) => [period, position]))

  const languages = languageIndex(classGroups)
  const series = new Map<string, TrendSeries>()

  for (const row of enrollments) {
    const position = index.get(row.academicPeriodName)
    if (position === undefined) continue

    const language = languageOf(row, languages)
    const key = enrollmentKey(row, dimension, language)
    const entry =
      series.get(key) ??
      ({
        key,
        label: enrollmentLabel(row, dimension, language).label,
        values: periods.map(() => 0),
      } satisfies TrendSeries)
    entry.values[position] += 1
    series.set(key, entry)
  }

  const total = (item: TrendSeries) =>
    item.values.reduce((sum, value) => sum + value, 0)

  return {
    periods,
    series: [...series.values()].sort((a, b) => total(b) - total(a)).slice(0, limit),
  }
}
