import type { ReactNode } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getPortalSession } from '@/lib/portal/mock-data'
import { getFeatureFlags } from '@/lib/feature-flags/server'
import { formatDateNumeric } from '@/lib/portal/format'
import type {
  Enrollment,
  EnrollmentStatus,
  Locale,
  PaymentStatus,
} from '@/lib/portal/types'
import { Card, EmptyState, PageHeader } from '@/components/portal/ui'
import { StatusTabs, type StatusTab } from '@/components/portal/status-tabs'
import { Icon } from '@/components/portal/icons'
import { AutoGrid } from '@/components/layout/auto-grid'

/**
 * Mi matrícula, one tab per enrollment state. Four enrollments stacked in one
 * scroll made the student hunt for the one that needs them; the state is the
 * first question they have, so it became the tabs rather than a badge repeated
 * on every card.
 *
 * Each card is a record read top to bottom — course, group, class days, billing
 * mode, enrollment code — and then its payments, the settled ones and the open
 * ones in the same list. Nothing else earns a line: the amount belongs to each
 * payment, and the plan name only repeats the billing mode.
 *
 * Colour is spent, not sprinkled: green everywhere makes the one red row
 * invisible, so only what asks something of the student is coloured.
 */

/** Tabs in this order; states with no enrollment never get a tab. */
const TAB_ORDER: EnrollmentStatus[] = [
  'active',
  'under_review',
  'frozen',
  'completed',
  'rejected',
]

/** Which payment states get a closing note, and how loud it is. An approved
 *  payment gets none: the tab the card is sitting in already said so. */
const noteFor: Partial<Record<PaymentStatus, { key: string; className: string }>> = {
  under_review: {
    key: 'enrollments.review_note',
    className: 'border-brand-yellow-deep/25 bg-brand-yellow/10 text-ink',
  },
  rejected: {
    key: 'enrollments.rejected_note',
    className: 'border-red-600/20 bg-red-50 text-red-800',
  },
}

/**
 * Label over value, not label beside value: a fixed label column leaves a wide
 * empty gutter and drags a rule across the whole card for every field.
 */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-ink">{children}</dd>
    </div>
  )
}

