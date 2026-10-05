import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { apiFetch } from '@/lib/backoffice/api-client'
import { AuthShell } from '../../login/auth-shell'
import { AccessForm } from './access-form'

export const metadata: Metadata = { robots: { index: false, follow: false } }

type TokenState = { state: 'valid'; purpose: 'activation' | 'reset' } | { state: 'expired_or_used'; purpose: null }

/**
 * Where both portal e-mails land — the activation (account just created) and
 * the reset. The API says only whether the link works and what it is for.
 */
export default async function AccessPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params
  setRequestLocale(locale)
  const t = await getTranslations('portal_auth')

  const response = await apiFetch(`/api/v1/portal/access-tokens/${encodeURIComponent(token)}`)
  const link: TokenState = response.ok ? ((await response.json()) as TokenState) : { state: 'expired_or_used', purpose: null }

  return (
    <AuthShell>
      {link.state === 'valid' ? (
        <AccessForm token={token} purpose={link.purpose} />
      ) : (
        <div className="rounded-[28px] border border-line bg-white p-6 shadow-float sm:p-7">
          <h1 className="font-display text-3xl font-semibold text-ink">{t('invalid_title')}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('invalid_body')}</p>
          <Link href="/forgot-password" className="mt-6 inline-flex text-sm font-bold text-brand-blue hover:text-brand-blue-deep">
            {t('request_new_link')}
          </Link>
        </div>
      )}
    </AuthShell>
  )
}
