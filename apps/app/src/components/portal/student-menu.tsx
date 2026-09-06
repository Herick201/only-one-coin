'use client'

import { useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Icon } from './icons'
import { Flag } from './flag'

/**
 * The student's own corner — top right, next to the bell. Trigger is the
 * avatar; inside live the profile link, the language submenu (flag before
 * each name) and the logout.
 *
 * Desktop only. On a phone the same three live at the bottom of the screen,
 * inside the tab bar's "more" sheet (`portal-tabbar.tsx`) — a menu anchored to
 * the top-right corner is the one spot a thumb cannot reach.
 */

export function StudentMenu({
  name,
  monogram,
  logoutAction,
}: {
  name: string
  monogram: string
  /** Server action that ends the session. */
  logoutAction: () => Promise<void>
}) {
  const t = useTranslations('portal')
  const tLang = useTranslations('language')
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function switchLocale(next: string) {
    if (pending || next === locale) return
    startTransition(() => {
      router.replace(pathname, { locale: next })
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={name}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky text-base font-semibold text-brand-blue-deep transition hover:ring-2 hover:ring-brand-blue/40 data-[state=open]:ring-2 data-[state=open]:ring-brand-blue/40"
      >
        {monogram}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 p-1.5">
        <DropdownMenuLabel className="px-3 py-2.5 text-base font-semibold leading-snug text-ink">
          {name}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className="gap-3 px-3 py-2.5 text-sm">
          <Link href="/portal/profile">
            <Icon name="profile" size={18} />
            {t('nav.profile')}
          </Link>
        </DropdownMenuItem>

        {/* Language: one clean row — current flag + current language name —
            that opens the list of the other two. */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-3 px-3 py-2.5 text-sm">
            <Flag locale={locale} />
            {tLang(locale)}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44 p-1.5">
            {routing.locales.map((code) => (
              <DropdownMenuItem
                key={code}
                onSelect={() => switchLocale(code)}
                className="gap-3 px-3 py-2.5 text-sm"
              >
                <Flag locale={code} />
                {tLang(code)}
                {code === locale && (
                  <span className="ml-auto text-brand-blue">
                    <Icon name="check" size={16} />
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <form action={logoutAction}>
          <DropdownMenuItem asChild className="gap-3 px-3 py-2.5 text-sm">
            <button
              type="submit"
              className="w-full text-red-600 data-highlighted:text-red-700"
            >
              <Icon name="logout" size={18} />
              {t('nav.logout')}
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
