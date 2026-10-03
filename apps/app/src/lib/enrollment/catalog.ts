import { serverEnv } from '@/server-env'
import { requestIdentityHeaders } from '@/lib/api-identity'
import type { PublicCatalog } from './types'

/**
 * `GET /api/v1/catalog` — public, no session. Called directly against
 * `apps/api` (server env, `page.tsx` is a Server Component with no incoming
 * request of its own to proxy through `/api/v1/*`), same pattern as
 * `lib/backoffice/api-client.ts` minus the cookie forwarding, since this
 * route never checks one.
 */
export async function getPublicCatalog(): Promise<PublicCatalog> {
  const response = await fetch(new URL('/api/v1/catalog', serverEnv.API_INTERNAL_URL), {
    // Rate-limited per reader's IP (OOC-24), not per Vercel's.
    headers: await requestIdentityHeaders(),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`GET /api/v1/catalog failed: ${response.status}`)
  }

  return response.json()
}
