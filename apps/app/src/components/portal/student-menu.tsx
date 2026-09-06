'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Icon } from './icons'

/**
 * The student's own corner — top right, next to the bell. Trigger is the
 * avatar; inside live the profile link and the logout.
 *
 * The language used to be a submenu here. It is a once-a-year choice, and a
 * submenu made it permanent chrome on every screen — so it moved into the
 * profile, with the rest of what a person sets about themselves. Same move the
 * panel had already made when it left the header for `/backoffice/account`.
 *
 * Desktop only. On a phone the same two live at the bottom of the screen,
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
