'use client'

import type { MouseEvent, ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import type { ClassGroupItem } from '@/lib/backoffice/types'
import { slotsLabel } from '@/lib/backoffice/schedule'
import { formatDateRange, type Locale } from '@/lib/format'
import { Meter, StatusBadge, TableShell, tdClass, thClass } from '@/components/backoffice/ui'
import { classGroupTone, seatPressureTone } from '@/components/backoffice/status-tone'

/** How many cells a row has — a divider row spans all of them. */
export const CLASS_GROUP_COLUMNS = 6

/**
 * The class group table: headings once, rows below. Both sections of the
 * screen (running and closed) use it, so they read the same column for column.
 * The headings go to `TableShell` too — on a phone each cell prints its own
 * column name, matched by position (`apps/app/CLAUDE.md`, Celular).
 */
export function ClassGroupTable({ children }: { children: ReactNode }) {
  const t = useTranslations('bo')
  const columns = [
    t('class_groups.col_class_group'),
    t('class_groups.col_teacher'),
    t('class_groups.col_schedule'),
    t('class_groups.col_dates'),
    t('class_groups.col_seats'),
    t('class_groups.col_status'),
  ]
  return (
    <TableShell columns={columns}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column} className={thClass}>
              {column}
            </th>
          ))}
        </tr>
      </thead>
      {children}
    </TableShell>
  )
}

/**
 * One class group. The whole row opens it, not just the name: the anchor stays
 * in the first cell so the keyboard, the screen reader and ctrl+click keep
 * working — the row handler only covers the mouse, and steps aside when the
 * click already landed on the link.
 */
export function ClassGroupTableRow({ row }: { row: ClassGroupItem }) {
  const t = useTranslations('bo')
  const locale = useLocale() as Locale
  const router = useRouter()
  const href = `/backoffice/class-groups/${row.id}`

  return (
    <tr
      className="cursor-pointer transition hover:bg-sky-soft"
      onClick={(event: MouseEvent<HTMLTableRowElement>) => {
        if ((event.target as HTMLElement).closest('a')) return
        router.push(href)
      }}
    >
      <td className={tdClass}>
        <Link href={href} className="font-semibold text-ink transition hover:text-brand-blue">
          {row.courseName}
        </Link>
        <span className="block text-xs tabular-nums text-muted-foreground">{row.code}</span>
      </td>
      <td className={`${tdClass} text-sm text-muted-foreground`}>{row.teacherName}</td>
      <td className={`${tdClass} text-sm tabular-nums text-muted-foreground`}>
        {slotsLabel(row.slots, t)}
      </td>
      <td className={`${tdClass} whitespace-nowrap text-sm tabular-nums text-muted-foreground`}>
        {row.startsOn && row.endsOn
          ? formatDateRange(row.startsOn, row.endsOn, locale)
          : t('class_groups.no_dates')}
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
          {row.waitlistCount > 0 && (
            <span className="text-[11px] font-semibold tabular-nums text-amber-700">
              {t('class_groups.waitlist_count', { count: row.waitlistCount })}
            </span>
          )}
        </span>
      </td>
      <td className={tdClass}>
        <span className="flex flex-wrap gap-1.5">
          <StatusBadge
            tone={classGroupTone[row.status]}
            label={t(`class_group_status.${row.status}`)}
          />
          {!row.active && <StatusBadge tone="neutral" label={t('class_groups.retired')} />}
          {!row.courseActive && (
            <StatusBadge tone="warning" label={t('class_groups.course_off_catalog')} />
          )}
        </span>
      </td>
    </tr>
  )
}
