import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getPaymentSettings, getStaffSession } from '@/lib/backoffice/mock-data'
import {
  canConfigurePayments,
  canReviewPayments,
} from '@/lib/backoffice/permissions'
import { EmptyState, MockNotice, PageHeader } from '@/components/backoffice/ui'
import { SectionTabs } from '@/components/backoffice/section-tabs'
import { PaymentSettingsForm } from './payment-settings-form'

/**
 * The validation parameters — what the platform approves on before it asks for
 * a human. Kept inside payments rather than in the general settings module:
 * whoever works the queue is who notices the tolerance is wrong, and the
 * numbers only mean anything next to the queue they produce.
 *
 * The role gate here draws the form or the locked state; the enforcing check is
 * the role declared on the route in `apps/api` (CLAUDE.md §8).
 */
export default async function PaymentSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('bo')

  const staff = getStaffSession()
  const allowed = canConfigurePayments(staff.role)

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
      <PageHeader
        title={t('payment_settings.title')}
        subtitle={t('payment_settings.subtitle')}
      />
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
          allowed
            ? {
                href: '/backoffice/payments/settings',
                label: t('payments.settings_action'),
                icon: 'settings',
              }
            : undefined
        }
      />
      <MockNotice label={t('common.mock_notice')} />
      {allowed ? (
        <PaymentSettingsForm settings={getPaymentSettings()} />
      ) : (
        <EmptyState
          icon="shield"
          title={t('payment_settings.locked_title')}
          body={t('payment_settings.locked_body')}
        />
      )}
    </div>
  )
}
