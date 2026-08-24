import type { CatalogClassGroup, WeeklySlot } from './types'

/** One rendered session: the day, and the hours it runs. */
export interface ScheduleLine {
  key: string
  day: string
  time: string
}

/**
 * Drops a bare `:00` so a whole hour reads as `9` and a half hour still reads
 * as `6:30` — "9 às 13" is how a person says it out loud, and "09:00 às 13:00"
 * is how a database says it. Pure number formatting, no words, so it belongs in
 * code rather than in the locale files (`CLAUDE.md` §4).
 */
function hour(value: string): string {
  const [h, m] = value.split(':')
  const short = String(Number(h))
  return m === '00' ? short : `${short}:${m}`
}

/**
 * A class group's week, one line per session:
 *
 * ```
 * Terça-feira — 9 às 13
 * Quinta-feira — 6:30 às 8:30
 * ```
 *
 * One line per day rather than `Ter · Qui — 06:30 às 08:30`, because the two
 * are not the same claim: a group can meet at different hours on different
 * days, and the compressed form quietly asserts they are identical. It is also
 * simply easier to answer "can I make that?" one line at a time.
 *
 * The connector between the hours is a **word** — "às", "a", "to" — so it comes
 * from the locale, like the weekday names. The caller passes both translators
 * rather than calling `useTranslations` here, so one helper serves a server
 * component and a client one.
 */
export function scheduleLines(
  group: Pick<CatalogClassGroup, 'slots'>,
  weekdayLabel: (day: WeeklySlot['weekday']) => string,
  rangeLabel: (vars: { start: string; end: string }) => string,
): ScheduleLine[] {
  return group.slots.map((slot) => ({
    key: `${slot.weekday}-${slot.startTime}`,
    day: weekdayLabel(slot.weekday),
    time: rangeLabel({ start: hour(slot.startTime), end: hour(slot.endTime) }),
  }))
}
