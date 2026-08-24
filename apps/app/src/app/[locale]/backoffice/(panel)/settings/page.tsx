import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getStaffSession } from '@/lib/backoffice/mock-data'
import { getGeneralSettings } from '@/lib/backoffice/settings'
import { canConfigureSettings } from '@/lib/backoffice/permissions'
import { EmptyState, MockNotice, PageHeader } from '@/components/backoffice/ui'
import { SettingsForm } from './settings-form'

/**
 * Platform settings — the values every screen already runs on, in the one place
 * somebody can change them.
 *
 * Nothing here is a new rule. Each field is a constant the code itself flags as
 * belonging in the backoffice: the passing grade, the certificate deadline, the
 * constancia fee, the contract warning, and the receipt parameters the pipeline
 * approves on (`lib/backoffice/settings.ts`). Putting them behind a screen is
 * what stops a change of "aprobado" from being a deploy (CLAUDE.md §5).
 *
 * The receipt block used to be its own screen under payments. It moved here
 * whole rather than being mirrored: two screens that both claim to own the same
 * number is how the two drift apart.
 *
 * Admin only. The gate here draws the form or the locked state; the check that
 * counts is the role declared on the route in `apps/api` (CLAUDE.md §8).
 */
export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('bo')

  const staff = getStaffSession()

  if (!canConfigureSettings(staff.role)) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title={t('settings.title')} />
        <EmptyState
          icon="shield"
          title={t('settings.locked_title')}
          body={t('settings.locked_body')}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t('settings.title')} />
      <MockNotice label={t('common.mock_notice')} />
      <SettingsForm settings={getGeneralSettings()} />
    </div>
  )
}
