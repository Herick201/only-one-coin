'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { NotificationKind } from '@/lib/portal/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Icon, type IconName } from './icons'

/**
 * The bell: same notices the dashboard shows, reachable from anywhere in the
 * portal. Each item deep-links to the screen that resolves it.
 */

export interface NoticeItem {
  id: string
  kind: NotificationKind
  courseName: string | null
}

const noticeHref: Record<NotificationKind, string> = {
  monthly_payment_due: '/portal/payments',
  next_level_invite: '/portal/continue',
  document_ready: '/portal/documents',
}

const noticeIcon: Record<NotificationKind, IconName> = {
  monthly_payment_due: 'lock',
  next_level_invite: 'star',
  document_ready: 'documents',
}

export function NotificationsBell({
  notifications,
  align = 'start',
}: {
  notifications: NoticeItem[]
  align?: 'start' | 'end' | 'center'
}) {
  const t = useTranslations('portal')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('notifications.title')}
        className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-sky hover:text-brand-blue data-[state=open]:bg-sky data-[state=open]:text-brand-blue"
      >
        <Icon name="bell" size={20} />
        {notifications.length > 0 && (
          <span className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white">
            {notifications.length}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} className="w-96 max-w-[92vw] p-1.5">
        <DropdownMenuLabel className="px-3 py-2.5 text-base font-semibold text-ink">
          {t('notifications.title')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">
            {t('notifications.empty')}
          </p>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem key={n.id} asChild className="px-3 py-3">
              <Link href={noticeHref[n.kind]} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky text-brand-blue">
                  <Icon name={noticeIcon[n.kind]} size={17} />
                </span>
                <span className="text-sm leading-snug">
                  {t(`notice.${n.kind}`, { course: n.courseName ?? '' })}
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
