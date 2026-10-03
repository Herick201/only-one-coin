'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type {
  PaymentReviewItem,
  ReadField,
  ReceiptReading,
  RejectionReason,
  ReviewDecision,
} from '@/lib/backoffice/types'
import { fetchReceiptUrl } from '@/lib/backoffice/payment-client'
import { formatDate, formatDateTime, formatMoney, type Locale } from '@/lib/format'
import { formatPaymentMethod } from '@/lib/payment-method'
import { SectionTitle, StatusBadge } from '@/components/backoffice/ui'
import { paymentTone, receiptStateTone } from '@/components/backoffice/status-tone'
import { BoIcon } from '@/components/backoffice/icons'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/** Offered in the order a reviewer usually meets them. */
const REASONS: RejectionReason[] = [
  'amount_mismatch',
  'illegible',
  'duplicate',
  'not_a_receipt',
  'other',
]

/** Mirrors the API's cap on the rejection note. */
const NOTE_MAX_LENGTH = 500

/** Under a day left on the review window, the deadline turns red. */
const DEADLINE_WARNING_MS = 24 * 60 * 60 * 1000

/** How close a payment is to overstaying its review window. */
export function deadlineState(
  reviewDeadline: string,
  renderedAt: number,
): 'ok' | 'soon' | 'overdue' {
  const left = new Date(reviewDeadline).getTime() - renderedAt
  if (left <= 0) return 'overdue'
  return left < DEADLINE_WARNING_MS ? 'soon' : 'ok'
}

/**
 * Why a decision did not go through although nothing failed: the case changed
 * under the reader. Said in the dialog, never as a success toast.
 */
export type CaseNotice = 'already_settled' | 'not_found' | 'seat_released'

/**
 * What the dialog hears back from a decision. `done` means the queue already
 * closed it; `notice` keeps it open with an amber note on what changed;
 * `error` keeps it open with a retryable failure.
 */
export type DecideOutcome =
  | { kind: 'done' }
  | { kind: 'notice'; notice: CaseNotice }
  | { kind: 'error' }

/** Where the receipt image stands while the dialog is open. */
type ImageState =
  | { kind: 'loading' }
  | { kind: 'shown'; url: string }
  | { kind: 'unavailable' }

/**
 * Where a payment is actually settled: the receipt image, what the student
 * declared, the frozen price it is checked against and what the antifraud
 * screening found. This is the one place a payment changes state — the
 * student file stays read-only, because approving is a usecase with its own
 * audit entry, not a click on a profile (CLAUDE.md §8).
 *
 * The image comes through a short-lived signed URL, asked for only when the
 * dialog opens on a receipt that is ready: every request for it is an audited
 * read on the server, so the list never prefetches it.
 *
 * A centred modal, the same shape the ledger opens a payment with: the queue
 * stays behind it, and the case gets the middle of the screen.
 */
