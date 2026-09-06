'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { formatDateNumeric, formatMoney, type Locale } from '@/lib/format'
import type { PaymentStatus } from '@/lib/portal/types'
import { Card, StatusBadge } from '@/components/portal/ui'
import { Icon } from '@/components/portal/icons'
import { ReceiptUploadForm } from '@/components/portal/receipt-upload'

export type PendingModule = {
  moduleId: string
  /** 1-based order within the course. */
  sequence: number
  dueDate: string
}

export type SettledModule = {
  moduleId: string
  sequence: number
  status: PaymentStatus
}

/**
 * The module ledger of a monthly (English) enrollment: what is already settled,
 * the module that is due, and the ones after it, which the student may pay
 * ahead (decision 06/09/2026). Nothing comes pre-picked — the student chooses,
 * and the summary beside the list says what that choice costs before any button
 * is live.
 *
 * The selection is a prefix, never a free pick: modules run in order, so paying
 * the fourth while the third is open is not a thing. Clicking a row picks it
 * and everything before it; clicking the last picked row drops it.
 *
 * The register is deliberate — this is money. The state is a label ("payment
 * pending"), never a dunning line; numbers are tabular; dates are digits.
 *
 * Mockup: the submit flips local state to the submitted view — in production it
 * creates the payment row and enqueues the same OCR ladder as the enrollment
 * receipt (CLAUDE.md §5).
 */
export function MonthlyPaymentCard({
  courseName,
  settledModules,
  modules,
  modulePriceCents,
  currency,
  locked,
}: {
  courseName: string
  /** Modules already paid (or under review), in course order. */
  settledModules: SettledModule[]
  /** Unpaid modules, in course order; the first is the one that is due. */
  modules: PendingModule[]
  modulePriceCents: number
  currency: string
  locked: boolean
}) {
  const t = useTranslations('portal')
  const locale = useLocale() as Locale
  const [phase, setPhase] = useState<'due' | 'form' | 'submitted'>('due')
  const [selectedCount, setSelectedCount] = useState(0)

  const selected = modules.slice(0, selectedCount)
  const total = selectedCount * modulePriceCents
  const hasSelection = selectedCount > 0

  if (phase === 'submitted') {
    return (
      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
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

  const summary = (
    <div className="flex h-full flex-col rounded-lg border border-line bg-sky-soft p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t('payments.summary_title')}
      </p>

      {hasSelection ? (
        <>
          <p className="mt-2 text-sm font-semibold text-ink">{courseName}</p>
          <p className="text-sm text-muted-foreground">
            {selected.map((m) => t('module_label', { n: m.sequence })).join(', ')}
          </p>
          <div className="mt-3 border-t border-line pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t('payments.total_label')} ·{' '}
              {t('payments.summary_modules', { count: selectedCount })}
            </p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-ink">
              {formatMoney(total, currency, locale)}
            </p>
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          {t('payments.select_prompt')}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          disabled={!hasSelection}
          onClick={() => setPhase('form')}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-yellow hover:text-ink disabled:cursor-not-allowed disabled:bg-line disabled:text-muted-foreground disabled:hover:bg-line disabled:hover:text-muted-foreground"
        >
          <Icon name="upload" size={15} />
          {t('payments.open_form')}
        </button>
        {/* Placeholder for the day a gateway exists: paying inside the platform
            is out of scope today (CLAUDE.md §2), so the control announces it and
            does nothing — disabled, never clickable. */}
        <button
          type="button"
          disabled
          className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-muted-foreground"
        >
          <Icon name="lock" size={15} />
          {t('payments.pay_online')}
        </button>
        <p className="text-[11px] leading-snug text-muted-foreground">
          {t('payments.pay_online_soon')}
        </p>
      </div>
    </div>
  )

  return (
    <Card className="overflow-hidden">
      <div
        className={`flex items-center gap-2.5 px-5 py-3 ${
          locked ? 'bg-red-50' : 'bg-sky'
        }`}
      >
        <span
          className={`shrink-0 ${locked ? 'text-red-700' : 'text-muted-foreground'}`}
        >
          <Icon name={locked ? 'lock' : 'clock'} size={15} />
        </span>
        <p
          className={`text-xs font-bold uppercase tracking-wide ${
            locked ? 'text-red-700' : 'text-muted-foreground'
          }`}
        >
          {locked ? t('payments.status_pending') : t('payments.status_upcoming')}
        </p>
      </div>

      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <h3 className="text-base font-semibold text-ink">{courseName}</h3>

        {phase === 'form' ? (
          <div className="flex flex-col gap-4">
            {/* One line, not the panel again: the form below carries the
                amount, so repeating the total (and the buttons that opened
                this form) would only ask the same thing twice. */}
            <p className="-mt-3 text-sm text-muted-foreground">
              {selected.map((m) => t('module_label', { n: m.sequence })).join(', ')}
            </p>
            <div className="rounded-lg border border-line p-4">
              <ReceiptUploadForm
                amountCents={total}
                currency={currency}
                submitLabel={t('payments.submit')}
                onSubmit={() => setPhase('submitted')}
              />
            </div>
          </div>
        ) : (
          /* List and summary side by side once the column can hold both —
             container query, never a viewport breakpoint (CLAUDE.md §5). */
          <div className="grid gap-4 @2xl/page:grid-cols-[minmax(0,1fr)_19rem]">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t('payments.modules_title')}
              </p>
              <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
                {/* What is already settled, first: the ledger reads top to
                    bottom in course order, and a student checking what to pay
                    is also checking what they already paid. Never clickable. */}
                {settledModules.map((m) => (
                  <li
                    key={m.moduleId}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-sky-soft/60 px-4 py-3"
                  >
                    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-[3px] border border-line bg-line text-muted-foreground">
                      <Icon name="check" size={11} />
                    </span>
                    <span className="min-w-0 flex-1 basis-32 text-sm font-medium text-muted-foreground">
                      {t('module_label', { n: m.sequence })}
                    </span>
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {t(`payment_status.${m.status}`)}
                    </span>
                    <span className="ml-auto whitespace-nowrap text-sm font-medium tabular-nums text-muted-foreground">
                      {formatMoney(modulePriceCents, currency, locale)}
                    </span>
                  </li>
                ))}
                {modules.map((m, i) => {
                  const isSelected = i < selectedCount
                  return (
                    <li key={m.moduleId}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isSelected}
                        onClick={() =>
                          setSelectedCount(
                            isSelected && i === selectedCount - 1 ? i : i + 1,
                          )
                        }
                        className={`flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left transition ${
                          isSelected ? 'bg-sky-soft' : 'bg-white hover:bg-sky-soft'
                        }`}
                      >
                        <span
                          className={`grid h-4 w-4 shrink-0 place-items-center rounded-[3px] border ${
                            isSelected
                              ? 'border-brand-blue bg-brand-blue text-white'
                              : 'border-muted-foreground/40 bg-white text-transparent'
                          }`}
                        >
                          <Icon name="check" size={11} />
                        </span>
                        <span className="min-w-0 flex-1 basis-32 text-sm font-medium text-ink">
                          {t('module_label', { n: m.sequence })}
                        </span>
                        <span className="text-[11px] font-medium uppercase tracking-wide tabular-nums text-muted-foreground">
                          {t('payments.due_short', {
                            date: formatDateNumeric(m.dueDate, locale),
                          })}
                        </span>
                        <span className="ml-auto whitespace-nowrap text-sm font-semibold tabular-nums text-ink">
                          {formatMoney(modulePriceCents, currency, locale)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>

            {summary}
          </div>
        )}
      </div>
    </Card>
  )
}
