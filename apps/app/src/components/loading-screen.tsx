'use client'

import { useTranslations } from 'next-intl'

/**
 * Full-viewport loading state. Used as a route-level `loading.tsx` fallback and
 * anywhere the app is resolving session/role before deciding what to render.
 * Client component so it renders instantly as a Suspense fallback (an async
 * server fallback would itself suspend). Text comes from the `loading` i18n
 * namespace (trilingual) — never hardcoded (CLAUDE.md §4).
 */
export function LoadingScreen({
  messageKey = 'message',
}: {
  messageKey?: 'message' | 'verifying_session'
}) {
  const t = useTranslations('loading')

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
      <span
        className="size-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600"
        role="status"
        aria-label={t(messageKey)}
      />
      <p className="text-sm text-slate-500">{t(messageKey)}</p>
    </main>
  )
}
