'use client'

import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { StudentRow, StudentStatus } from '@/lib/backoffice/types'
import { ageFrom, formatDate, type Locale } from '@/lib/format'
import {
  Card,
  EmptyState,
  StatusBadge,
  TableShell,
  tdClass,
  thClass,
} from '@/components/backoffice/ui'
import { studentTone } from '@/components/backoffice/status-tone'
import { BoIcon } from '@/components/backoffice/icons'

type StatusFilter = StudentStatus | 'all'

const STATUS_FILTERS: StatusFilter[] = ['all', 'active', 'under_review', 'inactive']

/**
 * Student list with client-side search and status filter. Filtering runs in the
 * browser only because the dataset is mocked; with the real API this becomes a
 * server query (5k–7k enrollments/month will not fit in the client).
 */
export function StudentsTable({ rows }: { rows: StudentRow[] }) {
  const t = useTranslations('bo')
  const locale = useLocale() as Locale
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (status !== 'all' && row.status !== status) return false
      if (!needle) return true
      return [
        `${row.firstName} ${row.lastName}`,
        row.nationalId,
        row.email,
        row.phone,
        row.city,
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [rows, query, status])

  const counts = useMemo(() => {
    return {
      all: rows.length,
      active: rows.filter((r) => r.status === 'active').length,
      under_review: rows.filter((r) => r.status === 'under_review').length,
      inactive: rows.filter((r) => r.status === 'inactive').length,
    } satisfies Record<StatusFilter, number>
  }, [rows])

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative flex-1 lg:max-w-sm">
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

        <div className="flex flex-wrap items-center gap-1.5">
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
                    : 'border border-line bg-white text-muted-foreground hover:bg-sky'
                }`}
              >
                {value === 'all' ? t('students.filter_all') : t(`student_status.${value}`)}
                <span className={active ? 'text-white/70' : 'text-slate-400'}>
                  {counts[value]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <Card>
        {filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon="search"
              title={t('students.empty_title')}
              body={t('students.empty_body')}
            />
          </div>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <th className={thClass}>{t('students.col_student')}</th>
                <th className={thClass}>{t('students.col_document')}</th>
                <th className={thClass}>{t('students.col_contact')}</th>
                <th className={thClass}>{t('students.col_status')}</th>
                <th className={thClass}>{t('students.col_courses')}</th>
                <th className={thClass}>{t('students.col_last_activity')}</th>
                <th className={thClass}>
                  <span className="sr-only">{t('common.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="transition hover:bg-sky-soft">
                  <td className={`${tdClass} whitespace-nowrap`}>
                    <span className="flex flex-col leading-tight">
                      <span className="font-semibold">
                        {`${row.firstName} ${row.lastName}`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t('students.age_city', {
                          age: ageFrom(row.birthDate),
                          city: row.city,
                        })}
                        {row.isMinor ? ` · ${t('students.minor')}` : ''}
                      </span>
                    </span>
                  </td>
                  <td className={tdClass}>
                    <span className="flex flex-col leading-tight">
                      <span className="text-xs font-semibold uppercase text-muted-foreground">
                        {t(`national_id_type.${row.nationalIdType}`)}
                      </span>
                      <span className="tabular-nums">{row.nationalId}</span>
                    </span>
                  </td>
                  <td className={`${tdClass} whitespace-nowrap`}>
                    <span className="flex flex-col leading-tight">
                      <span className="truncate text-sm">{row.email}</span>
                      <span className="text-xs text-muted-foreground">{row.phone}</span>
                    </span>
                  </td>
                  <td className={tdClass}>
                    <StatusBadge
                      tone={studentTone[row.status]}
                      label={t(`student_status.${row.status}`)}
                    />
                  </td>
                  <td className={tdClass}>
                    <span className="flex flex-col leading-tight">
                      <span className="font-semibold tabular-nums">
                        {row.activeCourses}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t('students.total_enrollments', { count: row.totalEnrollments })}
                      </span>
                    </span>
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-sm text-muted-foreground`}>
                    {formatDate(row.lastActivityAt, locale)}
                  </td>
                  <td className={`${tdClass} text-right`}>
                    <Link
                      href={`/backoffice/students/${row.id}`}
                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-brand-blue transition hover:bg-sky"
                    >
                      {t('students.open_file')}
                      <BoIcon name="chevron-right" size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>

      <p className="text-xs text-muted-foreground">
        {t('students.showing', { shown: filtered.length, total: rows.length })}
      </p>
    </div>
  )
}
