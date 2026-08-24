'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { monthNames, type Locale } from '@/lib/format'

/** Nobody enrolling was born more than a century ago, or in the last four years. */
const OLDEST_YEARS = 100
const YOUNGEST_YEARS = 4

/**
 * Date of birth as three selects, not `<input type="date">`.
 *
 * The native date input opens the **browser's own** calendar — chrome the page
 * cannot reach: no CSS selector styles that popup, so it lands on the checkout
 * in system blue and system type, next to a design that is neither.
 *
 * Three selects are not a workaround, they are the better control here. A
 * calendar is built for picking a day near today; a birth date is fifteen or
 * forty years back, which is a lot of paging to reach a value the reader
 * already knows. Picking the year first is one gesture. It also renders
 * identically on every browser, which is what "matches the design system"
 * actually requires.
 *
 * The value stays the ISO `YYYY-MM-DD` the domain stores; the split is this
 * component's business alone.
 */
export function BirthDateField({
  id,
  value,
  onChange,
  invalid = false,
}: {
  id: string
  value: string
  onChange: (iso: string) => void
  invalid?: boolean
}) {
  const t = useTranslations('enrollment')
  const locale = useLocale() as Locale

  /**
   * The three parts are local state, not slices of `value`.
   *
   * Deriving them from the ISO string looks tidier and is broken: the parent
   * only holds a date once all three are chosen, so the first pick would round
   * trip through an empty `value` and the select would snap back to blank in
   * front of the reader. The parts are what is being edited; the ISO date is
   * what falls out once they are complete.
   */
  const [initialYear = '', initialMonth = '', initialDay = ''] = value
    ? value.split('-')
    : []
  const [day, setDay] = useState(initialDay.replace(/^0/, ''))
  const [month, setMonth] = useState(initialMonth.replace(/^0/, ''))
  const [year, setYear] = useState(initialYear)

  const thisYear = new Date().getUTCFullYear()
  const years = Array.from(
    { length: OLDEST_YEARS - YOUNGEST_YEARS + 1 },
    (_, i) => thisYear - YOUNGEST_YEARS - i,
  )

  /** Only offer days the chosen month actually has — 31 February is not a date. */
  const daysInMonth =
    year && month ? new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate() : 31

  function set(next: { d?: string; m?: string; y?: string }) {
    const d = next.d ?? day
    const m = next.m ?? month
    const y = next.y ?? year
    if (next.d !== undefined) setDay(next.d)
    if (next.m !== undefined) setMonth(next.m)
    if (next.y !== undefined) setYear(next.y)
    if (!d || !m || !y) {
      // Incomplete is not a date. The parts stay on screen; the parent simply
      // does not have a birth date yet, and validation says so.
      onChange('')
      return
    }
    // Clamp rather than emit an impossible date: switching from 31 Jan to
    // February should land on the 28th, not wipe what was already chosen.
    const last = new Date(Date.UTC(Number(y), Number(m), 0)).getUTCDate()
    const safeDay = Math.min(Number(d), last)
    if (String(safeDay) !== d) setDay(String(safeDay))
    onChange(
      `${y}-${m.padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`,
    )
  }

  const base =
    'rounded-lg border bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:ring-2'
  const tone = invalid
    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15'
    : 'border-line focus:border-brand-blue focus:ring-brand-blue/15'

  return (
    <span className="flex gap-2">
      <select
        id={id}
        value={day}
        aria-label={t('field.day')}
        aria-invalid={invalid || undefined}
        onChange={(event) => set({ d: event.target.value })}
        className={`${base} ${tone} w-20 shrink-0`}
      >
        <option value="">{t('field.day')}</option>
        {Array.from({ length: daysInMonth }, (_, i) => String(i + 1)).map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      <select
        value={month}
        aria-label={t('field.month')}
        aria-invalid={invalid || undefined}
        onChange={(event) => set({ m: event.target.value })}
        className={`${base} ${tone} min-w-0 flex-1`}
      >
        <option value="">{t('field.month')}</option>
        {monthNames(locale).map((name, i) => (
          <option key={name} value={String(i + 1)}>
            {name}
          </option>
        ))}
      </select>

      <select
        value={year}
        aria-label={t('field.year')}
        aria-invalid={invalid || undefined}
        onChange={(event) => set({ y: event.target.value })}
        className={`${base} ${tone} w-24 shrink-0`}
      >
        <option value="">{t('field.year')}</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </select>
    </span>
  )
}
