'use client'

import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type {
  ClassGroupRow,
  EnrollmentRow,
  PaymentMethod,
  PlanPrice,
  StudentRow,
} from '@/lib/backoffice/types'
import { formatMoney, type Locale } from '@/lib/format'
import { formatPaymentMethod } from '@/lib/payment-method'
import {
  Card,
  OptionalMark,
  RequiredMark,
  StatusBadge,
} from '@/components/backoffice/ui'
import { BoIcon } from '@/components/backoffice/icons'
import { AutoGrid } from '@/components/layout/auto-grid'

const fieldClass =
  'rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15'

const labelClass =
  'text-xs font-medium uppercase tracking-wide text-muted-foreground'

/**
 * The four rails, and `other` for the deposit that came through none of them —
 * a bank nobody listed, a transfer from abroad. `other` is not a fifth brand:
 * picking it asks for the text that names it, because "other" on a ledger line
 * is a question nobody can answer six months later.
 */
const METHODS: PaymentMethod[] = ['yape', 'plin', 'bcp', 'interbank', 'other']

/** Enough matches to recognise the right person, few enough to read at a glance. */
const MAX_MATCHES = 6

/**
 * Opening an enrollment from the panel — the exception, not the way in. The
 * documented path is the student filling `/enrollment` themselves (CLAUDE.md
 * §1); this covers the sale that closed on WhatsApp and never reached the form.
 *
 * Three things it deliberately does not do:
 *
 * - It does not create a student. It enrolls somebody already on file, found by
 *   name or document. Registering a person carries the guardian consent record
 *   (Ley 29733, CLAUDE.md §8) and that is not a side effect of a seat.
 * - It does not price anything. The amount is the plan price in force, shown
 *   read-only: there are no discounts, ever (CLAUDE.md §1), so a field somebody
 *   can type into is a field somebody can undercharge from.
 * - It does not approve money. The seat is reserved and the payment goes in
 *   open — with a receipt attached it enters the same review ladder every other
 *   receipt does (CLAUDE.md §5). Whoever creates an enrollment must not also be
 *   the one who settles it.
 *
 * Screen-local, like the class group and course forms: the real write is a
 * usecase in `packages/domain` behind `apps/api`, never the browser
 * (CLAUDE.md §8).
 */
