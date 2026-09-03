'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { RequestStatus, RequestType } from '@/lib/portal/types'
import { formatDate, formatMoney, type Locale } from '@/lib/format'
import { Card, EmptyState, SectionTitle, StatusBadge } from '@/components/portal/ui'
import { requestTone } from '@/components/portal/status-tone'
import { Icon, type IconName } from '@/components/portal/icons'
import { ReceiptUploadForm } from '@/components/portal/receipt-upload'
import { AutoGrid } from '@/components/layout/auto-grid'

/**
 * Trámites — every paid procedure the student can start from the portal
 * (docs/REGRAS-NEGOCIO.md §5). All of them follow the constancia pattern
 * (CLAUDE.md §1): a request with a payment attached — receipt, OCR ladder,
 * human queue — that only becomes a document / takes effect once the payment
 * is approved.
 *
 * Mockup: submitting appends the request locally with `under_review`.
 */

export interface EligibleEnrollment {
  enrollmentId: string
  courseName: string
}

export interface ProcedureView {
  type: RequestType
  priceCents: number
  currency: string
  eligible: EligibleEnrollment[]
}

export interface RequestView {
  id: string
  type: RequestType
  status: RequestStatus
  courseName: string
  createdAt: string
  priceCents: number
  currency: string
  resultUrl: string | null
}

const procedureIcon: Record<RequestType, IconName> = {
  enrollment_certificate: 'documents',
  certification_exam: 'star',
  makeup_exam: 'clipboard',
  enrollment_freeze: 'freeze',
}

export function RequestsView({
  procedures,
  initialRequests,
}: {
  procedures: ProcedureView[]
  initialRequests: RequestView[]
}) {
  const t = useTranslations('portal')
  const locale = useLocale() as Locale

  const [requests, setRequests] = useState<RequestView[]>(initialRequests)
  const [openType, setOpenType] = useState<RequestType | null>(null)
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null)
  const [justSubmitted, setJustSubmitted] = useState(false)

  const open = procedures.find((p) => p.type === openType) ?? null
  const chosen =
    open?.eligible.find((e) => e.enrollmentId === enrollmentId) ??
    (open?.eligible.length === 1 ? open.eligible[0] : null)

  function startProcedure(type: RequestType) {
    setOpenType(type)
    setEnrollmentId(null)
    setJustSubmitted(false)
  }

  function submit() {
    if (!open || !chosen) return
    setRequests((prev) => [
      {
        id: `req_local_${Date.now()}`,
        type: open.type,
        status: 'under_review',
        courseName: chosen.courseName,
        createdAt: new Date().toISOString(),
        priceCents: open.priceCents,
        currency: open.currency,
        resultUrl: null,
      },
      ...prev,
    ])
    setOpenType(null)
    setJustSubmitted(true)
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Catalog */}
      <section>
        <div className="mb-3">
          <SectionTitle>{t('requests.catalog_title')}</SectionTitle>
        </div>
        <AutoGrid min="16rem" gap="gap-4">
          {procedures.map((p) => {
            const active = openType === p.type
            return (
              <Card
                key={p.type}
                className={`flex flex-col gap-3 p-5 ${
                  active ? 'ring-2 ring-brand-blue' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky text-brand-blue">
                    <Icon name={procedureIcon[p.type]} size={20} />
                  </span>
                  <span className="rounded-full bg-sky px-2.5 py-1 text-xs font-bold text-brand-blue-deep">
                    {formatMoney(p.priceCents, p.currency, locale)}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-ink">
                    {t(`request_type.${p.type}`)}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(`requests.desc.${p.type}`)}
                  </p>
                </div>
                {p.eligible.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t('requests.not_eligible')}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => startProcedure(p.type)}
                    className="inline-flex items-center gap-1.5 self-start rounded-full border border-brand-blue px-4 py-2 text-sm font-semibold text-brand-blue transition hover:bg-brand-blue hover:text-white"
                  >
                    {t('requests.request_cta')}
                    <Icon name="chevron-right" size={15} />
                  </button>
                )}
              </Card>
            )
          })}
        </AutoGrid>
      </section>

      {/* New request flow */}
      {open && (
        <section>
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionTitle>
                {t('requests.new_title', {
                  procedure: t(`request_type.${open.type}`),
                })}
              </SectionTitle>
              <button
                type="button"
                onClick={() => setOpenType(null)}
                className="text-sm font-semibold text-muted-foreground transition hover:text-ink"
              >
                {t('requests.cancel')}
              </button>
            </div>

            {open.type === 'enrollment_freeze' && (
              <p className="mt-3 rounded-xl bg-sky-soft px-4 py-3 text-sm text-muted-foreground">
                {t('requests.freeze_note')}
              </p>
            )}

            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-ink">
                {t('requests.choose_enrollment')}
              </p>
              <div className="flex flex-wrap gap-2">
                {open.eligible.map((e) => {
                  const selected = chosen?.enrollmentId === e.enrollmentId
                  return (
                    <button
                      key={e.enrollmentId}
                      type="button"
                      onClick={() => setEnrollmentId(e.enrollmentId)}
                      aria-pressed={selected}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        selected
                          ? 'border-brand-blue bg-brand-blue text-white'
                          : 'border-line bg-white text-muted-foreground hover:border-brand-blue hover:text-brand-blue'
                      }`}
                    >
                      {e.courseName}
                    </button>
                  )
                })}
              </div>
            </div>

            {chosen && (
              <div className="mt-5 rounded-xl border border-line bg-sky-soft p-4">
                <ReceiptUploadForm
                  amountCents={open.priceCents}
                  currency={open.currency}
                  submitLabel={t('requests.submit')}
                  onSubmit={submit}
                />
              </div>
            )}
          </Card>
        </section>
      )}

      {justSubmitted && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-600/20 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-800">
          <span className="mt-0.5 shrink-0">
            <Icon name="check" size={18} />
          </span>
          <p>{t('requests.submitted_body')}</p>
        </div>
      )}

      {/* My requests */}
      <section>
        <div className="mb-3">
          <SectionTitle>{t('requests.my_title')}</SectionTitle>
        </div>
        {requests.length === 0 ? (
          <EmptyState
            title={t('requests.empty_title')}
            body={t('requests.empty_body')}
            icon={<Icon name="clipboard" size={24} />}
          />
        ) : (
          <Card>
            <ul className="divide-y divide-line">
              {requests.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      {t(`request_type.${r.type}`)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {r.courseName}
                      {' · '}
                      {t('requests.requested_on', {
                        date: formatDate(r.createdAt, locale),
                      })}
                      {' · '}
                      {formatMoney(r.priceCents, r.currency, locale)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {r.resultUrl && (
                      <a
                        href={r.resultUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue transition hover:text-brand-blue-deep"
                      >
                        <Icon name="download" size={15} />
                        {t('common.download')}
                      </a>
                    )}
                    <StatusBadge
                      tone={requestTone[r.status]}
                      label={t(`request_status.${r.status}`)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  )
}
