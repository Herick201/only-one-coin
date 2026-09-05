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
        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-sky hover:text-brand-blue data-[state=open]:bg-sky data-[state=open]:text-brand-blue"
      >
        <Icon name="bell" size={18} />
        {notifications.length > 0 && (
          <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {notifications.length}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} className="w-80 max-w-[90vw]">
        <DropdownMenuLabel>{t('notifications.title')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            {t('notifications.empty')}
          </p>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem key={n.id} asChild>
              <Link href={noticeHref[n.kind]} className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0 text-brand-blue">
                  <Icon name={noticeIcon[n.kind]} size={16} />
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
