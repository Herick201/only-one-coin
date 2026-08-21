'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { CheckoutDraft, PublicCatalog, StepId } from '@/lib/enrollment/types'
import { courseById, groupById, planOfCourse } from '@/lib/enrollment/checkout'
import { scheduleLine } from '@/lib/enrollment/schedule'
import { formatDate, formatMoney, type Locale } from '@/lib/format'
import { paymentMethodLabel } from '@/lib/payment-method'
import {
  Card,
  GhostButton,
  Note,
  PrimaryButton,
  StepHeading,
  SummaryRow,
} from '@/components/enrollment/ui'
import { CheckoutIcon } from '@/components/enrollment/icons'

/**
 * Step 4 — everything in one place, then send.
 *
 * The point of the screen is the edit links, not the list. A person who has to
 * go back and fix a mistyped document number should not have to walk forward
 * through three steps to get back here.
 *
 * What the submit does in production (Sessão 24 of the roadmap): one short
 * transaction writing student + enrollment + payment `pending`, the atomic seat
 * increment, an idempotency key, then a queued job — and a reply under 300ms.
 * The route does not import the AI module (`CLAUDE.md` §5). Here it just moves
 * to the success screen.
 */
export function StepReview({
  catalog,
  draft,
  onEdit,
  onBack,
  onSubmit,
}: {
  catalog: PublicCatalog
  draft: CheckoutDraft
  onEdit: (step: StepId) => void
  onBack: () => void
  onSubmit: () => void
}) {
  const t = useTranslations('enrollment')
  const locale = useLocale() as Locale
  const [sending, setSending] = useState(false)

  const course = courseById(catalog, draft.course.courseId)
  const group = groupById(catalog, draft.course.classGroupId)
  const plan = planOfCourse(catalog, draft.course.courseId)
  const minorFlow = draft.guardian.consentAccepted

  function send() {
    // Guards the double POST from a bad phone connection on the screen side;
    // the guarantee is the idempotency key on the payment (`CLAUDE.md` §5).
    if (sending) return
    setSending(true)
    onSubmit()
  }

  return (
    <div className="flex flex-col gap-5">
      <StepHeading
        eyebrow={t('step.review.eyebrow')}
        title={t('step.review.title')}
        subtitle={t('step.review.subtitle')}
      />

      <Card className="p-5">
        <SectionHead
          title={t('step.review.course_section')}
          onEdit={() => onEdit('course')}
          editLabel={t('action.edit')}
        />
        <dl className="divide-y divide-line">
          {course && <SummaryRow label={t('summary.course')}>{course.name}</SummaryRow>}
          {plan && <SummaryRow label={t('summary.plan')}>{plan.name}</SummaryRow>}
          {group && (
            <>
              <SummaryRow label={t('summary.schedule')}>
                {scheduleLine(
                  group,
                  (day) => t(`weekday.${day}`),
                  (vars) => t('schedule_line', vars),
                )}
              </SummaryRow>
              <SummaryRow label={t('summary.starts_on')}>
                {formatDate(group.startDate, locale)}
              </SummaryRow>
              <SummaryRow label={t('summary.class_group')}>
                <span className="font-mono text-xs">{group.code}</span>
              </SummaryRow>
            </>
          )}
        </dl>
      </Card>

      <Card className="p-5">
        <SectionHead
          title={t('step.review.student_section')}
          onEdit={() => onEdit('student')}
          editLabel={t('action.edit')}
        />
        <dl className="divide-y divide-line">
          <SummaryRow label={t('summary.full_name')}>
            {draft.student.fullName}
          </SummaryRow>
          <SummaryRow label={t('summary.document')}>
            {`${t(`national_id_type.${draft.student.nationalIdType}`)} ${draft.student.nationalId}`}
          </SummaryRow>
          <SummaryRow label={t('summary.phone')}>{draft.student.phone}</SummaryRow>
          <SummaryRow label={t('summary.email')}>{draft.student.email}</SummaryRow>
          <SummaryRow label={t('summary.birth_date')}>
            {draft.student.birthDate
              ? formatDate(draft.student.birthDate, locale)
              : ''}
          </SummaryRow>
        </dl>

        {minorFlow && (
          <>
            <p className="mt-4 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('step.review.guardian_section')}
            </p>
            <dl className="divide-y divide-line">
              <SummaryRow label={t('summary.full_name')}>
                {draft.guardian.fullName}
              </SummaryRow>
              <SummaryRow label={t('field.relationship')}>
                {t(`relationship.${draft.guardian.relationship}`)}
              </SummaryRow>
              <SummaryRow label={t('summary.document')}>
                {`${t(`national_id_type.${draft.guardian.nationalIdType}`)} ${draft.guardian.nationalId}`}
              </SummaryRow>
              <SummaryRow label={t('summary.phone')}>
                {draft.guardian.phone}
              </SummaryRow>
              <SummaryRow label={t('summary.email')}>
                {draft.guardian.email}
              </SummaryRow>
              <SummaryRow label={t('summary.consent')}>
                {t('step.review.consent_given', {
                  version: catalog.settings.consentVersion,
                })}
              </SummaryRow>
            </dl>
          </>
        )}
      </Card>

      <Card className="p-5">
        <SectionHead
          title={t('step.review.payment_section')}
          onEdit={() => onEdit('payment')}
          editLabel={t('action.edit')}
        />
        <dl className="divide-y divide-line">
          {draft.payment.method && (
            <SummaryRow label={t('summary.method')}>
              {paymentMethodLabel[draft.payment.method]}
            </SummaryRow>
          )}
          <SummaryRow label={t('summary.operation_number')}>
            <span className="font-mono text-xs">{draft.payment.operationNumber}</span>
          </SummaryRow>
          {draft.payment.receipt && (
            <SummaryRow label={t('summary.receipt')}>
              <span className="inline-flex items-center gap-1.5">
                <CheckoutIcon name="file" size={14} />
                <span className="truncate">{draft.payment.receipt.fileName}</span>
              </span>
            </SummaryRow>
          )}
          {plan && (
            <SummaryRow label={t('summary.total')} strong>
              {formatMoney(plan.amountCents, plan.currency, locale)}
            </SummaryRow>
          )}
        </dl>
      </Card>

      {/* Says out loud what sending does and does not do. Nobody should leave
          this screen thinking the seat is theirs — the payment still has to
          clear review (`CLAUDE.md` §5). */}
      <Note tone="info">
        {t('step.review.what_happens', { days: catalog.settings.reservationDays })}
      </Note>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <GhostButton onClick={onBack}>
          <CheckoutIcon name="arrow-left" size={16} />
          {t('action.back')}
        </GhostButton>
        <PrimaryButton onClick={send} disabled={sending}>
          <CheckoutIcon name="check" size={16} />
          {t('action.submit')}
        </PrimaryButton>
      </div>
    </div>
  )
}

function SectionHead({
  title,
  onEdit,
  editLabel,
}: {
  title: string
  onEdit: () => void
  editLabel: string
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-xs font-semibold text-brand-blue transition hover:text-brand-blue-deep"
      >
        {editLabel}
      </button>
    </div>
  )
}
