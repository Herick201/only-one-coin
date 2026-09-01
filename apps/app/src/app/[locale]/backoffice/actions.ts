'use server'

import { cookies } from 'next/headers'
import { getLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'
import { serverEnv } from '@/server-env'
import { resolveSessionCookie } from '@/lib/backoffice/api-client'

/**
 * Signs the session out with Better Auth itself — not just a cookie wipe —
 * so the session row is actually invalidated server-side, then clears the
 * cookie here regardless of whether that call succeeded (an already-expired
 * or already-invalid session should still end the visit).
 */
export async function logoutStaff() {
  const jar = await cookies()
  const session = await resolveSessionCookie()

  if (session) {
    await fetch(new URL('/api/auth/sign-out', serverEnv.API_INTERNAL_URL), {
      method: 'POST',
      headers: { cookie: `${session.name}=${session.value}` },
    }).catch(() => {
      // Best-effort: the cookie clears below either way.
    })
  }

  jar.delete(session?.name ?? 'better-auth.session_token')

  const locale = await getLocale()
  redirect({ href: '/backoffice', locale })
}
