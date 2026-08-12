'use client'

import { useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

/**
 * Portal-scoped language switcher (es/en/pt), preserving the current route.
 * Kept separate from the login copy so the two front doors can style
 * independently without cross-coupling.
 */
export function LanguageSwitcher() {
  const t = useTranslations('language')
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <label className="flex items-center gap-2 text-xs font-medium text-muted">
      <span className="sr-only">{t('label')}</span>
      <select
        value={locale}
        disabled={pending}
        onChange={(event) => {
          const nextLocale = event.target.value
          startTransition(() => {
            router.replace(pathname, { locale: nextLocale })
          })
        }}
        className="rounded-lg border border-line bg-white px-2.5 py-1.5 font-semibold text-ink outline-none transition focus:border-brand-blue"
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
