'use client'

import { useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

/**
 * Language switcher for the public checkout.
 *
 * Its own copy rather than the portal's for one reason: **it has to keep the
 * query string.** `usePathname()` returns the path without the search params,
 * so `router.replace(pathname, …)` silently drops `?course=&group=&src=` — and
 * on this screen that is not cosmetic. It loses the seller's prefill, and it
 * rewrites `source` from `whatsapp` back to `web`, quietly corrupting the
 * channel attribution that is the whole reason the two entry modes share one
 * wizard (`docs/MATRICULA-CHECKOUT.md` §1 and §4).
 *
 * Read from `window.location` at click time rather than through
 * `useSearchParams`, which would opt every statically rendered page under this
 * layout into client rendering for a value only this handler needs.
 */
export function LanguageSwitcher() {
  const t = useTranslations('language')
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
      <span className="sr-only">{t('label')}</span>
      <select
        value={locale}
        disabled={pending}
        onChange={(event) => {
          const nextLocale = event.target.value
          const search =
            typeof window === 'undefined' ? '' : window.location.search
          startTransition(() => {
            router.replace(`${pathname}${search}`, { locale: nextLocale })
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
