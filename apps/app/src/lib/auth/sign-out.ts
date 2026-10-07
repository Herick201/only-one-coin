import { cookies } from 'next/headers'
import { serverEnv } from '@/server-env'
import { resolveSessionCookie, SESSION_COOKIE_NAME } from '@/lib/backoffice/api-client'
import { requestIdentityHeaders } from '@/lib/api-identity'

/**
 * Signs the session out with Better Auth itself — the session row dies
 * server-side — then clears the cookie whatever that call answered. Same for
 * the portal and the panel: one cookie, one sign-out.
 */
export async function signOutSession(): Promise<void> {
  const jar = await cookies()
  const session = await resolveSessionCookie()

  if (session) {
    await fetch(new URL('/api/auth/sign-out', serverEnv.API_INTERNAL_URL), {
      method: 'POST',
      headers: { ...(await requestIdentityHeaders()), cookie: `${session.name}=${session.value}` },
    }).catch(() => {
      // Best-effort: the cookie clears below either way.
    })
  }

  jar.delete(session?.name ?? SESSION_COOKIE_NAME)
}
