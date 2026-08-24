'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { EmailFlow } from '@/lib/backoffice/types'
import {
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
  type Locale,
} from '@/lib/format'
import {
  MAX_TEST_RECIPIENTS,
  parseTestRecipients,
} from '@/lib/backoffice/email-proof'
import { AutoGrid } from '@/components/layout/auto-grid'
import {
  Card,
  PageHeader,
  SectionTitle,
  StatusBadge,
} from '@/components/backoffice/ui'
import { Toast, Toggle } from '@/components/backoffice/controls'
import { BoIcon } from '@/components/backoffice/icons'

/**
 * The e-mail itself. Two columns where the column is wide enough for them: the
 * message on the left at the width it is read at, and everything you can *do*
 * to it on the right — switch, figures, proof.
 *
 * The split is a container query, not a viewport breakpoint: this page sits
 * inside the panel's column, and the same window gives it ~1000px with the
 * sidebar open and ~1170px with it collapsed (CLAUDE.md §7).
 *
 * The preview renders the versioned template from the repository over invented
 * sample data (CLAUDE.md §5, §8) — never a real student, and never the copy
 * somebody drew in the provider's panel. It renders in the panel's language
 * here; the person receiving it gets their own.
 */
export function EmailFlowDetail({
  flow,
  windowDays,
}: {
  flow: EmailFlow
  windowDays: number
}) {
  const t = useTranslations('bo')
  const locale = useLocale() as Locale

  const [enabled, setEnabled] = useState(flow.enabled)
  const [recipients, setRecipients] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function toggle(next: boolean) {
    setEnabled(next)
    setToast(t(next ? 'emails.toast_enabled' : 'emails.toast_paused'))
  }

  function sendTest() {
    const parsed = parseTestRecipients(recipients)
    if (!parsed.ok) {
      /* Written out rather than nested: the invalid case is the only one
         carrying the address that failed, and a ternary chain hides that. */
      if (parsed.reason === 'empty') setError(t('emails.test_error_empty'))
      else if (parsed.reason === 'max')
        setError(t('emails.test_error_max', { max: MAX_TEST_RECIPIENTS }))
      else setError(t('emails.test_error_invalid', { value: parsed.value }))
      return
    }

    setError(null)
    setRecipients('')
    setToast(t('emails.test_toast', { count: parsed.list.length }))
  }

  /**
   * The sample the template renders over. The bag is shared by every string of
   * the preview — a template that does not name the guardian simply ignores it.
   */
  const values = {
    name: flow.sample.studentName,
    guardian: flow.sample.guardianName,
    course: flow.sample.courseName,
    classGroup: flow.sample.classGroupName,
    amount: formatMoney(flow.sample.amountCents, 'PEN', locale),
    date: formatDate(flow.sample.date, locale),
  }

  const recipient =
    flow.audience === 'guardian'
      ? `${flow.sample.guardianName} <${flow.sample.guardianEmail}>`
      : `${flow.sample.studentName} <${flow.sample.studentEmail}>`

  const rate = flow.metrics.sent === 0 ? null : flow.metrics.delivered / flow.metrics.sent

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t(`email_template.${flow.template}`)}
        subtitle={t(`email_trigger.${flow.template}`)}
        actions={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge
              tone={enabled ? 'success' : 'warning'}
              label={t(enabled ? 'emails.state_on' : 'emails.state_off')}
            />
            <StatusBadge
              tone="neutral"
              dot={false}
              label={t(`email_audience.${flow.audience}`)}
            />
          </span>
        }
      />

      <div className="grid gap-5 @4xl/page:grid-cols-3">
        {/* The message */}
        <section className="flex flex-col gap-3 @4xl/page:col-span-2">
          <SectionTitle icon="doc">{t('emails.preview_title')}</SectionTitle>
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-line bg-sky-soft px-5 py-4">
              <p className="flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
                <span className="font-medium uppercase tracking-wide">
                  {t('emails.preview_to')}
                </span>
                {/* Sample recipient — the address is invented with the person. */}
                <span className="text-ink">{recipient}</span>
              </p>
              <p className="text-base font-semibold text-ink">
                {t(`email_preview.${flow.template}.subject`, values)}
              </p>
            </div>
            <div className="flex flex-col gap-4 px-5 py-6 text-sm leading-relaxed text-ink sm:px-7">
              <p>{t(`email_preview.${flow.template}.p1`, values)}</p>
              <p>{t(`email_preview.${flow.template}.p2`, values)}</p>
              {/* The template's call to action, drawn as it lands in the
                  inbox — a real button here would invite a click that sends
                  nobody anywhere. */}
              <span className="mt-1 self-start rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white">
                {t(`email_preview.${flow.template}.cta`, values)}
              </span>
            </div>
          </Card>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <BoIcon name="alert" size={14} className="mt-0.5 shrink-0" />
            {t('emails.preview_note')}
          </p>
          <p className="text-xs text-muted-foreground">
            {`${t('emails.version', { version: flow.version })} · ${t('emails.updated', {
              date: formatDate(flow.updatedAt, locale),
            })}`}
          </p>
        </section>

        {/* What you can do to it */}
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <SectionTitle icon="settings">{t('emails.state_title')}</SectionTitle>
            <Card className="p-4">
              <Toggle
                checked={enabled}
                onChange={toggle}
                label={t('emails.state_label')}
                hint={t(enabled ? 'emails.state_hint_on' : 'emails.state_hint_off')}
              />
            </Card>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <BoIcon name="shield" size={14} className="mt-0.5 shrink-0" />
              {t('emails.audit_notice')}
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <SectionTitle icon="trend-up">
              {t('emails.metrics_title', { days: windowDays })}
            </SectionTitle>
            <AutoGrid min="8rem" gap="gap-2" as="dl">
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
                provider refuses anything off the allowlist (CLAUDE.md §6), so a
                proof that never arrives is the rule working. */}
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
      </div>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
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
