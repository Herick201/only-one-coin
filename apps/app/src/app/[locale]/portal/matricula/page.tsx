import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getPortalSession } from '@/lib/portal/mock-data'
import { formatDate, formatMoney } from '@/lib/portal/format'
import type { Locale, PaymentStatus } from '@/lib/portal/types'
import {
  Card,
  EmptyState,
  Field,
  PageHeader,
  StatusBadge,
} from '@/components/portal/ui'
import { enrollmentTone, paymentTone, seatTone } from '@/components/portal/status-tone'
import { Icon } from '@/components/portal/icons'
import { paymentMethodLabel } from '@/lib/payment-method'

/** Which payment states get a contextual note, and its tone. */
const noteFor: Partial<Record<PaymentStatus, { key: string; tone: 'success' | 'warning' | 'danger' }>> = {
  under_review: { key: 'enrollments.review_note', tone: 'warning' },
  rejected: { key: 'enrollments.rejected_note', tone: 'danger' },
  approved: { key: 'enrollments.approved_note', tone: 'success' },
}

const noteStyles = {
  success: 'border-emerald-600/20 bg-emerald-50 text-emerald-800',
  warning: 'border-brand-yellow-deep/25 bg-brand-yellow/10 text-ink',
  danger: 'border-red-600/20 bg-red-50 text-red-800',
} as const

export default async function EnrollmentPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = raw as Locale
  setRequestLocale(raw)
  const t = await getTranslations('portal')

  const { enrollments } = getPortalSession()

  return (
    <div>
      <PageHeader
        title={t('enrollments.title')}
        subtitle={t('enrollments.subtitle')}
      />

      {enrollments.length === 0 ? (
        <EmptyState
          title={t('enrollments.empty_title')}
          body={t('enrollments.empty_body')}
          icon={<Icon name="enrollment" size={24} />}
        />
      ) : (
        <ul className="grid gap-5">
          {enrollments.map((e) => {
            const note = noteFor[e.payment.status]
            return (
              <Card key={e.id} as="li" className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-ink">
                      {e.course.name}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {e.academicPeriod.name} · {e.classGroup.name}
                    </p>
                  </div>
                  <StatusBadge
                    tone={enrollmentTone[e.status]}
                    label={t(`enrollment_status.${e.status}`)}
                  />
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                  <Field label={t('enrollments.code_label')}>
                    <span className="font-mono text-xs">{e.code}</span>
                  </Field>
                  <Field label={t('enrollments.plan_label')}>{e.plan.name}</Field>
                  <Field label={t('enrollments.price_label')}>
                    {formatMoney(e.payment.amountCents, e.payment.currency, locale)}
                  </Field>
                </dl>

                {/* Payment receipt */}
                <div className="mt-5 rounded-xl border border-line bg-sky-soft p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                      <Icon name="enrollment" size={18} />
                      {t('enrollments.payment_title')}
                    </span>
                    <StatusBadge
                      tone={paymentTone[e.payment.status]}
                      label={t(`payment_status.${e.payment.status}`)}
                    />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                    <Field label={t('payment_method.label')}>
                      {paymentMethodLabel[e.payment.method]}
                    </Field>
                    {e.payment.operationNumber && (
                      <Field label={t('enrollments.operation_number')}>
                        <span className="font-mono text-xs">
                          {e.payment.operationNumber}
                        </span>
                      </Field>
                    )}
                    <Field label={t('enrollments.seat_label')}>
                      <StatusBadge
                        tone={seatTone[e.seatStatus]}
                        label={t(`seat_status.${e.seatStatus}`)}
                        dot={false}
                      />
                    </Field>
                  </dl>
                  {e.payment.paidAt && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {t('enrollments.paid_on', {
                        date: formatDate(e.payment.paidAt, locale),
                      })}
                    </p>
                  )}
                </div>

                {note && (
                  <p
                    className={`mt-4 rounded-xl border px-4 py-3 text-sm ${noteStyles[note.tone]}`}
                  >
                    {t(note.key)}
                  </p>
                )}
              </Card>
            )
          })}
        </ul>
      )}
    </div>
  )
}
