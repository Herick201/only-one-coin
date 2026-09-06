import { getTranslations } from 'next-intl/server'

/**
 * The marker that says "what you are looking at is not on the air".
 *
 * It renders only while the internal unlock is open (`/api/preview`), and it
 * renders on every screen of the app on purpose: someone who unlocked a
 * disabled section in production and then forgot would otherwise read a live
 * panel and an internal one as the same thing — and that is exactly how a
 * "the student says it isn't there" hunt starts.
 */
export async function InternalPreviewBadge() {
  const t = await getTranslations('preview')

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-50 flex justify-center px-3">
      <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-[13px] text-amber-950 shadow-lg">
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full bg-amber-500"
        />
        <span className="font-semibold">{t('badge')}</span>
        <span className="hidden truncate text-amber-900/80 sm:inline">
          {t('description')}
        </span>
        {/* A plain anchor on purpose: `/api/preview` is a route handler, not a
            page. `next/link` would soft-navigate and the cookie would never be
            cleared — this has to be a real request. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/api/preview?off=1"
          className="shrink-0 rounded-full px-2 py-0.5 font-semibold underline underline-offset-2 hover:bg-amber-100"
        >
          {t('exit')}
        </a>
      </div>
    </div>
  )
}
