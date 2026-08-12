import { getTranslations, setRequestLocale } from 'next-intl/server'
import { env } from '@/env'
import { LoginForm } from './login-form'
import { LanguageSwitcher } from '@/components/language-switcher'

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('login')

  const siteUrl = env.NEXT_PUBLIC_LANDING_URL ?? '/'

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-between">
          <a
            href={siteUrl}
            className="text-sm text-slate-500 transition hover:text-slate-700"
          >
            ← {t('back_to_site')}
          </a>
          <LanguageSwitcher />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">{t('title')}</h1>
          <p className="mt-1 mb-6 text-sm text-slate-500">{t('subtitle')}</p>
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