export default async function EnrollmentPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = raw as Locale
  setRequestLocale(raw)
  const t = await getTranslations('portal')

  const flags = await getFeatureFlags()
  const { enrollments } = getPortalSession()

  function card(e: Enrollment) {
    const note = noteFor[e.payment.status]

    // Days that share a time are one entry: "Seg · Qua 18:00–19:30".
    const slots: { time: string; days: string[] }[] = []
    for (const s of e.classGroup.schedule) {
      const time = `${s.startTime}–${s.endTime}`
      const day = t(`weekday_short.${s.weekday}`)
      const found = slots.find((slot) => slot.time === time)
      if (found) found.days.push(day)
      else slots.push({ time, days: [day] })
    }
    const days = slots
      .map((slot) => `${slot.days.join(' · ')} ${slot.time}`)
      .join(' · ')

    /**
     * Every payment of this enrollment in one list: the package as a single
     * row, or one row per module on the monthly rail. The list answers one
     * question — what is settled and what still needs the student — so the
     * amounts and dates stay on the Pagamentos screen, which is where paying
     * actually happens.
     */
    const payments =
      e.monthly !== null
        ? e.monthly.payments.map((mp) => ({
            key: mp.moduleId,
            label: t('module_label', {
              n: e.modules.find((m) => m.id === mp.moduleId)?.sequence ?? 0,
            }),
            payment: mp.payment,
          }))
        : [
            {
              key: e.payment.id,
              label: t(`billing_mode.${e.billingMode}`),
              payment: e.payment,
            },
          ]

    return (
      <Card key={e.id} as="li" className="p-5 sm:p-6">
        {/* Course and group are the card's identity, so they read as a title,
            not as two cells of a grid — the same words at the same size as the
            enrollment code is what made this look like a database dump. */}
        <header className="flex items-center gap-3 border-b border-line pb-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-sky text-brand-blue">
            <Icon name="courses" size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              {e.course.name}
            </h2>
            <p className="text-sm text-muted-foreground">{e.classGroup.name}</p>
          </div>
        </header>

        <AutoGrid as="dl" min="11rem" gap="gap-x-6 gap-y-4" className="mt-4">
          <Row label={t('enrollments.days_label')}>{days}</Row>
          <Row label={t('enrollments.billing_label')}>
            {t(`billing_mode.${e.billingMode}`)}
          </Row>
          <Row label={t('enrollments.code_label')}>
            <span className="font-mono text-xs">{e.code}</span>
          </Row>
        </AutoGrid>

        {/* No box around this one: a bordered panel inside a bordered card is
            two frames for one thing. A heading and a rule are enough. */}
        <div className="mt-6">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t('enrollments.payments_title')}
          </p>
          <ul className="mt-1 divide-y divide-line border-t border-line">
            {payments.map((row) => {
              // Two states, not four: paid, or waiting for the student. The
              // one in between — receipt sent, OCR still deciding — keeps its
              // own word, because telling that student to pay would have them
              // pay twice.
              const settled = row.payment?.status === 'approved'
              const reviewing = row.payment?.status === 'under_review'
              return (
                <li
                  key={row.key}
                  className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3 text-sm"
                >
                  <span className="font-medium text-ink">{row.label}</span>
                  {settled || reviewing ? (
                    <span className="flex items-center gap-4">
                      <span
                        className={`flex items-center gap-2 ${
                          settled
                            ? 'text-muted-foreground'
                            : 'font-medium text-brand-yellow-deep'
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            settled ? 'bg-emerald-500' : 'bg-brand-yellow-deep'
                          }`}
                        />
                        {settled
                          ? t('enrollments.state_paid')
                          : t('payment_status.under_review')}
                      </span>
                      {/* The receipt the student sent, theirs to open again. In
                          production the href is a signed URL of 5 min scoped to
                          the student, minted on click (CLAUDE.md §8). */}
                      {row.payment?.receiptUrl && (
                        <a
                          href={row.payment.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue transition hover:text-brand-blue-deep"
                        >
                          <Icon name="doc" size={14} />
                          {t('enrollments.view_receipt')}
                        </a>
                      )}
                    </span>
                  ) : (
                    <span className="flex items-center gap-3">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        {t('enrollments.state_pending')}
                      </span>
                      {/* Pending is stated either way; the shortcut exists
                          only while Pagos is on the air (CLAUDE.md §5). */}
                      {flags['portal.payments'] && (
                        <Link
                          href="/portal/payments"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-blue px-3 py-1.5 text-xs font-semibold text-brand-blue transition hover:border-brand-yellow hover:bg-brand-yellow hover:text-ink"
                        >
                          {t('enrollments.month_pay_cta')}
                          <Icon name="arrow-right" size={13} />
                        </Link>
                      )}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        {note && (
          <p className={`mt-4 rounded-lg border px-4 py-3 text-sm ${note.className}`}>
            {t(note.key)}
          </p>
        )}
      </Card>
    )
  }

  const tabs: StatusTab[] = TAB_ORDER.flatMap((status) => {
    const group = enrollments.filter((e) => e.status === status)
    if (group.length === 0) return []
    return [
      {
        id: status,
        label: t(`enrollment_status.${status}`),
        count: group.length,
        content: <ul className="grid gap-5">{group.map(card)}</ul>,
      },
    ]
  })

  return (
    <div>
      <PageHeader title={t('enrollments.title')} />

      {enrollments.length === 0 ? (
        <EmptyState
          title={t('enrollments.empty_title')}
          body={t('enrollments.empty_body')}
          icon={<Icon name="enrollment" size={24} />}
        />
      ) : (
        <StatusTabs tabs={tabs} />
      )}
    </div>
  )
}
