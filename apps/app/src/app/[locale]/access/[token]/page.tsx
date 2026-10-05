import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { apiFetch } from '@/lib/backoffice/api-client'
import { AuthShell } from '../../login/auth-shell'
import { AccessForm } from './access-form'

export const metadata: Metadata = { robots: { index: false, follow: false } }

type TokenState = { state: 'valid'; purpose: 'activation' | 'reset' } | { state: 'expired_or_used'; purpose: null }

/**
 * What the page can say about a link. Only a 200 is read as an answer about
 * the link itself; a 429, a 5xx or a request that never got an answer is
 * `unreachable` — the link may be perfectly good, and sending the student to
 * ask for a new one would burn it.
 */
type LinkLookup = TokenState | { state: 'unreachable' }

async function lookUpLink(token: string): Promise<LinkLookup> {
  try {
    const response = await apiFetch(`/api/v1/portal/access-tokens/${encodeURIComponent(token)}`)
    if (response.status !== 200) return { state: 'unreachable' }
    return (await response.json()) as TokenState
  } catch {
    return { state: 'unreachable' }
  }
}

/**
 * Where both portal e-mails land — the activation (account just created) and
 * the reset. The API says only whether the link works and what it is for.
 */
export default async function AccessPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params
  setRequestLocale(locale)
  const t = await getTranslations('portal_auth')

  const link = await lookUpLink(token)

  if (link.state === 'valid') {
    return (
      <AuthShell>
        <AccessForm token={token} purpose={link.purpose} />
      </AuthShell>
    )
  }

  const unreachable = link.state === 'unreachable'

  return (
    <AuthShell>
      <div className="rounded-[28px] border border-line bg-white p-6 shadow-float sm:p-7">
        <h1 className="font-display text-3xl font-semibold text-ink">
          {unreachable ? t('server_error_title') : t('invalid_title')}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {unreachable ? t('server_error') : t('invalid_body')}
        </p>
        <Link
          href={unreachable ? `/access/${encodeURIComponent(token)}` : '/forgot-password'}
          className="mt-6 inline-flex text-sm font-bold text-brand-blue hover:text-brand-blue-deep"
        >
          {unreachable ? t('retry') : t('request_new_link')}
        </Link>
      </div>
    </AuthShell>
  )
}