export function NewEnrollmentForm({
  students,
  classGroups,
  plans,
  onCancel,
  onCreate,
}: {
  students: StudentRow[]
  classGroups: ClassGroupRow[]
  plans: PlanPrice[]
  onCancel: () => void
  onCreate: (enrollment: EnrollmentRow) => void
}) {
  const t = useTranslations('bo')
  const locale = useLocale() as Locale

  const [studentQuery, setStudentQuery] = useState('')
  const [studentId, setStudentId] = useState<string | null>(null)
  const [classGroupId, setClassGroupId] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('yape')
  const [methodDetail, setMethodDetail] = useState('')
  const [operationNumber, setOperationNumber] = useState('')
  const [receiptAttached, setReceiptAttached] = useState(false)

  const student = students.find((row) => row.id === studentId) ?? null

  /**
   * Only class groups still taking people, and only while they have a seat: the
   * seat is claimed by a single atomic instruction on the server
   * (CLAUDE.md §5), so a form that offers a full class group is a form whose
   * submit fails after the reader filled everything in.
   */
  const openGroups = useMemo(
    () =>
      classGroups.filter(
        (group) => group.status === 'enrolling' && group.seatsTaken < group.capacity,
      ),
    [classGroups],
  )

  const matches = useMemo(() => {
    const needle = studentQuery.trim().toLowerCase()
    if (!needle) return []
    return students
      .filter((row) =>
        `${row.firstName} ${row.lastName} ${row.nationalId}`
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, MAX_MATCHES)
  }, [students, studentQuery])

  const group = openGroups.find((item) => item.id === classGroupId) ?? null
  const plan = group
    ? (plans.find((item) => item.courseName === group.courseName) ?? null)
    : null

  const schedule = group
    ? `${group.weekdays.map((day) => t(`weekday.${day}`)).join('/')} · ${group.startTime}`
    : ''

  /**
   * Everything the form asks for is required, and the button is where that is
   * enforced: a seat opened without the operation number is a payment tesorería
   * cannot match against a bank statement, and it lands in the review queue
   * anyway — one field short of settleable.
   *
   * The price is in the list for a different reason: no price in force means no
   * enrollment at all, because guessing an amount undercharges.
   */
  const detailNeeded = method === 'other'
  const missing =
    student === null ||
    group === null ||
    plan === null ||
    operationNumber.trim() === '' ||
    (detailNeeded && methodDetail.trim() === '')
  const ready = !missing

  function submit() {
    if (!ready || !student || !group || !plan) return
    const now = new Date().toISOString()
    onCreate({
      id: `enr_local_${student.id}_${group.id}`,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      courseName: group.courseName,
      classGroupId: group.id,
      classGroupName: `${group.code} · ${schedule}`,
      teacherName: group.teacherName,
      language: group.language,
      modality: group.modality,
      academicPeriodName: group.academicPeriodName,
      status: 'under_review',
      // The seat is held, not granted: it goes back if the money never lands
      // (CLAUDE.md §5).
      seatStatus: 'reserved',
      planName: plan.planName,
      planPriceId: plan.planPriceId,
      amountCents: plan.amountCents,
      currency: plan.currency,
      // With a receipt it enters the ladder; without one it is still waiting
      // for the student to send it. Never `approved` from here.
      paymentStatus: receiptAttached ? 'under_review' : 'pending',
      paymentMethod: method,
      // The rails name themselves; `other` is only ever as good as the text.
      paymentMethodDetail: method === 'other' ? methodDetail.trim() : null,
      operationNumber: operationNumber.trim(),
      createdAt: now,
      paidAt: null,
      progressPct: null,
    })
  }

  return (
    <Card className="p-5">
      <p className="mb-1 text-sm font-semibold text-ink">
        {t('new_enrollment.title')}
      </p>
      <p className="mb-4 text-xs text-muted-foreground">
        {t('new_enrollment.subtitle')}
      </p>

      {/* Student */}
      <section className="border-t border-line pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('new_enrollment.step_student')}
        </p>

        {student ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-sky-soft px-3 py-2.5">
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-ink">
                {`${student.firstName} ${student.lastName}`}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {t('students.document', {
                  type: t(`national_id_type.${student.nationalIdType}`),
                  number: student.nationalId,
                })}
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                setStudentId(null)
                setStudentQuery('')
              }}
              className="text-xs font-semibold text-brand-blue transition hover:text-brand-blue-deep"
            >
              {t('new_enrollment.change_student')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1 sm:max-w-md">
              <span className={labelClass}>
                {t('new_enrollment.search_student_label')}
                <RequiredMark label={t('common.required')} />
              </span>
              <span className="relative">
                <BoIcon
                  name="search"
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="search"
                  value={studentQuery}
                  onChange={(event) => setStudentQuery(event.target.value)}
                  placeholder={t('new_enrollment.search_student_placeholder')}
                  aria-required="true"
                  className={`${fieldClass} w-full pl-9`}
                />
              </span>
            </label>

            {studentQuery.trim() !== '' &&
              (matches.length === 0 ? (
                /* The panel does not offer to create the person from here:
                   registering a student carries the consent record, and that is
                   a flow of its own (CLAUDE.md §8). */
                <p className="text-xs text-muted-foreground">
                  {t('new_enrollment.no_students_found')}
                </p>
              ) : (
                <ul className="flex flex-col overflow-hidden rounded-lg border border-line sm:max-w-md">
                  {matches.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => setStudentId(row.id)}
                        className="flex w-full flex-col items-start gap-0.5 border-b border-line/70 px-3 py-2 text-left transition last:border-b-0 hover:bg-sky-soft"
                      >
                        <span className="text-sm font-medium text-ink">
                          {`${row.firstName} ${row.lastName}`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t('students.document', {
                            type: t(`national_id_type.${row.nationalIdType}`),
                            number: row.nationalId,
                          })}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ))}
          </div>
        )}
      </section>

      {/* Class group */}
      <section className="mt-5 border-t border-line pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('new_enrollment.step_class_group')}
        </p>

        {openGroups.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t('new_enrollment.no_open_class_groups')}
          </p>
        ) : (
          <AutoGrid min="18rem" gap="gap-3">
            <label className="flex flex-col gap-1">
              <span className={labelClass}>
                {t('new_enrollment.field_class_group')}
                <RequiredMark label={t('common.required')} />
              </span>
              <select
                value={classGroupId}
                onChange={(event) => setClassGroupId(event.target.value)}
                required
                aria-required="true"
                className={fieldClass}
              >
                <option value="">
                  {t('new_enrollment.class_group_placeholder')}
                </option>
                {openGroups.map((item) => (
                  <option key={item.id} value={item.id}>
                    {`${item.courseName} — ${item.code}`}
                  </option>
                ))}
              </select>
            </label>

            {group && (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 self-end rounded-lg border border-line bg-sky-soft px-3 py-2.5">
                <Summary
                  label={t('new_enrollment.field_teacher')}
                  value={group.teacherName}
                />
                <Summary
                  label={t('new_enrollment.field_schedule')}
                  value={schedule}
                />
                <Summary
                  label={t('new_enrollment.field_period')}
                  value={group.academicPeriodName}
                />
                <Summary
                  label={t('new_enrollment.seats_left')}
                  value={String(group.capacity - group.seatsTaken)}
                />
              </dl>
            )}
          </AutoGrid>
        )}

        {/* The price, shown and not asked for. */}
        {group && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {plan ? (
              <>
                <StatusBadge
                  tone="info"
                  dot={false}
                  label={`${plan.planName} · ${formatMoney(
                    plan.amountCents,
                    plan.currency,
                    locale,
                  )}`}
                />
                <span className="text-xs text-muted-foreground">
                  {t('new_enrollment.price_locked')}
                </span>
              </>
            ) : (
              <span className="text-xs font-semibold text-red-600">
                {t('new_enrollment.no_price')}
              </span>
            )}
          </div>
        )}
      </section>

      {/* Receipt */}
      <section className="mt-5 border-t border-line pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('new_enrollment.step_receipt')}
        </p>

        <AutoGrid min="15rem" gap="gap-3">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>
              {t('new_enrollment.field_method')}
              <RequiredMark label={t('common.required')} />
            </span>
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value as PaymentMethod)}
              required
              aria-required="true"
              className={fieldClass}
            >
              {METHODS.map((value) => (
                /* Rail names are proper nouns — never translated
                   (CLAUDE.md §4 glossary); `other` is the one entry that has a
                   word instead of a brand. */
                <option key={value} value={value}>
                  {formatPaymentMethod(value, null, t('new_enrollment.method_other'))}
                </option>
              ))}
            </select>
          </label>

          {/* Only once "other" is picked, and required from that moment: a
              ledger line reading "other" and nothing else is a question
              nobody can answer six months later. */}
          {detailNeeded && (
            <label className="flex flex-col gap-1">
              <span className={labelClass}>
                {t('new_enrollment.field_method_other')}
                <RequiredMark label={t('common.required')} />
              </span>
              <input
                value={methodDetail}
                onChange={(event) => setMethodDetail(event.target.value)}
                placeholder={t('new_enrollment.method_other_placeholder')}
                required
                aria-required="true"
                className={fieldClass}
              />
            </label>
          )}

          <label className="flex flex-col gap-1">
            <span className={labelClass}>
              {t('new_enrollment.field_operation')}
              <RequiredMark label={t('common.required')} />
            </span>
            <input
              value={operationNumber}
              onChange={(event) => setOperationNumber(event.target.value)}
              placeholder={t('new_enrollment.operation_placeholder')}
              required
              aria-required="true"
              className={`${fieldClass} tabular-nums`}
            />
          </label>

          {/* No storage is wired yet; in production the image goes straight to
              the bucket through a signed URL and never through the app
              (CLAUDE.md §5). */}
          <label className="flex flex-col gap-1">
            <span className={labelClass}>
              {t('new_enrollment.attach_receipt')}
              <OptionalMark label={t('common.optional')} />
            </span>
            <button
              type="button"
              onClick={() => setReceiptAttached(!receiptAttached)}
              aria-pressed={receiptAttached}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                receiptAttached
                  ? 'border-brand-blue bg-sky text-brand-blue'
                  : 'border-dashed border-line bg-white text-muted-foreground hover:text-ink'
              }`}
            >
              <BoIcon name={receiptAttached ? 'check' : 'doc'} size={16} />
              {t(
                receiptAttached
                  ? 'new_enrollment.receipt_attached'
                  : 'new_enrollment.receipt_attach',
              )}
            </button>
          </label>
        </AutoGrid>

        <p className="mt-3 flex items-start gap-2 rounded-lg border border-dashed border-line bg-sky-soft px-3 py-2 text-xs text-muted-foreground">
          <BoIcon name="shield" size={14} className="mt-0.5 shrink-0" />
          {t(
            receiptAttached
              ? 'new_enrollment.notice_under_review'
              : 'new_enrollment.notice_pending',
          )}
        </p>
      </section>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <button
          type="button"
          disabled={!ready}
          onClick={submit}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-deep disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brand-blue"
        >
          <BoIcon name="check" size={16} />
          {t('new_enrollment.create')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-muted-foreground transition hover:text-ink"
        >
          {t('new_enrollment.cancel')}
        </button>
        {/* A button that greys out without saying why reads as broken. */}
        {!ready && (
          <span className="text-xs text-muted-foreground">
            {t('new_enrollment.missing_fields')}
          </span>
        )}
      </div>
    </Card>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="truncate text-xs font-medium text-ink">{value}</dd>
    </div>
  )
}
