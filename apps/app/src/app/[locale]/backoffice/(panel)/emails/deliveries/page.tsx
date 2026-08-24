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

      {/* Real links, not client state: a number on another screen has to be
          able to point at the slice it names. */}
      <nav className="flex flex-wrap gap-1.5">
        {filters.map((filter) => (
          <Link
            key={filter.href}
            href={filter.href}
            aria-current={filter.active ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter.active
                ? 'bg-brand-blue text-white'
                : 'border border-line bg-white text-muted-foreground hover:border-brand-yellow hover:bg-cream hover:text-ink'
            }`}
          >
            {filter.label}
            <span className={filter.active ? 'text-white/70' : 'text-slate-400'}>
              {filter.count}
            </span>
          </Link>
        ))}
      </nav>

      <DeliveriesView rows={rows} />
    </div>
  )
}
