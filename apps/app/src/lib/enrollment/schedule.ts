import type { CatalogClassGroup } from './types'

/**
 * A class group's weekly slot, rendered as one line: `Lun · Mié — 19:00 a 20:30`.
 *
 * It lives here rather than inline in three screens because the connector
 * between the two hours is a **word** — "a", "às", "to" — and a word is UI copy
 * that belongs in the locale files (`CLAUDE.md` §4), not in a template literal.
 * The dot between weekdays stays a symbol, like the currency sign does.
 *
 * The caller passes the two translators rather than calling `useTranslations`
 * here, so the same helper serves a server component and a client one.
 */
export function scheduleLine(
  group: Pick<CatalogClassGroup, 'weekdays' | 'startTime' | 'endTime'>,
  weekdayLabel: (day: string) => string,
  rangeLabel: (vars: { days: string; start: string; end: string }) => string,
): string {
  return rangeLabel({
    days: group.weekdays.map(weekdayLabel).join(' · '),
    start: group.startTime,
    end: group.endTime,
  })
}
