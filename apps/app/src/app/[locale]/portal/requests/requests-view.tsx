'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { RequestStatus, RequestType } from '@/lib/portal/types'
import { formatDate, formatMoney, type Locale } from '@/lib/format'
import { Card, EmptyState, SectionTitle, StatusBadge } from '@/components/portal/ui'
import { requestTone } from '@/components/portal/status-tone'
import { Icon, type IconName } from '@/components/portal/icons'
import { ReceiptUploadForm } from '@/components/portal/receipt-upload'

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
      {/* Catalog — one list, and the form opens right under the row that was
          clicked instead of somewhere further down the page. */}
      <section>
        <div className="mb-3">
          <SectionTitle>{t('requests.catalog_title')}</SectionTitle>
        </div>
        <Card>
          <ul className="divide-y divide-line">
            {procedures.map((p) => {
              const active = openType === p.type
              const eligible = p.eligible.length > 0
              return (
                <li key={p.type}>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky text-brand-blue">
                      <Icon name={procedureIcon[p.type]} size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">
                        {t(`request_type.${p.type}`)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {eligible
                          ? t(`requests.desc.${p.type}`)
                          : t('requests.not_eligible')}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-ink">
                      {formatMoney(p.priceCents, p.currency, locale)}
                    </span>
                    {eligible && (
                      <button
                        type="button"
                        onClick={() =>
                          active ? setOpenType(null) : startProcedure(p.type)
                        }
                        aria-expanded={active}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          active
                            ? 'border-line bg-white text-muted-foreground hover:text-ink'
                            : 'border-brand-blue text-brand-blue hover:border-brand-yellow hover:bg-brand-yellow hover:text-ink'
                        }`}
                      >
                        {active ? t('requests.cancel') : t('requests.request_cta')}
                        <Icon
                          name="chevron-right"
                          size={15}
                          className={`transition-transform ${active ? 'rotate-90' : ''}`}
                        />
                      </button>
                    )}
                  </div>

                  {/* Inline flow, right where the click happened. */}
                  {active && open && (
                    <div className="border-t border-line bg-sky-soft px-5 py-4">
                      {open.type === 'enrollment_freeze' && (
                        <p className="mb-4 rounded-xl bg-white px-4 py-3 text-sm text-muted-foreground">
                          {t('requests.freeze_note')}
                        </p>
                      )}

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

                      {chosen && (
                        <div className="mt-4 rounded-xl border border-line bg-white p-4">
                          <ReceiptUploadForm
                            amountCents={open.priceCents}
                            currency={open.currency}
                            submitLabel={t('requests.submit')}
                            onSubmit={submit}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
      </section>

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
