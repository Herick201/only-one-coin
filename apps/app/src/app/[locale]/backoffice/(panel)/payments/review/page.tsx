import { getTranslations, setRequestLocale } from 'next-intl/server'
import { listReviewQueue } from '@/lib/backoffice/mock-data'
import { MockNotice, PageHeader } from '@/components/backoffice/ui'
import { ReviewQueueView } from './review-queue-view'

/**
 * The human review queue in full — what the home card previews. Everything the
 * OCR ladder could not settle on its own ends here (CLAUDE.md §5): a mismatch
 * against the frozen plan price, low confidence on a critical field, an
 * illegible image, a repeated receipt, or two model families disagreeing.
 *
 * The list is a client component so search, filters and paging work with no
 * backend; the data still comes from the server. Deciding on a receipt needs
 * the image next to the extracted fields, which is a screen of its own — this
 * one triages and hands the case over to the student file.
 */
export default async function PaymentsReviewPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('bo')

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t('review.title')} subtitle={t('review.subtitle')} />
      <MockNotice label={t('common.mock_notice')} />
      <ReviewQueueView rows={listReviewQueue()} />
    </div>
  )
}
