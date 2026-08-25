import { cookies } from 'next/headers'
import { getLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'
import { serverEnv } from '@/server-env'
import type { StaffUser } from './types'

// Duplicated from apps/api/src/infra/auth/betterAuth.ts (SESSION_COOKIE_NAME)
// on purpose — apps/app never instantiates Better Auth itself (CLAUDE.md §3),
// so it cannot import that constant across the process boundary. Keep the two
// in sync if `advanced.cookiePrefix` or `useSecureCookies` ever changes there.
export const SESSION_COOKIE_NAME = 'better-auth.session_token'

/**
 * The signed-in staff member, read from the real session — never a client
 * choice (CLAUDE.md §8). Talks to `apps/api` directly with
 * `API_INTERNAL_URL` (server env, never in the client bundle) rather than
 * through the same-origin `/api/v1/*` proxy: this runs inside a Server
 * Component, which has no incoming request of its own to proxy from.
 *
 * No session, or a session `apps/api` rejects (expired, wrong role — a
 * `student`/`guardian` account has no business here): redirected to the
 * backoffice login rather than returned as null, so every call site below
 * can keep assuming a `StaffUser` exists, same as when this read a mock.
 */
export async function getStaffSession(): Promise<StaffUser> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value

  const response = token
    ? await fetch(new URL('/api/v1/me', serverEnv.API_INTERNAL_URL), {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
        cache: 'no-store',
      })
    : null

  if (!response?.ok) {
    const locale = await getLocale()
    redirect({ href: '/backoffice', locale })
    // redirect() throws NEXT_REDIRECT — unreachable, closes TS control flow.
    throw new Error('unreachable')
  }

  return response.json() as Promise<StaffUser>
}
