import { headers } from 'next/headers'
import { serverEnv } from '@/server-env'

/**
 * Same names as `apps/api/src/infra/edge/clientIp.ts` — keep them in sync.
 *
 * Every call to `apps/api` leaves from a Vercel function, so the API sees a
 * Vercel IP for every student in Peru, and a per-IP rate limit (OOC-24) would
 * count the whole country as one caller. These headers carry the reader's IP
 * across the hop; the API believes them only next to the shared secret, which
 * nobody calling fly.dev directly has.
 */
const PROXY_SECRET_HEADER = 'x-ooc-proxy-secret'
const PROXY_CLIENT_IP_HEADER = 'x-ooc-client-ip'

/**
 * The reader's IP as Vercel saw it. Vercel overwrites `x-forwarded-for` on the
 * way in, so a browser cannot plant one here — the first hop is the client.
 */
function clientIpOf(incoming: Headers): string | null {
  const forwarded = incoming.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || incoming.get('x-real-ip')?.trim() || null
}

/** The headers to add to a call to `apps/api` made on behalf of `incoming`.
 * Empty without `API_PROXY_SECRET` — the API then falls back on its own. */
export function apiIdentityHeaders(incoming: Headers): Record<string, string> {
  const secret = serverEnv.API_PROXY_SECRET
  const ip = clientIpOf(incoming)
  if (!secret || !ip) return {}
  return { [PROXY_SECRET_HEADER]: secret, [PROXY_CLIENT_IP_HEADER]: ip }
}

/** The same, for a Server Component or Server Action: reads the request it
 * is rendering for. Outside a request (build time) there is nobody to name. */
export async function requestIdentityHeaders(): Promise<Record<string, string>> {
  try {
    return apiIdentityHeaders(await headers())
  } catch {
    return {}
  }
}

/** Drops whatever `x-ooc-*` a browser sent, so only this file ever sets them. */
export function stripIdentityHeaders(outgoing: Headers): void {
  outgoing.delete(PROXY_SECRET_HEADER)
  outgoing.delete(PROXY_CLIENT_IP_HEADER)
}
