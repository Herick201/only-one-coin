'use client'

import { useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type {
  AcademicSettings,
  GeneralSettings,
  PaymentSettings,
} from '@/lib/backoffice/types'
import { formatMoney, type Locale } from '@/lib/format'
import { Card, SectionTitle } from '@/components/backoffice/ui'
import { Toast } from '@/components/backoffice/controls'
import { BoIcon } from '@/components/backoffice/icons'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const numberClass =
  'w-32 rounded-lg border border-line bg-white px-3 py-2 text-sm tabular-nums text-ink outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15'

/**
 * The numbers the platform runs on, in two blocks.
 *
 * The academic ones are what counts as approved, how long the institution has
 * to issue, what a paid procedure costs and how early a contract starts
 * warning. The receipt ones are what the pipeline approves on before it asks
 * for a human. All of them are settings rather than constants for the reason
 * CLAUDE.md §5 gives about the tolerance: the Asociación changing what a rule
 * means must not require a deploy.
 *
 * Nothing is submitted yet: there is no API behind this screen, and the save
 * button says so.
 */
export function SettingsForm({ settings }: { settings: GeneralSettings }) {
  const t = useTranslations('bo')
  const locale = useLocale() as Locale

  const [draft, setDraft] = useState<GeneralSettings>(settings)
  const [toast, setToast] = useState<string | null>(null)

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings)

  function setAcademic<K extends keyof AcademicSettings>(
    key: K,
    value: AcademicSettings[K],
  ) {
    setDraft({ ...draft, academic: { ...draft.academic, [key]: value } })
  }

  function setReceipts<K extends keyof PaymentSettings>(
    key: K,
    value: PaymentSettings[K],
  ) {
    setDraft({ ...draft, receipts: { ...draft.receipts, [key]: value } })
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <SectionTitle icon="courses">{t('settings.academic_title')}</SectionTitle>
        <Card className="divide-y divide-line">
          <Row
            helpLabel={t('common.help')}
            label={t('settings.passing_grade_label')}
            hint={t('settings.passing_grade_hint')}
            value={t('settings.passing_grade_value', { grade: draft.academic.passingGrade })}
          >
            <input
              type="number"
              min={0}
              max={20}
              step={1}
              aria-label={t('settings.passing_grade_label')}
              value={draft.academic.passingGrade}
              onChange={(event) => setAcademic('passingGrade', Number(event.target.value))}
              className={numberClass}
            />
          </Row>

          <Row
            helpLabel={t('common.help')}
            label={t('settings.certificate_deadline_label')}
            hint={t('settings.certificate_deadline_hint')}
            value={t('settings.business_days_value', {
              days: draft.academic.certificateDeadlineBusinessDays,
            })}
          >
            <input
              type="number"
              min={1}
              max={90}
              aria-label={t('settings.certificate_deadline_label')}
              value={draft.academic.certificateDeadlineBusinessDays}
              onChange={(event) =>
                setAcademic('certificateDeadlineBusinessDays', Number(event.target.value))
              }
              className={numberClass}
            />
          </Row>

          <Row
            helpLabel={t('common.help')}
            label={t('settings.constancia_fee_label')}
            hint={t('settings.constancia_fee_hint')}
            value={formatMoney(draft.academic.constanciaFeeCents, 'PEN', locale)}
          >
            <input
              type="number"
              min={0}
              step={0.5}
              aria-label={t('settings.constancia_fee_label')}
              value={draft.academic.constanciaFeeCents / 100}
              onChange={(event) =>
                // Soles typed by hand are the only float in the flow, and it
                // stops on this line: what is stored is integer cents
                // (CLAUDE.md §5).
                setAcademic('constanciaFeeCents', Math.round(Number(event.target.value) * 100))
              }
              className={numberClass}
            />
          </Row>

          <Row
            helpLabel={t('common.help')}
            label={t('settings.contract_alert_label')}
            hint={t('settings.contract_alert_hint')}
            value={t('settings.days_value', { days: draft.academic.contractAlertDays })}
          >
            <input
              type="number"
              min={1}
              max={180}
              aria-label={t('settings.contract_alert_label')}
              value={draft.academic.contractAlertDays}
              onChange={(event) => setAcademic('contractAlertDays', Number(event.target.value))}
              className={numberClass}
            />
          </Row>
        </Card>
        <Notice>{t('settings.academic_notice')}</Notice>
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle icon="payments">{t('settings.receipts_title')}</SectionTitle>
        <Card className="divide-y divide-line">
          <Row
            helpLabel={t('common.help')}
            label={t('settings.tolerance_label')}
            hint={t('settings.tolerance_hint')}
            value={formatMoney(draft.receipts.toleranceCents, 'PEN', locale)}
          >
            <input
              type="number"
              min={0}
              max={50}
              step={0.5}
              aria-label={t('settings.tolerance_label')}
              value={draft.receipts.toleranceCents / 100}
              onChange={(event) =>
                setReceipts(
                  'toleranceCents',
                  Math.round(Number(event.target.value) * 100),
                )
              }
              className={numberClass}
            />
          </Row>

          <Row
            helpLabel={t('common.help')}
            label={t('settings.confidence_label')}
            hint={t('settings.confidence_hint')}
            value={t('settings.confidence_value', {
              value: Math.round(draft.receipts.escalationConfidence * 100),
            })}
          >
            <input
              type="range"
              min={50}
              max={95}
              step={1}
              aria-label={t('settings.confidence_label')}
              value={Math.round(draft.receipts.escalationConfidence * 100)}
              onChange={(event) =>
                setReceipts('escalationConfidence', Number(event.target.value) / 100)
              }
              className="w-32 accent-brand-blue"
            />
          </Row>

          <Row
            helpLabel={t('common.help')}
            label={t('settings.reservation_label')}
            hint={t('settings.reservation_hint')}
            value={t('settings.reservation_value', {
              days: draft.receipts.reservationDays,
            })}
          >
            <input
              type="number"
              min={1}
              max={30}
              aria-label={t('settings.reservation_label')}
              value={draft.receipts.reservationDays}
              onChange={(event) =>
                setReceipts('reservationDays', Number(event.target.value))
              }
              className={numberClass}
            />
          </Row>
        </Card>
        <Notice>{t('settings.receipts_notice')}</Notice>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!dirty}
          onClick={() => setToast(t('settings.saved_toast'))}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-yellow hover:text-ink active:bg-brand-yellow-deep disabled:cursor-not-allowed disabled:opacity-40"
        >
          <BoIcon name="check" size={16} />
          {t('settings.save')}
        </button>
        <button
          type="button"
          disabled={!dirty}
          onClick={() => setDraft(settings)}
          className="rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-muted-foreground transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t('settings.cancel')}
        </button>
      </div>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}

