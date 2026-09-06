'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { formatDate, formatMoney, type Locale } from '@/lib/format'
import { Card, StatusBadge } from '@/components/portal/ui'
import { Icon } from '@/components/portal/icons'
import { ReceiptUploadForm } from '@/components/portal/receipt-upload'

/**
 * One due month of a monthly (English) enrollment. Mockup: the submit flips
 * local state to the submitted view — in production it creates the payment row
 * and enqueues the same OCR ladder as the enrollment receipt (CLAUDE.md §5).
 *
 * The tone is deliberate: an overdue month is never a debt (CLAUDE.md §1) —
 * the copy says "access is paused", not "you owe us".
 */
export function MonthlyPaymentCard({
  courseName,
  moduleName,
  dueDate,
  amountCents,
  currency,
  locked,
}: {
  courseName: string
  moduleName: string
  dueDate: string
  amountCents: number
  currency: string
  locked: boolean
}) {
  const t = useTranslations('portal')
  const locale = useLocale() as Locale
  const [phase, setPhase] = useState<'due' | 'form' | 'submitted'>('due')

  if (phase === 'submitted') {
    return (
      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700">
            <Icon name="check" size={20} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-ink">
                {t('payments.submitted_title')}
              </h3>
              <StatusBadge tone="warning" label={t('payment_status.under_review')} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('payments.submitted_body')}
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div
        className={`flex items-start gap-3 px-5 py-4 ${
          locked ? 'bg-red-50' : 'bg-brand-yellow/10'
        }`}
      >
        <span
          className={`mt-0.5 shrink-0 ${
            locked ? 'text-red-600' : 'text-brand-yellow-deep'
          }`}
        >
          <Icon name={locked ? 'lock' : 'clock'} size={20} />
        </span>
        <p className="text-sm text-ink">
          {locked
            ? t('payments.locked_note', { course: courseName })
            : t('payments.due_note', {
                date: formatDate(dueDate, locale),
              })}
        </p>
      </div>

      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-ink">{courseName}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{moduleName}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t('payments.due_label')}:{' '}
              <span className="font-semibold text-ink">
                {formatDate(dueDate, locale)}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t('receipt_form.amount_label')}
            </p>
            <p className="text-2xl font-bold tracking-tight text-ink">
              {formatMoney(amountCents, currency, locale)}
            </p>
          </div>
        </div>

        {phase === 'form' ? (
          <div className="rounded-xl border border-line bg-sky-soft p-4">
            <ReceiptUploadForm
              amountCents={amountCents}
              currency={currency}
              submitLabel={t('payments.submit')}
              onSubmit={() => setPhase('submitted')}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPhase('form')}
            className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-brand-blue px-5 py-2.5 text-sm font-bold text-white shadow-card transition hover:bg-brand-yellow hover:text-ink"
          >
            <Icon name="upload" size={16} />
            {t('payments.open_form')}
          </button>
        )}
      </div>
    </Card>
  )
}
