import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getPortalSession } from '@/lib/portal/mock-data'
import { formatDateNumeric, formatMoney } from '@/lib/portal/format'
import type { Locale, Payment } from '@/lib/portal/types'
import { Card, PageHeader, SectionTitle, StatusBadge } from '@/components/portal/ui'
import { paymentTone } from '@/components/portal/status-tone'
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

  /**
   * Monthly enrollments with something still to pay, one card each. The card
   * carries the whole module ledger of that enrollment — the ones already
   * settled and the ones still open — because a student checking what to pay
   * is also checking what they already paid.
   */
  const duePlans = enrollments.flatMap((e) => {
    if (e.monthly === null) return []
    const sequenceOf = (moduleId: string) =>
      e.modules.find((m) => m.id === moduleId)?.sequence ?? 0
    const settled = e.monthly.payments
      .filter((mp) => mp.payment !== null)
      .map((mp) => ({
        moduleId: mp.moduleId,
        sequence: sequenceOf(mp.moduleId),
        // Non-null by the filter above; narrowed here for the card's props.
        status: mp.payment!.status,
      }))
      .sort((a, b) => a.sequence - b.sequence)
    const pending = e.monthly.payments
      .filter((mp) => mp.payment === null)
      .map((mp) => ({
        moduleId: mp.moduleId,
        sequence: sequenceOf(mp.moduleId),
        dueDate: mp.dueDate,
      }))
      .sort((a, b) => a.sequence - b.sequence)
    if (pending.length === 0) return []
    return [{ enrollment: e, settled, pending }]
  })

  /**
   * Everything already paid (or being validated), newest first. The row keeps
   * the course and what was bought apart — one column each — instead of gluing
   * them into a sentence: a column of names is what the eye scans down.
   */
  type HistoryRow = {
    id: string
    name: string
    type: 'package' | 'monthly' | 'procedure'
    payment: Payment
  }

  const history: HistoryRow[] = [
    ...enrollments.flatMap<HistoryRow>((e) => {
      if (e.monthly !== null) {
        return e.monthly.payments.flatMap<HistoryRow>((mp) => {
          if (mp.payment === null) return []
          return [
            {
              id: mp.payment.id,
              name: e.course.name,
              type: 'monthly',
              payment: mp.payment,
            },
          ]
        })
      }
      return [
        {
          id: e.payment.id,
          name: e.course.name,
          type: 'package',
          payment: e.payment,
        },
      ]
    }),
    ...requests.map<HistoryRow>((r) => ({
      id: r.payment.id,
      name: t(`request_type.${r.type}`),
      type: 'procedure',
      payment: r.payment,
    })),
  ].sort((a, b) => (b.payment.paidAt ?? '').localeCompare(a.payment.paidAt ?? ''))

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t('payments.title')} />

      {duePlans.length > 0 && (
        <section className="-mt-4">
          <div className="mb-3">
            <SectionTitle>{t('payments.due_title')}</SectionTitle>
          </div>
          <div className="flex flex-col gap-4">
            {duePlans.map(({ enrollment, settled, pending }) => (
              <MonthlyPaymentCard
                key={enrollment.id}
                courseName={enrollment.course.name}
                settledModules={settled}
                modules={pending}
                modulePriceCents={enrollment.monthly?.modulePriceCents ?? 0}
                currency={enrollment.monthly?.currency ?? 'PEN'}
                locked={enrollment.classAccessLock === 'monthly_payment_due'}
              />
            ))}
          </div>
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
            {/* Horizontal scroll lives on this wrapper, never on the page
                (CLAUDE.md §5, screen layout) — same table idiom as Solicitudes. */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3 text-left font-medium">
                      {t('payments.col_name')}
                    </th>
                    <th className="px-5 py-3 text-center font-medium">
                      {t('payments.col_type')}
                    </th>
                    <th className="px-5 py-3 text-center font-medium">
                      {t('payments.col_date')}
                    </th>
                    <th className="px-5 py-3 text-right font-medium">
                      {t('payments.col_amount')}
                    </th>
                    <th className="px-5 py-3 text-center font-medium">
                      {t('payments.col_status')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {history.map((row) => (
                    <tr key={row.id}>
                      {/* The only cell allowed to wrap: holding the name on one
                          line pushes Estado off the wrapper on a normal column,
                          and it is the one text with room to break. */}
                      <td className="min-w-48 px-5 py-3.5 text-left font-semibold text-ink">
                        {row.name}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-center text-muted-foreground">
                        {t(`payments.type_${row.type}`)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-center tabular-nums text-muted-foreground">
                        {row.payment.paidAt &&
                          formatDateNumeric(row.payment.paidAt, locale)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums font-semibold text-ink">
                        {formatMoney(
                          row.payment.amountCents,
                          row.payment.currency,
                          locale,
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-center">
                        <StatusBadge
                          tone={paymentTone[row.payment.status]}
                          label={t(`payment_status.${row.payment.status}`)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </div>
  )
}
