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
/**
 * Better Auth names the session cookie `__Secure-{name}` whenever its
 * baseURL is https (BETTER_AUTH_URL always is here) — its own cookie
 * reader checks the prefixed name first, falling back to the bare one
 * (better-auth/dist/cookies/index.mjs, `getCookie`). Every call site that
 * reads or clears this cookie has to check both: the bare name silently
 * matches nothing in production, with no error — the session just looks
 * logged-out (or, for logout, never actually clears).
 */
export async function resolveSessionCookie(): Promise<{ name: string; value: string } | undefined> {
  const jar = await cookies()
  const securedName = `__Secure-${SESSION_COOKIE_NAME}`
  const secured = jar.get(securedName)
  if (secured) return { name: securedName, value: secured.value }

  const plain = jar.get(SESSION_COOKIE_NAME)
  return plain ? { name: SESSION_COOKIE_NAME, value: plain.value } : undefined
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const session = await resolveSessionCookie()

  return fetch(new URL(path, serverEnv.API_INTERNAL_URL), {
    ...init,
    headers: {
      ...init?.headers,
      ...(session ? { cookie: `${session.name}=${session.value}` } : {}),
    },
    cache: 'no-store',
  })
}
