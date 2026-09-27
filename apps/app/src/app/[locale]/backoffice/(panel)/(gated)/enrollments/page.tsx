import { getTranslations, setRequestLocale } from 'next-intl/server'
import { listEnrollments, parseEnrollmentLedgerQuery } from '@/lib/backoffice/enrollments'
import { getStaffSession } from '@/lib/backoffice/session'
import {
  canCreateEnrollment,
  canBrowseEnrollments,
} from '@/lib/backoffice/permissions'
import { EmptyState, PageHeader } from '@/components/backoffice/ui'
import { SectionTabs } from '@/components/backoffice/section-tabs'
import { EnrollmentsView } from './enrollments-view'

/**
 * Matrículas — every seat in the institution, in one list. Until now an
 * enrollment could only be read from inside the student it belongs to, which
 * answers "what did this person buy" and never "who is sitting in Inglés A1
 * this ciclo".
 *
 * Two screens: the ledger, and the seats still held by an unsettled payment.
 * The second is a screen and not a filter because it is a deadline — the cron
 * hands those seats back after the reservation window (CLAUDE.md §5), and
 * nobody chases a deadline they have to remember to filter for.
 *
 * Search, filters and paging live in the URL and run in Postgres: this server
 * component reads them from `searchParams` and fetches exactly the page asked
 * for. The client component only rewrites the URL. Hiding the create
 * button is a screen convenience — the enforcing check is the role declared on
 * the route in `apps/api` (CLAUDE.md §8).
 */
export default async function EnrollmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('bo')

  const staff = await getStaffSession()

  /* Enrollments belong to administration and coordination
     (`docs/ARCHITECTURE.md` §3). Tesorería settles the money in the payments
     section and a teacher reaches their students through the class group —
     neither reads a roster of the whole institution. The screen says so; the
     role on the route in `apps/api` is what enforces it (CLAUDE.md §8). */
  if (!canBrowseEnrollments(staff.role)) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          title={t('enrollments.title')}
        />
        <EmptyState
          icon="shield"
          title={t('enrollments.locked_title')}
          body={t('enrollments.locked_body')}
        />
      </div>
    )
  }

  /* The ledger comes from `apps/api` (GET /enrollments). A failure is shown as
     a failure: an empty table would read as "nobody enrolled this ciclo",
     which is the one thing this screen must never say by accident. */
  const query = parseEnrollmentLedgerQuery(await searchParams)
  const ledger = await listEnrollments(query)

  if (!ledger) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title={t('enrollments.title')} />
        <EmptyState
          icon="alert"
          title={t('enrollments.load_error_title')}
          body={t('enrollments.load_error_body')}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('enrollments.title')}
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
      <EnrollmentsView
        ledger={ledger}
        query={query}
        canCreate={canCreateEnrollment(staff.role)}
      />
    </div>
  )
}
