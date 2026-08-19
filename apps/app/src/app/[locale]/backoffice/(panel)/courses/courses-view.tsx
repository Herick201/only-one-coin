'use client'

import { useMemo, useState, type MouseEvent } from 'react'
import { useTranslations } from 'next-intl'
import type { CourseOptions, CourseRow } from '@/lib/backoffice/types'
import {
  Card,
  EmptyState,
  StatusBadge,
  TableShell,
  tdClass,
  thClass,
} from '@/components/backoffice/ui'
import { BoIcon } from '@/components/backoffice/icons'
import { CourseOptionsSheet } from './course-options-sheet'
import { NewCourseForm } from './new-course-form'

/**
 * The catalog, folded by language like the class group list — the two screens
 * are read the same way and there is no reason for them to disagree.
 *
 * Changing a course changes every class group opened from it afterwards, never
 * the ones already running: a student enrolled under a rule keeps that rule,
 * the same reasoning that freezes the price version at enrollment (CLAUDE.md
 * §5). The sheet says so where the change is made.
 */
export function CoursesView({
  rows,
  canCreate,
  canConfigure,
}: {
  rows: CourseRow[]
  canCreate: boolean
  canConfigure: boolean
}) {
  const t = useTranslations('bo')

  const [courses, setCourses] = useState<CourseRow[]>(rows)
  const [query, setQuery] = useState('')
  const [configuring, setConfiguring] = useState<CourseRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [touched, setTouched] = useState(false)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return courses
    return courses.filter((row) =>
      [row.name, row.language.name, row.level].join(' ').toLowerCase().includes(needle),
    )
  }, [courses, query])

  const byLanguage = useMemo(() => {
    const map = new Map<string, { id: string; name: string; courses: CourseRow[] }>()
    for (const row of filtered) {
      const entry =
        map.get(row.language.id) ??
        { id: row.language.id, name: row.language.name, courses: [] }
      entry.courses.push(row)
      map.set(row.language.id, entry)
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [filtered])

  function saveOptions(course: CourseRow, options: CourseOptions) {
    setCourses((current) =>
      current.map((row) => (row.id === course.id ? { ...row, ...options } : row)),
    )
    setTouched(true)
  }

  function rowProps(course: CourseRow) {
    if (!canConfigure) return { className: 'transition' }
    return {
      className: 'cursor-pointer transition hover:bg-sky-soft',
      onClick: (event: MouseEvent<HTMLTableRowElement>) => {
        if ((event.target as HTMLElement).closest('button')) return
        setConfiguring(course)
      },
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative flex-1 lg:max-w-sm">
          <span className="sr-only">{t('courses.search_label')}</span>
          <BoIcon
            name="search"
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('courses.search_placeholder')}
            className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-muted-foreground focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
          />
        </label>

        {canCreate && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-deep lg:ml-auto"
          >
            <BoIcon name="plus" size={16} />
            {t('courses.new_course')}
          </button>
        )}
      </div>

      {creating && (
        <NewCourseForm
          languages={[...new Map(courses.map((row) => [row.language.id, row.language])).values()]}
          onCancel={() => setCreating(false)}
          onCreate={(course) => {
            setCourses((current) => [course, ...current])
            setCreating(false)
            setQuery('')
            setTouched(true)
          }}
        />
      )}

      {touched && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <BoIcon name="alert" size={14} className="mt-0.5 shrink-0" />
          {t('courses.local_only')}
        </p>
      )}

      {byLanguage.length === 0 ? (
        <Card className="p-4">
          <EmptyState
            icon={query ? 'search' : 'courses'}
            title={t(query ? 'courses.empty_search_title' : 'courses.empty_title')}
            body={t(query ? 'courses.empty_search_body' : 'courses.empty_body')}
          />
        </Card>
      ) : (
        <Card>
          <TableShell>
            <thead>
              <tr>
                <th className={thClass}>{t('courses.col_course')}</th>
                <th className={thClass}>{t('courses.col_level')}</th>
                <th className={thClass}>{t('courses.col_load')}</th>
                <th className={thClass}>{t('courses.col_min_age')}</th>
                <th className={thClass}>{t('courses.col_class_groups')}</th>
                <th className={thClass}>{t('courses.col_status')}</th>
              </tr>
            </thead>
            {byLanguage.map((entry) => (
              <tbody key={entry.id}>
                <tr>
                  <td
                    colSpan={6}
                    className="border-y border-line bg-slate-50/80 px-4 py-1.5"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {entry.name}
                    </span>
                  </td>
                </tr>
                {entry.courses.map((course) => (
                  <tr key={course.id} {...rowProps(course)}>
                    <td className={`${tdClass} font-semibold`}>{course.name}</td>
                    <td className={`${tdClass} text-sm text-muted-foreground`}>
                      {course.level}
                    </td>
                    <td
                      className={`${tdClass} whitespace-nowrap text-sm tabular-nums text-muted-foreground`}
                    >
                      {t('courses.load_value', {
                        modules: course.modules,
                        hours: course.totalHours,
                      })}
                    </td>
                    <td
                      className={`${tdClass} whitespace-nowrap text-sm tabular-nums text-muted-foreground`}
                    >
                      {t('courses.min_age_value', { age: course.minAge })}
                    </td>
                    <td
                      className={`${tdClass} whitespace-nowrap text-sm tabular-nums text-muted-foreground`}
                    >
                      {t('courses.class_group_count', {
                        count: course.classGroupCount,
                      })}
                    </td>
                    <td className={tdClass}>
                      <StatusBadge
                        tone={course.active ? 'success' : 'neutral'}
                        label={t(course.active ? 'courses.active' : 'courses.inactive')}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </TableShell>
        </Card>
      )}

      <CourseOptionsSheet
        course={configuring}
        onClose={() => setConfiguring(null)}
        onSave={saveOptions}
      />
    </div>
  )
}
