'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { ContinuationOffer } from '@/lib/portal/types'
import { formatDate, formatMoney, type Locale } from '@/lib/format'
import { Card, EmptyState, StatusBadge } from '@/components/portal/ui'
import { Icon } from '@/components/portal/icons'
import { ReceiptUploadForm } from '@/components/portal/receipt-upload'
import { AutoGrid } from '@/components/layout/auto-grid'

/**
 * Continuation offers — next level, repeat module, re-enrollment. Whoever is
 * already a student never goes back through the public site (decision
 * 02/09/2026): the offer runs on the existing record, so there is no personal
 * data step here — only the choices that are genuinely new: start date and
 * schedule (separate choices, CLAUDE.md §1), then the receipt.
 *
 * Mockup: reserving flips local state; in production it holds the seat with
 * the same atomic UPDATE and the same two clocks as the public checkout
 * (CLAUDE.md §5).
 */
export function ContinueView({ offers }: { offers: ContinuationOffer[] }) {
  const t = useTranslations('portal')
  const locale = useLocale() as Locale

  const [groupByOffer, setGroupByOffer] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({})

  if (offers.length === 0) {
    return (
      <EmptyState
        title={t('continue_page.empty_title')}
        body={t('continue_page.empty_body')}
        icon={<Icon name="star" size={24} />}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {offers.map((offer) => {
        const chosenId = groupByOffer[offer.id] ?? null
        const chosen = offer.groups.find((g) => g.id === chosenId) ?? null
        const done = submitted[offer.id] === true

        if (done) {
          return (
            <Card key={offer.id} className="p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                  <Icon name="check" size={20} />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-ink">
                      {t('continue_page.submitted_title', {
                        course: offer.courseName,
                      })}
                    </h2>
                    <StatusBadge
                      tone="warning"
                      label={t('payment_status.under_review')}
                    />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('continue_page.submitted_body')}
                  </p>
                </div>
              </div>
            </Card>
          )
        }

        return (
          <Card key={offer.id} className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-yellow/15 px-2.5 py-1 text-xs font-semibold text-brand-yellow-deep ring-1 ring-inset ring-brand-yellow-deep/20">
                  <Icon name="star" size={14} />
                  {t(`continue_page.kind.${offer.kind}`)}
                </span>
                <h2 className="mt-2 text-xl font-semibold text-ink">
                  {offer.courseName}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {t('continue_page.based_on', {
                    course: offer.basedOnCourseName,
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('continue_page.price_label')}
                </p>
                <p className="text-2xl font-bold tracking-tight text-ink">
                  {formatMoney(offer.priceCents, offer.currency, locale)}
                </p>
              </div>
            </div>

            {/* Start date + schedule — the only real choices left. */}
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold text-ink">
                {t('continue_page.choose_group')}
              </p>
              <AutoGrid min="16rem" gap="gap-3">
                {offer.groups.map((g) => {
                  const selected = chosenId === g.id
                  const schedule = g.schedule
                    .map(
                      (s) =>
                        `${t(`weekday_short.${s.weekday}`)} ${s.startTime}–${s.endTime}`,
                    )
                    .join(' · ')
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() =>
                        setGroupByOffer((prev) => ({
                          ...prev,
                          [offer.id]: g.id,
                        }))
                      }
                      aria-pressed={selected}
                      className={`flex flex-col gap-1 rounded-xl border p-4 text-left transition ${
                        selected
                          ? 'border-brand-blue bg-sky ring-1 ring-brand-blue'
                          : 'border-line bg-white hover:border-brand-blue/50'
                      }`}
                    >
                      <span className="text-sm font-semibold text-ink">
                        {g.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {g.teacherName}
                      </span>
                      <span className="text-xs font-medium text-ink">
                        {schedule}
                      </span>
                      <span className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {t('continue_page.starts', {
                            date: formatDate(g.startDate, locale),
                          })}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Icon name="seat" size={14} />
                          {t('continue_page.seats_left', { count: g.seatsLeft })}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </AutoGrid>
            </div>

            {chosen && (
              <div className="mt-5 rounded-xl border border-line bg-sky-soft p-4">
                <ReceiptUploadForm
                  amountCents={offer.priceCents}
                  currency={offer.currency}
                  submitLabel={t('continue_page.reserve_cta')}
                  onSubmit={() =>
                    setSubmitted((prev) => ({ ...prev, [offer.id]: true }))
                  }
                />
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
