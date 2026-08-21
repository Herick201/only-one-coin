'use client'

import { useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { CheckoutDraft, PublicCatalog } from '@/lib/enrollment/types'
import {
  coursesOfLanguage,
  courseById,
  groupsOfCourse,
  hasSeat,
  planOfCourse,
  seatsLeft,
} from '@/lib/enrollment/checkout'
import { formatDate, formatMoney, type Locale } from '@/lib/format'
import {
  Card,
  ChoiceCard,
  Note,
  PrimaryButton,
  StepHeading,
  SummaryRow,
} from '@/components/enrollment/ui'
import { CheckoutIcon } from '@/components/enrollment/icons'
import { AutoGrid } from '@/components/layout/auto-grid'

/** Below this the class group is advertised as nearly gone; above, it is not. */
const SCARCE_SEATS = 6

/**
 * Step 1 — what is being bought.
 *
 * Runs in the order the WhatsApp funnel already uses
 * (`docs/REGRAS-NEGOCIO.md` §7): language → course → class group, and only then
 * schedule, start date and price. Asking for money before the reader knows what
 * time the class is is how a funnel loses people who would have paid.
 *
 * Two rules the screen has to keep:
 *
 * - **A full class group is never offered.** The seat is claimed by one atomic
 *   instruction on the server (`CLAUDE.md` §5), so an offer this screen cannot
 *   honour becomes a submit that fails after everything was filled in. Full
 *   ones stay visible but unpickable — knowing the 07:00 class exists and is
 *   full is worth more than it silently vanishing.
 * - **The price is read, never typed.** It is the `plan_price` in force, and
 *   there are no discounts, ever (`CLAUDE.md` §1).
 */
export function StepCourse({
  catalog,
  draft,
  setDraft,
  onContinue,
  holdExpired,
}: {
  catalog: PublicCatalog
  draft: CheckoutDraft
  setDraft: (next: (prev: CheckoutDraft) => CheckoutDraft) => void
  onContinue: () => void
  holdExpired: boolean
}) {
  const t = useTranslations('enrollment')
  const locale = useLocale() as Locale

  const { languageId, courseId, classGroupId } = draft.course
  const courses = useMemo(
    () => coursesOfLanguage(catalog, languageId),
    [catalog, languageId],
  )
  const groups = useMemo(
    () => groupsOfCourse(catalog, courseId),
    [catalog, courseId],
  )
  const course = courseById(catalog, courseId)
  const plan = planOfCourse(catalog, courseId)
  const selectedGroup = groups.find((group) => group.id === classGroupId) ?? null

  function pickLanguage(id: string) {
    // Changing the language invalidates everything downstream — a course from
    // the previous language would sit there looking chosen.
    setDraft((prev) => ({
      ...prev,
      course: { languageId: id, courseId: null, classGroupId: null },
    }))
  }

  function pickCourse(id: string) {
    setDraft((prev) => ({
      ...prev,
      course: { ...prev.course, courseId: id, classGroupId: null },
    }))
  }

  function pickGroup(id: string) {
    setDraft((prev) => ({ ...prev, course: { ...prev.course, classGroupId: id } }))
  }

  function scheduleOf(weekdays: readonly string[], startTime: string, endTime: string) {
    return `${weekdays.map((day) => t(`weekday.${day}`)).join(' · ')} — ${startTime} a ${endTime}`
  }

  return (
    <div className="flex flex-col gap-5">
      <StepHeading
        eyebrow={t('step.course.eyebrow')}
        title={t('step.course.title')}
        subtitle={t('step.course.subtitle')}
      />

      {/* The seat went back while they were away. Not a failure screen: the
          rest of the draft is intact, only the class group has to be picked
          again (`docs/MATRICULA-CHECKOUT.md` §3). */}
      {holdExpired && <Note tone="danger">{t('hold.expired')}</Note>}

      {/* Language */}
      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold text-ink">
          {t('step.course.language_label')}
        </p>
        <div className="flex flex-wrap gap-2">
          {catalog.languages.map((language) => (
            <button
              key={language.id}
              type="button"
              onClick={() => pickLanguage(language.id)}
              aria-pressed={languageId === language.id}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                languageId === language.id
                  ? 'border-brand-blue bg-brand-blue text-white'
                  : 'border-line bg-white text-ink hover:border-brand-blue/50 hover:bg-sky-soft'
              }`}
            >
              {language.name}
            </button>
          ))}
        </div>
      </Card>

      {/* Course */}
      {courses.length > 0 && (
        <Card className="p-5">
          <p className="mb-3 text-sm font-semibold text-ink">
            {t('step.course.course_label')}
          </p>
          <AutoGrid min="17rem" gap="gap-3">
            {courses.map((item) => (
              <ChoiceCard
                key={item.id}
                selected={courseId === item.id}
                onSelect={() => pickCourse(item.id)}
                title={item.name}
                meta={t('step.course.course_meta', {
                  level: item.level,
                  hours: item.totalHours,
                  modules: item.modules,
                })}
              >
                <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-sky px-2.5 py-1 text-[11px] font-semibold text-brand-blue-deep">
                  <CheckoutIcon name="user" size={12} />
                  {t('step.course.min_age', { age: item.minAge })}
                </span>
              </ChoiceCard>
            ))}
          </AutoGrid>
        </Card>
      )}

      {/* Class group */}
      {course && (
        <Card className="p-5">
          <p className="mb-1 text-sm font-semibold text-ink">
            {t('step.course.group_label')}
          </p>
          <p className="mb-3 text-xs text-muted-foreground">
            {t('step.course.group_hint')}
          </p>

          {groups.length === 0 ? (
            <Note tone="warning">{t('step.course.no_groups')}</Note>
          ) : (
            <AutoGrid min="18rem" gap="gap-3">
              {groups.map((group) => {
                const open = hasSeat(group)
                const left = seatsLeft(group)
                return (
                  <ChoiceCard
                    key={group.id}
                    selected={classGroupId === group.id}
                    disabled={!open}
                    onSelect={() => pickGroup(group.id)}
                    title={scheduleOf(group.weekdays, group.startTime, group.endTime)}
                    aside={
                      open ? (
                        left <= SCARCE_SEATS ? (
                          <span className="shrink-0 rounded-full bg-brand-yellow/20 px-2 py-0.5 text-[11px] font-semibold text-brand-yellow-deep">
                            {t('step.course.seats_left', { count: left })}
                          </span>
                        ) : null
                      ) : (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          {t('step.course.group_full')}
                        </span>
                      )
                    }
                  >
                    <span className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <CheckoutIcon name="calendar" size={13} />
                        {t('step.course.starts_on', {
                          date: formatDate(group.startDate, locale),
                        })}
                      </span>
                      <span>
                        {t('step.course.teacher', { name: group.teacherName })}
                      </span>
                      <span className="font-mono text-[11px]">{group.code}</span>
                    </span>
                  </ChoiceCard>
                )
              })}
            </AutoGrid>
          )}
        </Card>
      )}

      {/* Price — appears only once there is a class group to attach it to. */}
      {course && plan && selectedGroup && (
        <Card className="p-5">
          <p className="mb-2 text-sm font-semibold text-ink">
            {t('step.course.summary_label')}
          </p>
          <dl className="divide-y divide-line">
            <SummaryRow label={t('summary.course')}>{course.name}</SummaryRow>
            <SummaryRow label={t('summary.plan')}>{plan.name}</SummaryRow>
            <SummaryRow label={t('summary.schedule')}>
              {scheduleOf(
                selectedGroup.weekdays,
                selectedGroup.startTime,
                selectedGroup.endTime,
              )}
            </SummaryRow>
            <SummaryRow label={t('summary.total')} strong>
              {formatMoney(plan.amountCents, plan.currency, locale)}
            </SummaryRow>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            {t('step.course.single_payment_note')}
          </p>
        </Card>
      )}

      <div className="flex items-center justify-end gap-3">
        <PrimaryButton onClick={onContinue} disabled={selectedGroup === null}>
          {t('action.continue')}
          <CheckoutIcon name="arrow-right" size={16} />
        </PrimaryButton>
      </div>

      {/* The hold is announced before it starts, not after. Somebody who does
          not know a clock is running cannot plan around it. */}
      {selectedGroup && (
        <Note tone="info">
          {t('hold.will_start', { minutes: catalog.settings.holdMinutes })}
        </Note>
      )}
    </div>
  )
}
