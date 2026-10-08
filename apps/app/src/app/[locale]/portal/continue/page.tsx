import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getPortalView } from '@/lib/portal/session'
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

  const { offers } = await getPortalView()

  return (
    <div>
      <PageHeader title={t('continue_page.title')} />
      <ContinueView offers={offers} />
    </div>
  )
}
