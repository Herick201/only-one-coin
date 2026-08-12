'use client'

import { useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

// Troca de idioma preservando a rota atual. es/en/pt -> rótulos do locale.
// `variant` adapta as cores: light (portal, padrão) ou dark (backoffice).
export function LanguageSwitcher({
  variant = 'light',
}: {
  variant?: 'light' | 'dark'
}) {
  const t = useTranslations('language')
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const dark = variant === 'dark'

  return (
    <label
      className={`flex items-center gap-2 text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}
    >
      <span>{t('label')}</span>
      <select
        value={locale}
        disabled={pending}
        onChange={(event) => {
          const nextLocale = event.target.value
          startTransition(() => {
            router.replace(pathname, { locale: nextLocale })
          })
        }}
        className={
          dark
            ? 'rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 outline-none focus:border-blue-400'
            : 'rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-700 outline-none focus:border-blue-500'
        }
      >
        {routing.locales.map((code) => (
          <option key={code} value={code}>
            {t(code)}
          </option>
        ))}
      </select>
    </label>
  )
}
