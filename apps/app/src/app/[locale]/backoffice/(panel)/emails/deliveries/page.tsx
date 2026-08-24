import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { EmailDeliveryState } from '@/lib/backoffice/types'
import { getStaffSession, listEmailDeliveryIssues } from '@/lib/backoffice/mock-data'
import { canManageEmail } from '@/lib/backoffice/permissions'
import { countDeliveryIssues } from '@/lib/backoffice/email-delivery'
import { MockNotice, PageHeader } from '@/components/backoffice/ui'
import { SectionTabs } from '@/components/backoffice/section-tabs'
import { BoIcon } from '@/components/backoffice/icons'
import { DeliveriesView } from './deliveries-view'

const STATES: EmailDeliveryState[] = ['bounced', 'failed']

/**
 * The e-mails that did not land, and the people on the other end of them.
 *
 * This is the section's only screen about individuals rather than about the
 * catalog, and that is the point: a bounce counter says 54, and the student
 * whose credentials never arrived cannot get into the portal. Every row opens
 * that student's file — which is where the phone number to call them on lives.
 *
 * The state filter is a real route, so the numbers on the other screens can
 * link straight into the slice they name.
 */
export default async function EmailDeliveriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ state?: string; template?: string }>
}) {
  const { locale } = await params
  const { state, template } = await searchParams
  setRequestLocale(locale)
  const t = await getTranslations('bo')

  const staff = getStaffSession()
  if (!canManageEmail(staff.role)) notFound()

  const all = listEmailDeliveryIssues()
  const counts = countDeliveryIssues(all)

  const stateFilter = STATES.find((value) => value === state) ?? null
  const rows = all.filter(
    (item) =>
      (stateFilter === null || item.state === stateFilter) &&
      (template === undefined || item.template === template),
  )

  const filters: { label: string; href: string; active: boolean; count: number }[] = [
    {
      label: t('deliveries.filter_all'),
      href: '/backoffice/emails/deliveries',
      active: stateFilter === null,
      count: counts.total,
    },
    {
      label: t('deliveries.filter_bounced'),
      href: '/backoffice/emails/deliveries?state=bounced',
      active: stateFilter === 'bounced',
      count: counts.bounced,
    },
    {
      label: t('deliveries.filter_failed'),
      href: '/backoffice/emails/deliveries?state=failed',
      active: stateFilter === 'failed',
      count: counts.failed,
    },
  ]

  const active = filters.find((filter) => filter.active) ?? filters[0]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('deliveries.title')}
        actions={
          <Link
            href="/backoffice/emails/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-yellow hover:text-ink active:bg-brand-yellow-deep"
          >
            <BoIcon name="plus" size={16} />
            {t('emails.new')}
          </Link>
        }
      />
      <SectionTabs
        tabs={[
          { href: '/backoffice/emails', label: t('emails.tab_catalog'), exact: true },
          { href: '/backoffice/emails/journey', label: t('emails.tab_journey') },
          { href: '/backoffice/emails/deliveries', label: t('deliveries.tab') },
        ]}
      />
      <MockNotice label={t('common.mock_notice')} />

      {/* One control, not three chips sitting under the tabs pretending to be
          more of them. Real links inside it, so a number on another screen can
          still point straight at the slice it names — and a native disclosure,
          so the menu costs no client component. */}
      <details className="relative w-fit">
        <summary
          className={`inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition [&::-webkit-details-marker]:hidden ${
            stateFilter === null
              ? 'border-line bg-white text-muted-foreground hover:border-brand-yellow hover:bg-cream hover:text-ink'
              : 'border-brand-blue bg-sky text-brand-blue'
          }`}
        >
          <BoIcon name="filter" size={16} />
          {active.label}
          <span className={stateFilter === null ? 'text-slate-400' : 'text-brand-blue/60'}>
            {active.count}
          </span>
          <BoIcon name="chevron-down" size={14} />
        </summary>
        <div className="absolute left-0 top-12 z-20 flex w-60 flex-col gap-0.5 rounded-xl border border-line bg-white p-1.5 shadow-float">
          {filters.map((filter) => (
            <Link
              key={filter.href}
              href={filter.href}
              aria-current={filter.active ? 'page' : undefined}
              className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition ${
                filter.active
                  ? 'bg-sky-soft font-semibold text-ink'
                  : 'text-muted-foreground hover:bg-cream hover:text-ink'
              }`}
            >
              {filter.label}
              <span className="text-xs text-slate-400">{filter.count}</span>
            </Link>
          ))}
        </div>
      </details>

      <DeliveriesView rows={rows} />
    </div>
  )
}
