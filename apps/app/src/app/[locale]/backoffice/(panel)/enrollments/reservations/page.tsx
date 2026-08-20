import { getTranslations, setRequestLocale } from 'next-intl/server'
import {
  getPaymentSettings,
  getStaffSession,
  listSeatReservations,
} from '@/lib/backoffice/mock-data'
import { isRestrictedToOwnClassGroups } from '@/lib/backoffice/permissions'
import { EmptyState, MockNotice, PageHeader } from '@/components/backoffice/ui'
import { SectionTabs } from '@/components/backoffice/section-tabs'
import { ReservationsView } from './reservations-view'

/**
 * The seats held by a payment nobody has settled. A reservation is not a state
 * to browse — it is a countdown: after the reservation window the cron hands
 * the seat back (CLAUDE.md §5), and whoever paid and got ignored loses the
 * place they already bought.
 *
 * Soonest to expire first, always. The window is read from the payment
 * settings, the same number the job runs on, so the screen can never promise a
 * day the release does not honour.
 *
 * The countdown is computed here, on the server clock, and handed down as a
 * number: computing it inside the component would hydrate a different figure
 * than it rendered.
 */
export default async function ReservationsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('bo')

  const staff = getStaffSession()

  /* A teacher sees the students of their own class groups, reached through the
     class group — never a roster of every enrollment in the institution
     (CLAUDE.md §8). The screen says so; the role on the route in `apps/api` is
     what enforces it. */
  if (isRestrictedToOwnClassGroups(staff.role)) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          title={t('enrollments.title')}
          subtitle={t('enrollments.subtitle')}
        />
        <EmptyState
          icon="shield"
          title={t('enrollments.locked_title')}
          body={t('enrollments.locked_body')}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('reservations.title')}
        subtitle={t('reservations.subtitle')}
      />
      <SectionTabs
        tabs={[
          {
            href: '/backoffice/enrollments',
            label: t('enrollments.tab_ledger'),
            exact: true,
          },
          {
            href: '/backoffice/enrollments/reservations',
            label: t('enrollments.tab_reservations'),
          },
        ]}
      />
      <MockNotice label={t('common.mock_notice')} />
      <ReservationsView
        rows={listSeatReservations()}
        reservationDays={getPaymentSettings().reservationDays}
      />
    </div>
  )
}
