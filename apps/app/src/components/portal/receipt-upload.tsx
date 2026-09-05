'use client'

import { useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { PaymentRail } from '@/lib/portal/types'
import { paymentMethodLabel } from '@/lib/payment-method'
import { formatFileSize, formatMoney, type Locale } from '@/lib/format'
import { Icon } from './icons'

/**
 * The one receipt form of the portal — the monthly module, every paid
 * procedure and the continuation reservation all climb the same ladder as the
 * enrollment receipt (CLAUDE.md §1: "mesma escada de OCR"), so they share one
 * form.
 *
 * The amount is display-only: it is the price in force and there are no
 * discounts, ever (CLAUDE.md §1) — a field somebody can type into is a field
 * somebody can undercharge from. In production the file goes straight to
 * storage on a signed URL (CLAUDE.md §5); in this mockup it stays in the
 * browser and `onSubmit` just tells the caller to show the submitted state.
 */

/** Browser-side filter only — the real gate is magic bytes server-side (CLAUDE.md §8). */
const ACCEPTED = 'image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf'
const ACCEPTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
])

/** Mock ceiling — in production this comes from backoffice settings. */
const MAX_RECEIPT_BYTES = 10_000_000

const RAILS: PaymentRail[] = ['yape', 'plin', 'bcp', 'interbank']

export interface ReceiptSubmission {
  method: PaymentRail
  operationNumber: string
  fileName: string
}

export function ReceiptUploadForm({
  amountCents,
  currency,
  submitLabel,
  onSubmit,
}: {
  amountCents: number
  currency: string
  submitLabel: string
  onSubmit: (submission: ReceiptSubmission) => void
}) {
  const t = useTranslations('portal')
  const locale = useLocale() as Locale
  const fileInput = useRef<HTMLInputElement>(null)

  const [method, setMethod] = useState<PaymentRail | null>(null)
  const [operationNumber, setOperationNumber] = useState('')
  const [file, setFile] = useState<{ name: string; sizeBytes: number } | null>(null)
  const [fileError, setFileError] = useState<'type' | 'size' | null>(null)
  const [touched, setTouched] = useState(false)

  const missingMethod = method === null
  const missingOperation = operationNumber.trim() === ''
  const missingFile = file === null
  const ready = !missingMethod && !missingOperation && !missingFile

  function pickFile(picked: File | null) {
    if (!picked) return
    if (!ACCEPTED_TYPES.has(picked.type)) {
      setFileError('type')
      return
    }
    if (picked.size > MAX_RECEIPT_BYTES) {
      setFileError('size')
      return
    }
    setFileError(null)
    setFile({ name: picked.name, sizeBytes: picked.size })
  }

  function dropFile() {
    if (fileInput.current) fileInput.current.value = ''
    setFile(null)
  }

  function submit() {
    setTouched(true)
    if (!ready || method === null || file === null) return
    onSubmit({ method, operationNumber: operationNumber.trim(), fileName: file.name })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Amount — read-only by design. */}
      <div className="rounded-xl border-l-4 border-brand-yellow bg-sky px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-blue-deep">
          {t('receipt_form.amount_label')}
        </p>
        <p className="text-2xl font-bold tracking-tight text-ink">
          {formatMoney(amountCents, currency, locale)}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t('receipt_form.amount_hint')}
        </p>
      </div>

      {/* Rail */}
      <div>
        <p className="mb-2 text-sm font-semibold text-ink">
          {t('receipt_form.method_label')}
        </p>
        <div className="flex flex-wrap gap-2">
          {RAILS.map((rail) => (
            <button
              key={rail}
              type="button"
              onClick={() => setMethod(rail)}
              aria-pressed={method === rail}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                method === rail
                  ? 'border-brand-blue bg-brand-blue text-white'
                  : 'border-line bg-white text-muted-foreground hover:border-brand-blue hover:text-brand-blue'
              }`}
            >
              {paymentMethodLabel[rail]}
            </button>
          ))}
        </div>
        {touched && missingMethod && (
          <FieldError>{t('receipt_form.error_method')}</FieldError>
        )}
      </div>

      {/* Operation number + file */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="portal-operation-number"
            className="mb-1.5 block text-sm font-semibold text-ink"
          >
            {t('receipt_form.operation_label')}
          </label>
          <input
            id="portal-operation-number"
            value={operationNumber}
            onChange={(e) => setOperationNumber(e.target.value)}
            inputMode="numeric"
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand-blue ${
              touched && missingOperation ? 'border-red-400' : 'border-line'
            }`}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {t('receipt_form.operation_hint')}
          </p>
          {touched && missingOperation && (
            <FieldError>{t('receipt_form.error_operation')}</FieldError>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-sm font-semibold text-ink">
            {t('receipt_form.file_label')}
          </p>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED}
            className="sr-only"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-600/25 bg-emerald-50 px-3 py-2.5">
              <Icon name="doc" size={18} className="shrink-0 text-emerald-700" />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-semibold text-emerald-900">
                  {file.name}
                </span>
                <span className="text-xs text-emerald-800">
                  {formatFileSize(file.sizeBytes, locale)}
                </span>
              </span>
              <button
                type="button"
                onClick={dropFile}
                aria-label={t('receipt_form.remove')}
                className="ml-auto shrink-0 rounded-lg p-1.5 text-red-600 transition hover:bg-red-100"
              >
                <Icon name="trash" size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-3 text-sm font-semibold transition ${
                fileError || (touched && missingFile)
                  ? 'border-red-400 bg-red-50 text-red-700'
                  : 'border-line bg-sky-soft text-brand-blue hover:border-brand-blue hover:bg-sky'
              }`}
            >
              <Icon name="upload" size={16} />
              {t('receipt_form.attach')}
            </button>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {t('receipt_form.file_hint', {
              size: formatFileSize(MAX_RECEIPT_BYTES, locale),
            })}
          </p>
          {fileError && (
            <FieldError>{t(`receipt_form.error_${fileError}`)}</FieldError>
          )}
          {!fileError && touched && missingFile && (
            <FieldError>{t('receipt_form.error_file')}</FieldError>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={submit}
        className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-brand-blue px-5 py-2.5 text-sm font-bold text-white shadow-card transition hover:bg-brand-yellow hover:text-ink"
      >
        <Icon name="upload" size={16} />
        {submitLabel}
      </button>
    </div>
  )
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600">
      <Icon name="alert" size={14} />
      {children}
    </p>
  )
}
