import { getTranslations, setRequestLocale } from 'next-intl/server'
import {
  getStaffSession,
  listReceiptExtractions,
  listReviewQueue,
} from '@/lib/backoffice/mock-data'
import {
  canConfigurePayments,
  canReviewPayments,
} from '@/lib/backoffice/permissions'
import { EmptyState, MockNotice, PageHeader } from '@/components/backoffice/ui'
import { SectionTabs } from '@/components/backoffice/section-tabs'
import { ReviewQueueView } from './review-queue-view'

/**
 * The human review queue in full — what the home card previews. Everything the
 * OCR ladder could not settle on its own ends here (CLAUDE.md §5): a mismatch
 * against the frozen plan price, low confidence on a critical field, an
 * illegible image, a repeated receipt, or two model families disagreeing.
 *
 * The list is a client component so search, filters and paging work with no
 * backend; the data and the role gate come from the server. Each row carries
 * its extraction, so opening one shows the image next to what the model read
 * without a second round trip.
 */
export default async function PaymentsReviewPage({
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
      <PageHeader title={t('review.title')} subtitle={t('review.subtitle')} />
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
      <ReviewQueueView
        rows={listReviewQueue()}
        extractions={listReceiptExtractions()}
        canReview={canReviewPayments(staff.role)}
      />
    </div>
  )
}
