import { cookies } from 'next/headers'
import { serverEnv } from '@/server-env'

// Duplicated from apps/api/src/infra/auth/betterAuth.ts (SESSION_COOKIE_NAME)
// on purpose — apps/app never instantiates Better Auth itself (CLAUDE.md §3),
// so it cannot import that constant across the process boundary. Keep the two
// in sync if `advanced.cookiePrefix` or `useSecureCookies` ever changes there.
export const SESSION_COOKIE_NAME = 'better-auth.session_token'

/**
 * Authenticated read of `apps/api` from a Server Component. Talks to
 * `API_INTERNAL_URL` directly (server env, never in the client bundle)
 * rather than through the same-origin `/api/v1/*` proxy: a Server Component
 * has no incoming request of its own to proxy from — that proxy exists for
 * the browser (client components, `fetch('/api/v1/...')`), not for this.
 *
 * One place for the cookie-forwarding boilerplate every backoffice data
 * fetch needs, rather than repeating it per module.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value

  return fetch(new URL(path, serverEnv.API_INTERNAL_URL), {
    ...init,
    headers: {
      ...init?.headers,
      ...(token ? { cookie: `${SESSION_COOKIE_NAME}=${token}` } : {}),
    },
    cache: 'no-store',
  })
}
