'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type {
  AvailabilitySlot,
  CourseLanguage,
  TeacherDetail,
} from '@/lib/backoffice/types'
import { weekColumns, weeklyHours } from '@/lib/backoffice/availability'
import { COUNTRIES, countryName, flagEmoji } from '@/lib/geo'
import { formatDate, formatDateRange, type Locale } from '@/lib/format'
import {
  Card,
  EmptyState,
  Field,
  Meter,
  SectionTitle,
  StatusBadge,
  TableShell,
  tdClass,
  thClass,
} from '@/components/backoffice/ui'
import { Toast } from '@/components/backoffice/controls'
import { classGroupTone, seatPressureTone } from '@/components/backoffice/status-tone'
import { BoIcon } from '@/components/backoffice/icons'
import { AvailabilityFields, slotsAreValid } from '../availability-fields'
import { AutoGrid } from '@/components/layout/auto-grid'

type Tab = 'data' | 'availability' | 'class_groups'

const TABS: Tab[] = ['data', 'availability', 'class_groups']

const fieldClass =
  'rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15'

const labelClass =
  'text-xs font-medium uppercase tracking-wide text-muted-foreground'

/**
 * Teacher file. Three tabs, in the order the record is used: who they are, when
 * they are free, and what is already on them.
 *
 * Edits live in component state only — there is no backend yet, and the real
 * write goes through a usecase in `apps/api`, never from the browser
 * (CLAUDE.md §8). A teacher reading their own file gets it read-only: what they
 * may teach and what they were allocated is coordination's call, not theirs.
 */
