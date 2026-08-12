import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ShieldIcon } from './icons'
import { BackofficeLoginForm } from './backoffice-login-form'

/**
 * Backoffice entry point — deliberately discreet: never linked from the landing
 * and never indexable (CLAUDE.md §8). This is defense in depth, not the defense:
 * real access control is RLS + role in the DB, wired later.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function BackofficePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('backoffice')

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-400">
            <ShieldIcon size={18} className="text-blue-400" />
            Only One Coin
          </span>
          <LanguageSwitcher variant="dark" />
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
          <h1 className="text-xl font-semibold text-slate-100">{t('title')}</h1>
          <p className="mt-1 mb-6 text-sm text-slate-400">{t('subtitle')}</p>
          <BackofficeLoginForm />
        </div>

        <p className="mt-6 flex items-start gap-2 text-xs text-slate-500">
          <ShieldIcon size={14} className="mt-0.5 shrink-0" />
          {t('security_notice')}
        </p>
        <p className="mt-2 text-center text-xs text-slate-600">
          {t('mock_notice')}
        </p>
      </div>
    </main>
  )
}
