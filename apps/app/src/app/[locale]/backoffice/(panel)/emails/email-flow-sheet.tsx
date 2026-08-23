'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { EmailFlow, EmailTemplate } from '@/lib/backoffice/types'
import {
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
  type Locale,
} from '@/lib/format'
import { AutoGrid } from '@/components/layout/auto-grid'
import { Card, SectionTitle, StatusBadge } from '@/components/backoffice/ui'
import { Toggle } from '@/components/backoffice/controls'
import { BoIcon } from '@/components/backoffice/icons'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

/** How many addresses one proof may go to (`docs/ROADMAP.md` fase 5). */
const MAX_TEST_RECIPIENTS = 5

/** Enough to catch a typo before it becomes a bounce; the provider is the judge. */
const ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * One automatic e-mail, opened from the catalog: what it says, whether it goes
 * out, and how the window went.
 *
 * The preview is rendered from the versioned template in the repository, over
 * invented sample data (CLAUDE.md §5, §8) — never over a real student, and
 * never the copy somebody drew in the provider's panel. It renders in the
 * panel's language here; the person receiving it gets their own.
 */
export function EmailFlowSheet({
  flow,
  windowDays,
  onClose,
  onToggle,
  onTestSent,
}: {
  flow: EmailFlow | null
  windowDays: number
  onClose: () => void
  onToggle: (template: EmailTemplate, enabled: boolean) => void
  onTestSent: (count: number) => void
}) {
  const t = useTranslations('bo')
  const locale = useLocale() as Locale

  const [recipients, setRecipients] = useState('')
  const [error, setError] = useState<string | null>(null)

  function close() {
    setRecipients('')
    setError(null)
    onClose()
  }

  function sendTest() {
    const list = recipients
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0)

    if (list.length === 0) {
      setError(t('emails.test_error_empty'))
      return
    }
    if (list.length > MAX_TEST_RECIPIENTS) {
      setError(t('emails.test_error_max', { max: MAX_TEST_RECIPIENTS }))
      return
    }
    const bad = list.find((value) => !ADDRESS.test(value))
    if (bad) {
      setError(t('emails.test_error_invalid', { value: bad }))
      return
    }

    setError(null)
    setRecipients('')
    onTestSent(list.length)
  }

  /**
   * The sample the template renders over. The bag is shared by every string of
   * the preview — a template that does not name the guardian simply ignores it.
   */
  const values = flow && {
    name: flow.sample.studentName,
    guardian: flow.sample.guardianName,
    course: flow.sample.courseName,
    classGroup: flow.sample.classGroupName,
    amount: formatMoney(flow.sample.amountCents, 'PEN', locale),
    date: formatDate(flow.sample.date, locale),
  }

  const rate =
    flow && flow.metrics.sent > 0 ? flow.metrics.delivered / flow.metrics.sent : null

  return (
    <Sheet
      open={flow !== null}
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <SheetContent
        side="right"
        closeLabel={t('emails.panel_close')}
        className="w-full gap-0 overflow-y-auto bg-white p-0 sm:max-w-lg"
      >
        {flow && values && (
          <>
            <SheetHeader className="gap-2 border-b border-line p-5 pr-14">
              <SheetTitle className="text-base font-semibold text-ink">
                {t(`email_template.${flow.template}`)}
              </SheetTitle>
              <SheetDescription>{t(`email_trigger.${flow.template}`)}</SheetDescription>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <StatusBadge
                  tone={flow.enabled ? 'success' : 'warning'}
                  label={t(flow.enabled ? 'emails.state_on' : 'emails.state_off')}
                />
                <StatusBadge
                  tone="neutral"
                  dot={false}
                  label={t(`email_audience.${flow.audience}`)}
                />
                <StatusBadge
                  tone="info"
                  dot={false}
                  label={t('emails.version', { version: flow.version })}
                />
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-6 p-5">
              {/* Switch */}
              <section className="flex flex-col gap-3">
                <SectionTitle icon="settings">{t('emails.state_title')}</SectionTitle>
                <Card className="p-4">
                  <Toggle
                    checked={flow.enabled}
                    onChange={(next) => onToggle(flow.template, next)}
                    label={t('emails.state_label')}
                    hint={t(
                      flow.enabled ? 'emails.state_hint_on' : 'emails.state_hint_off',
                    )}
                  />
                </Card>
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <BoIcon name="shield" size={14} className="mt-0.5 shrink-0" />
                  {t('emails.audit_notice')}
                </p>
              </section>

              {/* Preview */}
              <section className="flex flex-col gap-3">
                <SectionTitle icon="doc">{t('emails.preview_title')}</SectionTitle>
                <Card className="overflow-hidden">
                  <div className="border-b border-line bg-sky-soft px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t('emails.preview_subject')}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-ink">
                      {t(`email_preview.${flow.template}.subject`, values)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 px-4 py-4 text-sm leading-relaxed text-ink">
                    <p>{t(`email_preview.${flow.template}.p1`, values)}</p>
                    <p>{t(`email_preview.${flow.template}.p2`, values)}</p>
                    {/* The template's call to action, drawn as it lands in the
                        inbox — a button here would invite a click that sends
                        nothing. */}
                    <span className="mt-1 self-start rounded-lg bg-brand-blue px-3.5 py-2 text-sm font-semibold text-white">
                      {t(`email_preview.${flow.template}.cta`, values)}
                    </span>
                  </div>
                </Card>
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <BoIcon name="alert" size={14} className="mt-0.5 shrink-0" />
                  {t('emails.preview_note')}
                </p>
              </section>

              {/* The window */}
              <section className="flex flex-col gap-3">
                <SectionTitle icon="trend-up">
                  {t('emails.metrics_title', { days: windowDays })}
                </SectionTitle>
                <AutoGrid min="7rem" gap="gap-2" as="dl">
                  <Metric
                    label={t('emails.metric_sent')}
                    value={formatNumber(flow.metrics.sent, locale)}
                  />
                  <Metric
                    label={t('emails.metric_delivered')}
                    value={formatNumber(flow.metrics.delivered, locale)}
                    hint={rate === null ? undefined : formatPercent(rate, locale)}
                  />
                  <Metric
                    label={t('emails.metric_bounced')}
                    value={formatNumber(flow.metrics.bounced, locale)}
                    tone={flow.metrics.bounced > 0 ? 'warning' : undefined}
                  />
                  <Metric
                    label={t('emails.metric_failed')}
                    value={formatNumber(flow.metrics.failed, locale)}
                    tone={flow.metrics.failed > 0 ? 'danger' : undefined}
                  />
                </AutoGrid>
              </section>

              {/* Proof */}
              <section className="flex flex-col gap-3">
                <SectionTitle icon="email">{t('emails.test_title')}</SectionTitle>
                <p className="text-xs text-muted-foreground">
                  {t('emails.test_hint', {
                    max: MAX_TEST_RECIPIENTS,
                    prefix: t('emails.test_prefix'),
                  })}
                </p>
                <label className="flex flex-col gap-1.5">
                  <span className="sr-only">{t('emails.test_label')}</span>
                  <input
                    type="text"
                    value={recipients}
                    onChange={(event) => {
                      setRecipients(event.target.value)
                      setError(null)
                    }}
                    placeholder={t('emails.test_placeholder')}
                    aria-invalid={error !== null}
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted-foreground focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                  />
                </label>
                {error && <p className="text-xs font-medium text-red-600">{error}</p>}
                <button
                  type="button"
                  onClick={sendTest}
                  className="inline-flex items-center justify-center gap-1.5 self-start rounded-lg bg-brand-blue px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-yellow hover:text-ink active:bg-brand-yellow-deep"
                >
                  <BoIcon name="email" size={16} />
                  {t('emails.test_send')}
                </button>
                {/* The staging guard, said out loud: outside production the
                    provider refuses anything off the allowlist (CLAUDE.md §6),
                    so a proof that never arrives is the rule working. */}
                <p className="flex items-start gap-2 rounded-lg border border-dashed border-line bg-sky-soft px-3 py-2 text-xs text-muted-foreground">
                  <BoIcon name="shield" size={14} className="mt-0.5 shrink-0" />
                  {t('emails.test_guard')}
                </p>
              </section>

              <p className="flex items-start gap-2 border-t border-line pt-4 text-xs text-muted-foreground">
                <BoIcon name="alert" size={14} className="mt-0.5 shrink-0" />
                {t('emails.no_send_notice')}
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

/** One figure of the window. Copy arrives translated (CLAUDE.md §4). */
function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'warning' | 'danger'
}) {
  const valueTone =
    tone === 'danger' ? 'text-red-600' : tone === 'warning' ? 'text-amber-700' : 'text-ink'
  return (
    <div className="rounded-lg border border-line px-3 py-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={`mt-0.5 text-lg font-semibold tabular-nums ${valueTone}`}>
        {value}
        {hint && (
          <span className="ml-1.5 text-xs font-medium text-muted-foreground">{hint}</span>
        )}
      </dd>
    </div>
  )
}
