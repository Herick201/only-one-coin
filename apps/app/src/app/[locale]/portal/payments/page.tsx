import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getPortalSession } from '@/lib/portal/mock-data'
import { formatDate, formatMoney } from '@/lib/portal/format'
import type { Locale, Payment } from '@/lib/portal/types'
import { Card, PageHeader, SectionTitle, StatusBadge } from '@/components/portal/ui'
import { paymentTone } from '@/components/portal/status-tone'
import { Icon } from '@/components/portal/icons'
import { formatPaymentMethod } from '@/lib/payment-method'
import { MonthlyPaymentCard } from './monthly-payment-card'

/**
 * Pagos — the money side of the portal in one place: the due month of a
 * monthly (English) enrollment with its receipt upload (decision 02/09/2026),
 * and the history of everything already paid — packages, months and paid
 * procedures — each with the status of its receipt.
 */
export default async function PaymentsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = raw as Locale
  setRequestLocale(raw)
  const t = await getTranslations('portal')

  const { enrollments, requests } = getPortalSession()

  // Months waiting for their receipt.
  const dueMonths = enrollments.flatMap((e) => {
    if (e.monthly === null) return []
    return e.monthly.payments
      .filter((mp) => mp.payment === null)
      .map((mp) => ({
        enrollment: e,
        modulePayment: mp,
        module: e.modules.find((m) => m.id === mp.moduleId) ?? null,
      }))
  })

  // Everything already paid (or being validated), newest first.
  const history: { id: string; concept: string; payment: Payment }[] = [
    ...enrollments.flatMap((e) => {
      if (e.monthly !== null) {
        return e.monthly.payments.flatMap((mp) => {
          if (mp.payment === null) return []
          const moduleName =
            e.modules.find((m) => m.id === mp.moduleId)?.name ?? ''
          return [
            {
              id: mp.payment.id,
              concept: t('payments.concept_module', {
                course: e.course.name,
                module: moduleName,
              }),
              payment: mp.payment,
            },
          ]
        })
      }
      return [
        {
          id: e.payment.id,
          concept: t('payments.concept_package', { course: e.course.name }),
          payment: e.payment,
        },
      ]
    }),
    ...requests.map((r) => {
      const course =
        enrollments.find((e) => e.id === r.enrollmentId)?.course.name ?? ''
      return {
        id: r.payment.id,
        concept: t('payments.concept_procedure', {
          procedure: t(`request_type.${r.type}`),
          course,
        }),
        payment: r.payment,
      }
    }),
  ].sort((a, b) => (b.payment.paidAt ?? '').localeCompare(a.payment.paidAt ?? ''))

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t('payments.title')} />

      {dueMonths.length > 0 && (
        <section className="-mt-4">
          <div className="mb-3">
            <SectionTitle>{t('payments.due_title')}</SectionTitle>
          </div>
          <div className="flex flex-col gap-4">
            {dueMonths.map(({ enrollment, modulePayment, module }) => (
              <MonthlyPaymentCard
                key={`${enrollment.id}-${modulePayment.moduleId}`}
                courseName={enrollment.course.name}
                moduleName={module?.name ?? ''}
                dueDate={modulePayment.dueDate}
                amountCents={enrollment.monthly?.modulePriceCents ?? 0}
                currency={enrollment.monthly?.currency ?? 'PEN'}
                locked={enrollment.classAccessLock === 'monthly_payment_due'}
              />
            ))}
          </div>
          <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
            <span className="mt-0.5 shrink-0 text-brand-blue">
              <Icon name="alert" size={14} />
            </span>
            {t('payments.monthly_explainer')}
          </p>
        </section>
      )}

      <section>
        <div className="mb-3">
          <SectionTitle>{t('payments.history_title')}</SectionTitle>
        </div>
        {history.length === 0 ? (
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">
              {t('payments.history_empty')}
            </p>
          </Card>
        ) : (
          <Card>
            <ul className="divide-y divide-line">
              {history.map(({ id, concept, payment }) => (
                <li
                  key={id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{concept}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {payment.paidAt && formatDate(payment.paidAt, locale)}
                      {' · '}
                      {formatPaymentMethod(
                        payment.method,
                        null,
                        t('payment_method.other'),
                      )}
                      {payment.operationNumber && (
                        <>
                          {' · '}
                          <span className="font-mono">
                            {payment.operationNumber}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-bold text-ink">
                      {formatMoney(payment.amountCents, payment.currency, locale)}
                    </span>
                    <StatusBadge
                      tone={paymentTone[payment.status]}
                      label={t(`payment_status.${payment.status}`)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  )
}
