'use client'

import { useMemo, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { CheckoutDraft, PublicCatalog } from '@/lib/enrollment/types'
import { hasErrors, planOfCourse, validatePayment } from '@/lib/enrollment/checkout'
import { formatFileSize, formatMoney, type Locale } from '@/lib/format'
import { paymentMethodLabel } from '@/lib/payment-method'
import {
  Card,
  ChoiceCard,
  FieldGroup,
  GhostButton,
  Note,
  PrimaryButton,
  StepHeading,
  TextInput,
} from '@/components/enrollment/ui'
import { CheckoutIcon } from '@/components/enrollment/icons'
import { QrPlaceholder } from '@/components/enrollment/qr-placeholder'
import { AutoGrid } from '@/components/layout/auto-grid'

/**
 * What the browser will hand up. The real gate is magic bytes on the server
 * (`CLAUDE.md` §8) — an `accept` attribute is a file-picker filter, not a
 * check. HEIC is here because half the receipts arrive from an iPhone.
 */
const ACCEPTED = 'image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf'
const ACCEPTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
])

/**
 * Step 3 — pay outside, prove it inside.
 *
 * There is no payment gateway in the platform (`CLAUDE.md` §2), and that is the
 * whole shape of this screen: it shows where to send the money, then receives
 * the proof. The reader leaves for their banking app in the middle of it, which
 * is exactly why the seat is already held (`docs/MATRICULA-CHECKOUT.md` §3) and
 * why the draft survives a reload.
 *
 * **The receipt is mandatory and blocks the step.** Without the image there is
 * nothing for the OCR ladder to read (`CLAUDE.md` §5), and the enrollment
 * becomes a row nobody can ever settle. A warning would not do — the whole
 * point of this platform over a Google Form is that the proof arrives with the
 * data, not three WhatsApp messages later.
 *
 * In production the file goes straight to storage on a signed URL and never
 * passes through our function (`CLAUDE.md` §5). Here it stays in the browser.
 */
