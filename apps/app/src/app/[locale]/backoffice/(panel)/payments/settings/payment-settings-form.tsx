'use client'

import { useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { PaymentSettings } from '@/lib/backoffice/types'
import { formatMoney, type Locale } from '@/lib/format'
import { Card } from '@/components/backoffice/ui'
import { Toast } from '@/components/backoffice/controls'
import { BoIcon } from '@/components/backoffice/icons'

const fieldClass =
  'w-32 rounded-lg border border-line bg-white px-3 py-2 text-sm tabular-nums text-ink outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15'

/**
 * The parameters the receipt pipeline reads. Tolerance is here because it has
 * to be — a constant in the code means a redeploy every time the Asociación
 * changes what "close enough" means (CLAUDE.md §5). The other two are the
 * numbers the rules already fix: the confidence that escalates a field, and
 * the five days a seat stays reserved without an approved payment.
 *
 * Money is edited in soles and kept in integer cents; the input never holds a
 * float that later becomes a price (CLAUDE.md §5).
 */
export function PaymentSettingsForm({ settings }: { settings: PaymentSettings }) {
  const t = useTranslations('bo')
  const locale = useLocale() as Locale

  const [draft, setDraft] = useState<PaymentSettings>(settings)
  const [toast, setToast] = useState<string | null>(null)

  const dirty =
    draft.toleranceCents !== settings.toleranceCents ||
    draft.escalationConfidence !== settings.escalationConfidence ||
    draft.reservationDays !== settings.reservationDays

  function set<K extends keyof PaymentSettings>(key: K, value: PaymentSettings[K]) {
    setDraft({ ...draft, [key]: value })
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="divide-y divide-line">
        <Row
          label={t('payment_settings.tolerance_label')}
          hint={t('payment_settings.tolerance_hint')}
          value={formatMoney(draft.toleranceCents, 'PEN', locale)}
        >
          <input
            type="number"
            min={0}
            max={50}
            step={0.5}
            aria-label={t('payment_settings.tolerance_label')}
            value={draft.toleranceCents / 100}
            onChange={(event) =>
              // Rounded on the way in: soles typed by hand are the only float
              // in the flow, and it stops at this line.
              set('toleranceCents', Math.round(Number(event.target.value) * 100))
            }
            className={fieldClass}
          />
        </Row>

        <Row
          label={t('payment_settings.confidence_label')}
          hint={t('payment_settings.confidence_hint')}
          value={t('payment_settings.confidence_value', {
            value: Math.round(draft.escalationConfidence * 100),
          })}
        >
          <input
            type="range"
            min={50}
            max={95}
            step={1}
            aria-label={t('payment_settings.confidence_label')}
            value={Math.round(draft.escalationConfidence * 100)}
            onChange={(event) =>
              set('escalationConfidence', Number(event.target.value) / 100)
            }
            className="w-32 accent-brand-blue"
          />
        </Row>

        <Row
          label={t('payment_settings.reservation_label')}
          hint={t('payment_settings.reservation_hint')}
          value={t('payment_settings.reservation_value', { days: draft.reservationDays })}
        >
          <input
            type="number"
            min={1}
            max={30}
            aria-label={t('payment_settings.reservation_label')}
            value={draft.reservationDays}
            onChange={(event) => set('reservationDays', Number(event.target.value))}
            className={fieldClass}
          />
        </Row>
      </Card>

      <p className="flex items-start gap-2 rounded-lg border border-dashed border-line bg-sky-soft px-3 py-2 text-xs text-muted-foreground">
        <BoIcon name="alert" size={14} className="mt-0.5 shrink-0" />
        {t('payment_settings.audit_notice')}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!dirty}
          onClick={() => setToast(t('payment_settings.saved_toast'))}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-yellow hover:text-ink active:bg-brand-yellow-deep disabled:cursor-not-allowed disabled:opacity-40"
        >
          <BoIcon name="check" size={16} />
          {t('payment_settings.save')}
        </button>
        <button
          type="button"
          disabled={!dirty}
          onClick={() => setDraft(settings)}
          className="rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-muted-foreground transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t('payment_settings.cancel')}
        </button>
      </div>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}

/**
 * Label, why it matters, the control, and what the value currently reads as.
 * The rendered value sits apart from the input on purpose: a tolerance typed as
 * `1.5` has to be read back as money before anybody agrees to it.
 */
function Row({
  label,
  hint,
  value,
  children,
}: {
  label: string
  hint: string
  value: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 p-4">
      <span className="flex min-w-64 flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold text-ink">{label}</span>
        <span className="max-w-md text-xs text-muted-foreground">{hint}</span>
      </span>
      <span className="flex shrink-0 items-center gap-3">
        <span className="w-24 text-right text-sm font-semibold tabular-nums text-ink">
          {value}
        </span>
        {children}
      </span>
    </div>
  )
}
