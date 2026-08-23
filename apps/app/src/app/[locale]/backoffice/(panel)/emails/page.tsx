import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getEmailMetrics, getStaffSession, listEmailFlows } from '@/lib/backoffice/mock-data'
import { canManageEmail } from '@/lib/backoffice/permissions'
import { EmptyState, MockNotice, PageHeader } from '@/components/backoffice/ui'
import { EmailsView } from './emails-view'

/**
 * The e-mail module, first screen: the catalog of transactional messages the
 * platform sends on its own (`docs/ROADMAP.md` fase 5).
 *
 * There is no send button here, and there is not meant to be one: a
 * transactional e-mail is the consequence of something the domain did — a
 * payment approved, a document issued — and the outbox carries it
 * (`docs/DOCUMENTOS-E-CERTIFICADOS.md` §4). What this screen answers is
 * narrower and more useful: which of them are switched on, what each one
 * actually says, and how the last thirty days went.
 *
 * The preview renders the versioned template from the repository, never the one
 * drawn in the provider's panel (CLAUDE.md §5) — that is the whole point of
 * having it here rather than in Brevo.
 *
 * Campaigns are the section's other half and are not built yet.
 */
export default async function EmailsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('bo')

  const staff = getStaffSession()

  if (!canManageEmail(staff.role)) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title={t('emails.title')} subtitle={t('emails.subtitle')} />
        {/* The screen says the section is not theirs; the role declared on the
            route in `apps/api` is what enforces it (CLAUDE.md §8). */}
        <EmptyState
          icon="shield"
          title={t('emails.locked_title')}
          body={t('emails.locked_body')}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t('emails.title')} subtitle={t('emails.subtitle')} />
      <MockNotice label={t('common.mock_notice')} />
      <EmailsView flows={listEmailFlows()} metrics={getEmailMetrics()} />
    </div>
  )
}