export function StepPayment({
  catalog,
  draft,
  setDraft,
  onBack,
  onContinue,
}: {
  catalog: PublicCatalog
  draft: CheckoutDraft
  setDraft: (next: (prev: CheckoutDraft) => CheckoutDraft) => void
  onBack: () => void
  onContinue: () => void
}) {
  const t = useTranslations('enrollment')
  const locale = useLocale() as Locale
  const fileInput = useRef<HTMLInputElement>(null)
  const [touched, setTouched] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const plan = planOfCourse(catalog, draft.course.courseId)
  const errors = useMemo(() => validatePayment(draft.payment), [draft.payment])
  const ready = !hasErrors(errors)
  const show = touched
  const err = (key: string | undefined) => (show && key ? t(`error.${key}`) : undefined)

  const account =
    catalog.accounts.find((item) => item.method === draft.payment.method) ?? null

  async function copy(value: string, tag: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(tag)
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      // A browser that refuses the clipboard still shows the number on screen;
      // the reader types it. Never a blocking failure.
    }
  }

  function pickFile(file: File | null) {
    if (!file) return
    if (!ACCEPTED_TYPES.has(file.type)) {
      setFileError('receipt_type')
      return
    }
    if (file.size > catalog.settings.maxReceiptBytes) {
      setFileError('receipt_size')
      return
    }
    setFileError(null)
    setDraft((prev) => ({
      ...prev,
      payment: {
        ...prev.payment,
        receipt: {
          fileName: file.name,
          sizeBytes: file.size,
          previewUrl: file.type === 'application/pdf' ? null : URL.createObjectURL(file),
        },
      },
    }))
  }

  function dropReceipt() {
    if (draft.payment.receipt?.previewUrl) {
      URL.revokeObjectURL(draft.payment.receipt.previewUrl)
    }
    if (fileInput.current) fileInput.current.value = ''
    setDraft((prev) => ({ ...prev, payment: { ...prev.payment, receipt: null } }))
  }

  function submit() {
    setTouched(true)
    if (ready) onContinue()
  }

  return (
    <div className="flex flex-col gap-5">
      <StepHeading
        title={t('step.payment.title')}
        subtitle={t('step.payment.subtitle')}
      />

      {/* The amount, before anything else. It is the plan price in force and it
          is read-only: there are no discounts, ever (`CLAUDE.md` §1), so a
          field somebody can type into is a field somebody can undercharge
          from. */}
      {plan && (
        <Card className="border-brand-blue/25 bg-sky p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue-deep">
            {t('step.payment.amount_label')}
          </p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-ink">
            {formatMoney(plan.amountCents, plan.currency, locale)}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t('step.payment.amount_hint')}
          </p>
        </Card>
      )}

      {/* Method */}
      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold text-ink">
          {t('step.payment.method_label')}
        </p>
        <AutoGrid min="14rem" gap="gap-3">
          {catalog.accounts.map((item) => (
            <ChoiceCard
              key={item.method}
              selected={draft.payment.method === item.method}
              onSelect={() =>
                setDraft((prev) => ({
                  ...prev,
                  payment: { ...prev.payment, method: item.method },
                }))
              }
              title={paymentMethodLabel[item.method]}
              meta={t(`step.payment.method_meta.${item.method}`)}
            />
          ))}
        </AutoGrid>
        {err(errors.method) && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600">
            <CheckoutIcon name="alert" size={14} />
            {err(errors.method)}
          </p>
        )}
      </Card>

      {/* Account details for the chosen rail */}
      {account && (
        <Card className="p-5">
          <p className="mb-3 text-sm font-semibold text-ink">
            {t('step.payment.account_label', {
              method: paymentMethodLabel[account.method],
            })}
          </p>
          <div className="flex flex-col gap-3 @md/checkout:flex-row @md/checkout:items-start">
            {/* Scanning is the fast path on a phone; the number below it is
                the fallback for somebody typing on a laptop. */}
            {account.hasQr && (
              <QrPlaceholder label={t('step.payment.qr_example')} />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
            <CopyRow
              label={t('step.payment.holder')}
              value={account.holder}
              copyable={false}
              copiedLabel={t('action.copied')}
              copyLabel={t('action.copy')}
              copied={false}
              onCopy={() => undefined}
            />
            <CopyRow
              label={t(`step.payment.number_label.${account.method}`)}
              value={account.number}
              copiedLabel={t('action.copied')}
              copyLabel={t('action.copy')}
              copied={copied === 'number'}
              onCopy={() => void copy(account.number, 'number')}
            />
            {account.interbankCode && (
              <CopyRow
                label={t('step.payment.interbank_code')}
                value={account.interbankCode}
                copiedLabel={t('action.copied')}
                copyLabel={t('action.copy')}
                copied={copied === 'cci'}
                onCopy={() => void copy(account.interbankCode ?? '', 'cci')}
              />
            )}
            </div>
          </div>
          <Note tone="warning">{t('step.payment.exact_amount_warning')}</Note>
        </Card>
      )}

      {/* Proof */}
      <Card className="p-5">
        <p className="mb-1 text-sm font-semibold text-ink">
          {t('step.payment.proof_label')}
        </p>
        <p className="mb-4 text-xs text-muted-foreground">
          {t('step.payment.proof_hint')}
        </p>

        <AutoGrid min="15rem" gap="gap-4">
          <FieldGroup
            label={t('field.operation_number')}
            htmlFor="operation-number"
            error={err(errors.operationNumber)}
            hint={t('step.payment.operation_hint')}
          >
            <TextInput
              id="operation-number"
              value={draft.payment.operationNumber}
              invalid={Boolean(err(errors.operationNumber))}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  payment: { ...prev.payment, operationNumber: e.target.value },
                }))
              }
            />
          </FieldGroup>

          <FieldGroup
            label={t('field.receipt')}
            error={
              (fileError ? t(`error.${fileError}`) : undefined) ?? err(errors.receipt)
            }
            hint={t('step.payment.receipt_hint', {
              size: formatFileSize(catalog.settings.maxReceiptBytes, locale),
            })}
          >
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPTED}
              className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            {draft.payment.receipt ? (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-600/25 bg-emerald-50 px-3 py-2.5">
                <CheckoutIcon
                  name="file"
                  size={18}
                  className="shrink-0 text-emerald-700"
                />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-semibold text-emerald-900">
                    {draft.payment.receipt.fileName}
                  </span>
                  <span className="text-xs text-emerald-800">
                    {formatFileSize(draft.payment.receipt.sizeBytes, locale)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={dropReceipt}
                  aria-label={t('action.remove_receipt')}
                  className="ml-auto shrink-0 rounded-lg p-1.5 text-emerald-800 transition hover:bg-emerald-100"
                >
                  <CheckoutIcon name="trash" size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className={`flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm font-semibold transition ${
                  err(errors.receipt) || fileError
                    ? 'border-red-400 bg-red-50 text-red-700'
                    : 'border-line bg-sky-soft text-brand-blue hover:border-brand-blue hover:bg-sky'
                }`}
              >
                <CheckoutIcon name="upload" size={16} />
                {t('action.attach_receipt')}
              </button>
            )}
          </FieldGroup>
        </AutoGrid>

        {draft.payment.receipt?.previewUrl && (
          /* eslint-disable-next-line @next/next/no-img-element --
             a blob: URL from the reader's own disk, never a remote asset:
             next/image would try to optimize a file that exists only in this
             tab. */
          <img
            src={draft.payment.receipt.previewUrl}
            alt={t('step.payment.receipt_preview_alt')}
            className="mt-4 max-h-72 w-auto rounded-xl border border-line object-contain"
          />
        )}
      </Card>

      {show && !ready && <Note tone="danger">{t('error.fix_fields')}</Note>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <GhostButton onClick={onBack}>
          <CheckoutIcon name="arrow-left" size={16} />
          {t('action.back')}
        </GhostButton>
        <PrimaryButton onClick={submit}>
          {t('action.continue')}
          <CheckoutIcon name="arrow-right" size={16} />
        </PrimaryButton>
      </div>
    </div>
  )
}

/** One account line: the value big enough to read out loud, plus a copy button. */
function CopyRow({
  label,
  value,
  copyable = true,
  copied,
  copyLabel,
  copiedLabel,
  onCopy,
}: {
  label: string
  value: string
  copyable?: boolean
  copied: boolean
  copyLabel: string
  copiedLabel: string
  onCopy: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-sky-soft px-3 py-2.5">
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="truncate font-mono text-sm font-semibold text-ink">
          {value}
        </span>
      </span>
      {copyable && (
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-brand-blue transition hover:border-brand-blue"
        >
          <CheckoutIcon name={copied ? 'check' : 'copy'} size={14} />
          {copied ? copiedLabel : copyLabel}
        </button>
      )}
    </div>
  )
}