/**
 * Label, what the value currently reads as, and the control — with the reason
 * the setting exists folded into a `?` beside the label.
 *
 * Folded rather than printed: these rows are read by someone who already knows
 * what a tolerance is and comes here to change a number, and four paragraphs of
 * explanation between them turns a four-line list into a page of scrolling. The
 * explanation still has to be reachable, though — a number nobody can justify is
 * a number nobody dares touch — so it is one hover or one tab-stop away, never
 * deleted.
 *
 * The rendered value sits apart from the input on purpose: a fee typed as `25`
 * has to be read back as money before anybody agrees to it.
 */
function Row({
  label,
  hint,
  helpLabel,
  value,
  children,
}: {
  label: string
  hint: string
  /** Names the `?` for a screen reader; the hint itself is the description. */
  helpLabel: string
  value: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <span className="flex min-w-64 flex-1 items-center gap-1.5">
        <span className="text-sm font-semibold text-ink">{label}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="shrink-0 rounded-full text-muted-foreground transition hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40"
            >
              <BoIcon name="help" size={15} />
              <span className="sr-only">{helpLabel}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6} className="max-w-xs leading-relaxed">
            {hint}
          </TooltipContent>
        </Tooltip>
      </span>
      <span className="flex shrink-0 items-center gap-3">
        <span className="w-32 text-right text-sm font-semibold tabular-nums text-ink">
          {value}
        </span>
        {children}
      </span>
    </div>
  )
}

/** Inline note under the block — the rule behind the fields, not a field. */
function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-dashed border-line bg-sky-soft px-3 py-2 text-xs text-muted-foreground">
      <BoIcon name="alert" size={14} className="mt-0.5 shrink-0" />
      {children}
    </p>
  )
}
