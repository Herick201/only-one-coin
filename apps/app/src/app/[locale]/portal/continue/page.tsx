import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getPortalSession } from '@/lib/portal/mock-data'
import { PageHeader } from '@/components/portal/ui'
import { ContinueView } from './continue-view'

export default async function ContinuePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('portal')

  const { offers } = getPortalSession()

  return (
    <div>
      <PageHeader
        title={t('continue_page.title')}
        subtitle={t('continue_page.subtitle')}
      />
      <ContinueView offers={offers} />
    </div>
  )
}
