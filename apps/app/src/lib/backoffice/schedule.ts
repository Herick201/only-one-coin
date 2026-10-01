import { scheduleLines } from '@/lib/enrollment/schedule'
import type { WeeklySlotItem } from './types'

type Translate = (key: string, values?: Record<string, string>) => string

/**
 * A class group's week in one line for a table cell — "Lun 18–19:30 · Mié
 * 18–19:30". Built on the checkout's own formatter so both screens say the
 * same hours the same way; words (weekday, range connector) come from the
 * locale.
 */
export function slotsLabel(slots: WeeklySlotItem[], t: Translate): string {
  return scheduleLines(
    { slots },
    (day) => t(`weekday.${day}`),
    (vars) => t('class_groups.time_range', vars),
  )
    .map((line) => `${line.day} ${line.time}`)
    .join(' · ')
}