export function ReceiptReviewDialog({
  payment,
  renderedAt,
  onClose,
  onDecide,
}: {
  payment: PaymentReviewItem | null
  /** When the server rendered the queue — what the deadline is measured from. */
  renderedAt: number
  onClose: () => void
  /** Resolves once the API answered; the dialog stays disabled until then. */
  onDecide: (paymentId: string, decision: ReviewDecision) => Promise<DecideOutcome>
}) {
  const t = useTranslations('bo')
  const locale = useLocale() as Locale

  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState<RejectionReason>('amount_mismatch')
  const [note, setNote] = useState('')
  /** Keyed by the payment it belongs to, so a new case never shows the last one's image. */
  const [loaded, setLoaded] = useState<{ id: string; state: ImageState } | null>(null)
  const [failed, setFailed] = useState(false)
  const [notice, setNotice] = useState<CaseNotice | null>(null)

  /**
   * Double-click guard. The state drives the disabled buttons; the ref is what
   * actually stops a second click landing before React re-rendered them.
   */
  const [sending, setSending] = useState(false)
  const inFlight = useRef(false)

  const paymentId = payment?.id ?? null
  const receiptReady = payment?.receipt === 'ready'
  const image: ImageState =
    loaded && loaded.id === paymentId ? loaded.state : { kind: 'loading' }

  // The form follows whichever payment the dialog was opened on, and is thrown
  // away on close — a half-written rejection must not leak into the next case.
  useEffect(() => {
    setRejecting(false)
    setReason(payment?.fraudSignals.includes('identical_file') ? 'duplicate' : 'amount_mismatch')
    setNote('')
    setFailed(false)
    setNotice(null)
    // Only a new case resets the form; a re-render of the same one does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId])

  // The signed URL is asked for once per opened case, and only when there is
  // an image to show. A late answer for a case already closed is dropped.
  useEffect(() => {
    if (!paymentId || !receiptReady) return
    let current = true
    void fetchReceiptUrl(paymentId).then((result) => {
      if (!current) return
      setLoaded({
        id: paymentId,
        state: result.ok ? { kind: 'shown', url: result.data.url } : { kind: 'unavailable' },
      })
    })
    return () => {
      current = false
    }
  }, [paymentId, receiptReady])

  async function send(decision: ReviewDecision) {
    if (!payment || inFlight.current) return
    inFlight.current = true
    setSending(true)
    setFailed(false)
    try {
      const outcome = await onDecide(payment.id, decision)
      if (outcome.kind === 'notice') setNotice(outcome.notice)
      if (outcome.kind === 'error') setFailed(true)
    } finally {
      inFlight.current = false
      setSending(false)
    }
  }

  /**
   * Decided elsewhere or gone: nothing left to decide here. A released seat
   * only blocks approving — rejecting is still how the case gets closed.
   */
  const closed = notice === 'already_settled' || notice === 'not_found'
  const approveBlocked = sending || notice !== null
  const rejectBlocked = sending || closed

  const deadline = payment ? deadlineState(payment.reviewDeadline, renderedAt) : 'ok'

  return (
    <Dialog
      open={payment !== null}
      onOpenChange={(open) => {
        if (!open && !inFlight.current) onClose()
      }}
    >
      <DialogContent
        closeLabel={t('receipt_review.close')}
        className="bg-white sm:max-w-xl"
      >
        {payment && (
          <>
            <DialogHeader className="gap-2 border-b border-line p-5 pr-14">
              <DialogTitle className="text-base font-semibold text-ink">
                {payment.studentName}
              </DialogTitle>
              <DialogDescription>
                {t('receipt_review.subtitle', {
                  date: formatDateTime(payment.submittedAt, locale),
                  course: `${payment.courseName} · ${payment.classGroupName}`,
                })}
              </DialogDescription>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <StatusBadge
                  tone={paymentTone[payment.status]}
                  label={t(`payment_status.${payment.status}`)}
                />
                <StatusBadge
                  tone={receiptStateTone[payment.receipt]}
                  label={t(`receipt_state.${payment.receipt}`)}
                />
              </div>
            </DialogHeader>

            <div className="flex flex-col gap-6 p-5">
              <section>
                <SectionTitle icon="doc">{t('receipt_review.image_title')}</SectionTitle>
                {payment.receipt === 'missing' ? (
                  // No image at all: the only proof left is the bank statement,
                  // and the reviewer is told so before the approve button.
                  <ReceiptWarning text={t('receipt_review.no_receipt_warning')} />
                ) : payment.receipt === 'ready' && image.kind === 'shown' ? (
                  // A signed, five-minute URL straight from the bucket:
                  // `next/image` would proxy and cache a link that is meant to
                  // expire, so a plain <img> it is. The bucket origin is
                  // allowed in the CSP `img-src` (RECEIPT_IMAGE_ORIGIN).
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image.url}
                    alt={t('receipt_review.image_alt')}
                    onError={() => setLoaded({ id: payment.id, state: { kind: 'unavailable' } })}
                    className="mt-3 max-h-[28rem] w-full rounded-xl border border-line bg-sky-soft object-contain"
                  />
                ) : (
                  <ImagePlaceholder
                    busy={payment.receipt === 'ready' && image.kind === 'loading'}
                    text={
                      payment.receipt === 'ready'
                        ? image.kind === 'unavailable'
                          ? t('receipt_review.image_unavailable')
                          : null
                        : t(`receipt_state.${payment.receipt}`)
                    }
                  />
                )}
                {/* No usable image either way, so the same kind of warning as
                    a missing receipt — it warns, it never blocks approving
                    (a deposit on the bank statement is proof enough). Still
                    uploading also means the antifraud screening has not run:
                    its signals may arrive after the decision. */}
                {payment.receipt === 'refused' && (
                  <ReceiptWarning text={t('receipt_review.refused_receipt_warning')} />
                )}
                {payment.receipt === 'uploading' && (
                  <ReceiptWarning text={t('receipt_review.uploading_receipt_warning')} />
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {t('receipt_review.image_note')}
                </p>
              </section>

              {/* What the student said they paid with, against the price frozen
                  when the enrollment was opened. There is no discount: the
                  expected amount is the plan price, always (CLAUDE.md §1). */}
              <section>
                <SectionTitle icon="payments">{t('receipt_review.declared_title')}</SectionTitle>
                <dl className="mt-2">
                  <DataRow
                    label={t('payments.filter_method')}
                    value={formatPaymentMethod(
                      payment.method,
                      payment.methodDetail,
                      t('payment_method.other'),
                    )}
                  />
                  <DataRow
                    label={t('payments.col_operation')}
                    value={payment.operationNumber ?? t('payments.no_operation')}
                  />
                  <DataRow
                    label={t('receipt_review.check_expected')}
                    value={formatMoney(payment.expectedAmountCents, payment.currency, locale)}
                    strong
                  />
                  <DataRow
                    label={t('review.col_deadline')}
                    value={
                      deadline === 'overdue'
                        ? `${formatDateTime(payment.reviewDeadline, locale)} · ${t('review.deadline_overdue')}`
                        : formatDateTime(payment.reviewDeadline, locale)
                    }
                    danger={deadline !== 'ok'}
                  />
                </dl>
              </section>

              {payment.reading && <ReadingSection reading={payment.reading} />}

              <section>
                <SectionTitle icon="shield">{t('receipt_review.signals_title')}</SectionTitle>
                {payment.fraudSignals.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('receipt_review.signals_none')}
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {payment.fraudSignals.map((signal) => (
                      <li
                        key={signal}
                        className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
                      >
                        <BoIcon name="alert" size={14} className="mt-0.5 shrink-0" />
                        {t(`fraud_signal.${signal}`)}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Decision */}
              <section className="border-t border-line pt-5">
                {rejecting ? (
                  <div className="flex flex-col gap-3">
                    <SectionTitle icon="close">{t('receipt_review.reject_title')}</SectionTitle>
                    <div className="flex flex-col gap-1.5">
                      {REASONS.map((value) => (
                        <label
                          key={value}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                            reason === value
                              ? 'border-brand-blue bg-sky text-ink'
                              : 'border-line text-muted-foreground hover:text-ink'
                          }`}
                        >
                          <input
                            type="radio"
                            name="rejection-reason"
                            value={value}
                            checked={reason === value}
                            onChange={() => setReason(value)}
                            disabled={rejectBlocked}
                            className="accent-brand-blue"
                          />
                          {t(`rejection_reason.${value}`)}
                        </label>
                      ))}
                    </div>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t('receipt_review.reject_note_label')}
                      </span>
                      <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        rows={3}
                        maxLength={NOTE_MAX_LENGTH}
                        disabled={rejectBlocked}
                        placeholder={t('receipt_review.reject_note_placeholder')}
                        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted-foreground focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                      />
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={rejectBlocked}
                        aria-busy={sending}
                        onClick={() => void send({ kind: 'reject', reason, note: note.trim() })}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <BoIcon name="close" size={16} />
                        {t('receipt_review.reject_confirm')}
                      </button>
                      <button
                        type="button"
                        disabled={sending}
                        onClick={() => setRejecting(false)}
                        className="rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-muted-foreground transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {t('receipt_review.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={approveBlocked}
                      aria-busy={sending}
                      onClick={() => void send({ kind: 'approve' })}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-yellow hover:text-ink active:bg-brand-yellow-deep disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <BoIcon name="check" size={16} />
                      {t('receipt_review.approve')}
                    </button>
                    <button
                      type="button"
                      disabled={rejectBlocked}
                      onClick={() => setRejecting(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-muted-foreground transition hover:border-red-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <BoIcon name="close" size={16} />
                      {t('receipt_review.reject')}
                    </button>
                  </div>
                )}
                {notice && (
                  <p
                    role="status"
                    className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
                  >
                    <BoIcon name="alert" size={14} className="mt-0.5 shrink-0" />
                    {t(`receipt_review.notice_${notice}`)}
                  </p>
                )}
                {failed && (
                  <p role="alert" className="mt-3 text-xs font-semibold text-red-600">
                    {t('receipt_review.decide_error')}
                  </p>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  {t('receipt_review.audit_notice')}
                </p>
              </section>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * What OCR level 1 read off the receipt (OOC-20), field by field, with the
 * model's own confidence. Guidance next to the image, never a verdict: no
 * colour says right or wrong, because comparing the reading with the price
 * and choosing a confidence threshold are the validation step's (ROADMAP
 * Sessão 27), measured on real receipts first (docs/OCR-AVALIACAO.md). The
 * model id stays off screen — it is a technical id (CLAUDE.md §4) and lives
 * in the database for audit.
 */
function ReadingSection({ reading }: { reading: ReceiptReading }) {
  const t = useTranslations('bo')
  const locale = useLocale() as Locale

  if (reading.state === 'not_read') {
    return (
      <section>
        <SectionTitle icon="doc">{t('receipt_review.reading_title')}</SectionTitle>
        <p className="mt-2 text-sm text-muted-foreground">{t('receipt_review.reading_not_read')}</p>
      </section>
    )
  }

  if (reading.state === 'failed') {
    return (
      <section>
        <SectionTitle icon="doc">{t('receipt_review.reading_title')}</SectionTitle>
        <ReceiptWarning
          text={t('receipt_review.reading_failed', {
            reason: t(`receipt_review.reading_failure_${reading.reason}`),
          })}
        />
      </section>
    )
  }

  const notFound = t('receipt_review.reading_not_found')
  const rows: { key: string; label: string; field: ReadField<unknown>; text: string }[] = [
    {
      key: 'amount',
      label: t('receipt_review.reading_field_amount'),
      field: reading.amountCents,
      text: reading.amountCents.value === null ? notFound : formatMoney(reading.amountCents.value, 'PEN', locale),
    },
    {
      key: 'operation',
      label: t('receipt_review.reading_field_operation'),
      field: reading.operationNumber,
      text: reading.operationNumber.value ?? notFound,
    },
    {
      key: 'method',
      label: t('receipt_review.reading_field_method'),
      field: reading.paymentMethod,
      text:
        reading.paymentMethod.value === null
          ? notFound
          : formatPaymentMethod(reading.paymentMethod.value, reading.paymentMethod.detail, t('payment_method.other')),
    },
    {
      key: 'payer',
      label: t('receipt_review.reading_field_payer'),
      field: reading.payerName,
      text: reading.payerName.value ?? notFound,
    },
    {
      key: 'paid_at',
      label: t('receipt_review.reading_field_paid_at'),
      field: reading.paidAt,
      text:
        reading.paidAt.value === null
          ? notFound
          : reading.paidAt.value.length === 10
            ? formatDate(reading.paidAt.value, locale)
            : formatDateTime(reading.paidAt.value, locale),
    },
  ]

  return (
    <section>
      <SectionTitle icon="doc">{t('receipt_review.reading_title')}</SectionTitle>
      <p className="mt-2 text-xs text-muted-foreground">{t('receipt_review.reading_intro')}</p>
      <dl className="mt-2">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-start justify-between gap-4 border-b border-line/70 py-2.5 last:border-b-0"
          >
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{row.label}</dt>
            <dd className="text-right">
              <span
                className={`block text-sm tabular-nums ${
                  row.field.value === null ? 'text-muted-foreground' : 'font-medium text-ink'
                }`}
              >
                {row.text}
              </span>
              {row.field.value !== null && (
                <span className="block text-xs tabular-nums text-muted-foreground">
                  {t('receipt_review.reading_confidence', { value: Math.round(row.field.confidence * 100) })}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">
        {t('receipt_review.reading_read_at', { date: formatDateTime(reading.readAt, locale) })}
      </p>
    </section>
  )
}

/** An amber note on the receipt the reviewer is about to decide without. */
function ReceiptWarning({ text }: { text: string }) {
  return (
    <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      <BoIcon name="alert" size={14} className="mt-0.5 shrink-0" />
      {text}
    </p>
  )
}

/** Where the image would be: still loading, or a word on why it is not here. */
function ImagePlaceholder({ busy, text }: { busy: boolean; text: string | null }) {
  return (
    <div
      aria-busy={busy}
      className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-sky-soft px-6 py-10 text-center"
    >
      <span
        className={`grid h-11 w-11 place-items-center rounded-full bg-white text-brand-blue shadow-card ${
          busy ? 'animate-pulse' : ''
        }`}
      >
        <BoIcon name="doc" size={20} />
      </span>
      {text && <p className="max-w-xs text-xs text-muted-foreground">{text}</p>}
    </div>
  )
}

function DataRow({
  label,
  value,
  strong = false,
  danger = false,
}: {
  label: string
  value: string
  strong?: boolean
  danger?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/70 py-2.5 last:border-b-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`text-right text-sm tabular-nums ${
          danger ? 'font-semibold text-red-600' : strong ? 'font-semibold text-ink' : 'font-medium text-ink'
        }`}
      >
        {value}
      </dd>
    </div>
  )
}
