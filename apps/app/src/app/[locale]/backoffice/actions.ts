'use server'

import { cookies } from 'next/headers'
import { getLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'
import { serverEnv } from '@/server-env'
import { SESSION_COOKIE_NAME } from '@/lib/backoffice/session'

/**
 * Signs the session out with Better Auth itself — not just a cookie wipe —
 * so the session row is actually invalidated server-side, then clears the
 * cookie here regardless of whether that call succeeded (an already-expired
 * or already-invalid session should still end the visit).
 */
export async function logoutStaff() {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE_NAME)?.value

  if (token) {
    await fetch(new URL('/api/auth/sign-out', serverEnv.API_INTERNAL_URL), {
      method: 'POST',
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
    }).catch(() => {
      // Best-effort: the cookie clears below either way.
    })
  }

  jar.delete(SESSION_COOKIE_NAME)

  const locale = await getLocale()
  redirect({ href: '/backoffice', locale })
}
