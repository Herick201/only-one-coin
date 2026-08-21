import type { ReactNode } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { LanguageSwitcher } from '@/components/portal/language-switcher'
import { CheckoutIcon } from '@/components/enrollment/icons'

/**
 * Shell for the public checkout.
 *
 * Its own shell, not the portal's: this is the one screen a stranger reaches,
 * with no session behind it, and a sidebar of links they cannot open would only
 * invite them to leave a form they are halfway through. Header, the language
 * switcher and nothing else.
 *
 * The viewport IS the ruler here — there is no shell column stealing width, so
 * `sm:` means what it says (`CLAUDE.md` §5, "Layout das telas").
 */
export default async function EnrollmentLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('enrollment')

  return (
    <div className="flex min-h-dvh flex-col bg-sky-soft text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <span className="flex items-center gap-2.5">
            <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-brand-blue text-white shadow-card">
              <span className="text-lg font-bold leading-none">1</span>
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-brand-yellow" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-ink">Only One Coin</span>
              <span className="text-[11px] font-medium text-muted-foreground">
                {t('brand.label')}
              </span>
            </span>
          </span>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-muted-foreground sm:px-6">
          <span className="inline-flex items-center gap-1.5">
            <CheckoutIcon name="lock" size={14} />
            {t('footer.secure')}
          </span>
          <span>{t('footer.support')}</span>
        </div>
      </footer>
    </div>
  )
}