export function TeacherFile({
  teacher,
  catalogue,
  canEdit,
}: {
  teacher: TeacherDetail
  /** Every language the catalog offers — what a teacher may be cleared for. */
  catalogue: CourseLanguage[]
  canEdit: boolean
}) {
  const t = useTranslations('bo')
  const locale = useLocale() as Locale
  const [tab, setTab] = useState<Tab>('data')
  const [toast, setToast] = useState<string | null>(null)

  const [editingData, setEditingData] = useState(false)
  const [email, setEmail] = useState(teacher.email)
  const [phone, setPhone] = useState(teacher.phone)
  const [nationality, setNationality] = useState(teacher.nationality)
  const [languageIds, setLanguageIds] = useState(
    teacher.languages.map((language) => language.id),
  )

  const [editingAvailability, setEditingAvailability] = useState(false)
  const [availability, setAvailability] = useState<AvailabilitySlot[]>(
    teacher.availability,
  )
  const [availabilityDraft, setAvailabilityDraft] = useState<AvailabilitySlot[]>(
    teacher.availability,
  )

  /* Only class groups that are still running can conflict with a window — a
     finished one is history and would light up the grid forever. */
  const columns = weekColumns(
    availability,
    teacher.classGroups.filter(
      (group) => group.status === 'enrolling' || group.status === 'in_progress',
    ),
  )

  const languages = catalogue.filter((language) => languageIds.includes(language.id))

  function saveData() {
    setEditingData(false)
    setToast(t('teacher_file.saved'))
  }

  function cancelData() {
    setEmail(teacher.email)
    setPhone(teacher.phone)
    setNationality(teacher.nationality)
    setLanguageIds(teacher.languages.map((language) => language.id))
    setEditingData(false)
  }

  function saveAvailability() {
    setAvailability(availabilityDraft)
    setEditingAvailability(false)
    setToast(t('teacher_file.saved'))
  }

  const editButton = (onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-muted-foreground transition hover:text-ink"
    >
      <BoIcon name="edit" size={15} />
      {t('teacher_file.edit')}
    </button>
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((value) => {
          const active = tab === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              aria-current={active ? 'page' : undefined}
              className={`-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-semibold transition ${
                active
                  ? 'border-brand-blue text-brand-blue'
                  : 'border-transparent text-muted-foreground hover:text-ink'
              }`}
            >
              {t(`teacher_file.tab_${value}`)}
              {value === 'class_groups' && (
                <span className="ml-1.5 text-xs text-slate-400">
                  {teacher.classGroups.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {tab === 'data' && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <SectionTitle icon="teachers">{t('teacher_file.data_title')}</SectionTitle>
            {canEdit && !editingData && editButton(() => setEditingData(true))}
          </div>

          {editingData ? (
            <div className="flex flex-col gap-4">
              <AutoGrid min="15rem" gap="gap-3">
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>{t('teachers.field_email')}</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>{t('teachers.field_phone')}</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>{t('teachers.field_nationality')}</span>
                  <select
                    value={nationality}
                    onChange={(event) => setNationality(event.target.value)}
                    className={fieldClass}
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {`${flagEmoji(country.code)} ${countryName(country.code, locale)}`}
                      </option>
                    ))}
                  </select>
                </label>
              </AutoGrid>

              <div>
                <p className={`${labelClass} mb-2`}>{t('teachers.field_languages')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {catalogue.map((language) => {
                    const active = languageIds.includes(language.id)
                    return (
                      <button
                        key={language.id}
                        type="button"
                        onClick={() =>
                          setLanguageIds((current) =>
                            current.includes(language.id)
                              ? current.filter((id) => id !== language.id)
                              : [...current, language.id],
                          )
                        }
                        aria-pressed={active}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          active
                            ? 'bg-brand-blue text-white'
                            : 'border border-line bg-white text-muted-foreground hover:bg-cream hover:text-ink'
                        }`}
                      >
                        {active && <BoIcon name="check" size={13} />}
                        {language.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveData}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-deep"
                >
                  <BoIcon name="check" size={16} />
                  {t('teacher_file.save')}
                </button>
                <button
                  type="button"
                  onClick={cancelData}
                  className="rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-muted-foreground transition hover:text-ink"
                >
                  {t('teacher_file.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <AutoGrid as="dl" min="17rem">
              <Field label={t('teachers.field_email')}>{email}</Field>
              <Field label={t('teachers.field_phone')}>{phone}</Field>
              <Field label={t('teachers.field_nationality')}>
                {`${flagEmoji(nationality)} ${countryName(nationality, locale)}`}
              </Field>
              <Field label={t('teachers.field_languages')}>
                {languages.map((language) => language.name).join(' · ')}
              </Field>
              <Field label={t('teacher_file.joined_at')}>
                {formatDate(teacher.joinedAt, locale)}
              </Field>
              <Field label={t('teacher_file.load')}>
                {t('teacher_file.load_value', {
                  groups: teacher.activeClassGroups,
                  students: teacher.studentCount,
                })}
              </Field>
            </AutoGrid>
          )}
        </Card>
      )}

      {tab === 'availability' && (
        <Card className="p-5">
          <div className="mb-1 flex items-center justify-between gap-3">
            <SectionTitle icon="clock">{t('availability.title')}</SectionTitle>
            {canEdit &&
              !editingAvailability &&
              editButton(() => {
                setAvailabilityDraft(availability)
                setEditingAvailability(true)
              })}
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            {t('availability.weekly_hours', { hours: weeklyHours(availability) })}
          </p>

          {editingAvailability ? (
            <div className="flex flex-col gap-4">
              <AvailabilityFields
                value={availabilityDraft}
                onChange={setAvailabilityDraft}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!slotsAreValid(availabilityDraft)}
                  onClick={saveAvailability}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-deep disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <BoIcon name="check" size={16} />
                  {t('teacher_file.save')}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingAvailability(false)}
                  className="rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-muted-foreground transition hover:text-ink"
                >
                  {t('teacher_file.cancel')}
                </button>
              </div>
            </div>
          ) : availability.length === 0 ? (
            <EmptyState
              icon="clock"
              title={t('availability.none_title')}
              body={t('availability.none_body')}
            />
          ) : (
            <>
              {/* The week, with what was already allocated laid on top: the
                  question this answers is where the next class group fits,
                  not what the teacher wrote down. */}
              <AutoGrid min="6rem" gap="gap-2">
                {columns.map((column) => (
                  <div
                    key={column.weekday}
                    className="flex flex-col gap-1.5 rounded-lg border border-line bg-sky-soft p-2"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t(`weekday.${column.weekday}`)}
                    </p>

                    {column.slots.length === 0 && column.classes.length === 0 && (
                      <p className="text-xs text-slate-400">—</p>
                    )}

                    {column.slots.map((slot, index) => (
                      <p
                        key={`${slot.startTime}-${index}`}
                        className="rounded border border-dashed border-brand-blue/40 bg-white px-1.5 py-1 text-[11px] font-semibold tabular-nums text-brand-blue-deep"
                      >
                        {`${slot.startTime}–${slot.endTime}`}
                      </p>
                    ))}

                    {column.classes.map((item) => (
                      <Link
                        key={item.id}
                        href={`/backoffice/class-groups/${item.id}`}
                        title={item.courseName}
                        className={`rounded px-1.5 py-1 text-[11px] font-semibold transition ${
                          item.outside
                            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            : 'bg-brand-blue text-white hover:bg-brand-blue-deep'
                        }`}
                      >
                        <span className="block truncate tabular-nums">
                          {`${item.startTime} · ${item.code}`}
                        </span>
                      </Link>
                    ))}
                  </div>
                ))}
              </AutoGrid>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-4 rounded border border-dashed border-brand-blue/60 bg-white" />
                  {t('availability.legend_free')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-4 rounded bg-brand-blue" />
                  {t('availability.legend_allocated')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-4 rounded bg-amber-300" />
                  {t('availability.legend_outside')}
                </span>
              </div>
            </>
          )}
        </Card>
      )}

      {tab === 'class_groups' && (
        <Card>
          {teacher.classGroups.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon="courses"
                title={t('teacher_file.no_class_groups_title')}
                body={t('teacher_file.no_class_groups_body')}
              />
            </div>
          ) : (
            <TableShell>
              <thead>
                <tr>
                  <th className={thClass}>{t('teacher_file.col_class_group')}</th>
                  <th className={thClass}>{t('teacher_file.col_schedule')}</th>
                  <th className={thClass}>{t('teacher_file.col_period')}</th>
                  <th className={thClass}>{t('teacher_file.col_seats')}</th>
                  <th className={thClass}>{t('teacher_file.col_status')}</th>
                </tr>
              </thead>
              <tbody>
                {teacher.classGroups.map((group) => (
                  <tr key={group.id}>
                    <td className={`${tdClass} whitespace-nowrap`}>
                      <Link
                        href={`/backoffice/class-groups/${group.id}`}
                        className="font-semibold text-ink transition hover:text-brand-blue"
                      >
                        {group.courseName}
                      </Link>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {group.code}
                      </p>
                    </td>
                    <td
                      className={`${tdClass} whitespace-nowrap text-sm tabular-nums text-muted-foreground`}
                    >
                      {`${group.weekdays.map((day) => t(`weekday.${day}`)).join('/')} · ${group.startTime}`}
                    </td>
                    <td
                      className={`${tdClass} whitespace-nowrap text-sm text-muted-foreground`}
                    >
                      <span className="flex flex-col leading-tight">
                        <span>{group.academicPeriodName}</span>
                        <span className="text-xs tabular-nums">
                          {formatDateRange(group.startDate, group.endDate, locale)}
                        </span>
                      </span>
                    </td>
                    <td className={`${tdClass} min-w-32`}>
                      <span className="flex flex-col gap-1">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {t('seats.taken', {
                            taken: group.seatsTaken,
                            capacity: group.capacity,
                          })}
                        </span>
                        <Meter
                          value={group.seatsTaken}
                          max={group.capacity}
                          tone={seatPressureTone(group.seatsTaken, group.capacity)}
                        />
                      </span>
                    </td>
                    <td className={tdClass}>
                      <span className="flex flex-col items-start gap-1">
                        <StatusBadge
                          tone={classGroupTone[group.status]}
                          label={t(`class_group_status.${group.status}`)}
                        />
                        {group.pendingCertificates > 0 && (
                          <span className="text-xs font-semibold text-amber-700">
                            {t('teachers.pending_certificates', {
                              count: group.pendingCertificates,
                            })}
                          </span>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </Card>
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
