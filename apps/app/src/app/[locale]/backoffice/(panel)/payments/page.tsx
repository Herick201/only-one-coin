import { getTranslations, setRequestLocale } from 'next-intl/server'
import {
  getPaymentMetrics,
  getStaffSession,
  listPayments,
} from '@/lib/backoffice/mock-data'
import {
  canConfigurePayments,
  canReviewPayments,
} from '@/lib/backoffice/permissions'
import { EmptyState, MockNotice, PageHeader } from '@/components/backoffice/ui'
import { SectionTabs } from '@/components/backoffice/section-tabs'
import { PaymentsView } from './payments-view'

/**
 * Payments, the whole ledger. One section, three screens: what came in, what
 * is still waiting on a human, and the parameters that decide which is which.
 *
 * The list is a client component so search, filters and paging work with no
 * backend; the data and the role gates come from the server. Hiding a tab or a
 * button is a screen convenience — the enforcing check is the role declared on
 * the route in `apps/api` (CLAUDE.md §8).
 */
export default async function PaymentsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('bo')

  const staff = getStaffSession()

  if (!canReviewPayments(staff.role)) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title={t('payments.title')} subtitle={t('payments.subtitle')} />
        {/* Money is not the teacher's half of the panel — they run a class
            group. The screen says so; the role on the route in `apps/api` is
            what enforces it (CLAUDE.md §8). */}
        <EmptyState
          icon="shield"
          title={t('payments.locked_title')}
          body={t('payments.locked_body')}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t('payments.title')} subtitle={t('payments.subtitle')} />
      <SectionTabs
        tabs={[
          {
            href: '/backoffice/payments',
            label: t('payments.tab_ledger'),
            exact: true,
          },
          { href: '/backoffice/payments/review', label: t('payments.tab_review') },
        ]}
        /* The parameters are not a third place to work — they are what the
           other two run on, and only administration changes them. */
        action={
          canConfigurePayments(staff.role)
            ? {
                href: '/backoffice/payments/settings',
                label: t('payments.settings_action'),
                icon: 'settings',
              }
            : undefined
        }
      />
      <MockNotice label={t('common.mock_notice')} />
      <PaymentsView rows={listPayments()} metrics={getPaymentMetrics()} />
    </div>
  )
}
