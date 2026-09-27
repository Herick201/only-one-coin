import { serverEnv } from '@/server-env'

/**
 * Same-origin proxy to apps/api, shared by `src/app/api/v1/[...all]` and
 * `src/app/api/auth/[...all]` — the session cookie Better Auth sets only ever
 * has to travel same-origin, never cross-origin (docs/ARCHITECTURE.md §5.6).
 * apps/app never talks to Postgres directly (CLAUDE.md §8); this is purely a
 * network hop, no business logic.
 */
export async function proxyToApi(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const target = new URL(url.pathname + url.search, serverEnv.API_INTERNAL_URL)

  const headers = new Headers(request.headers)
  headers.delete('host')

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: 'manual',
  })

  // fetch() already decoded the body — the Fly.io edge compresses apps/api's
  // responses (brotli), and undici undoes that transparently. Forwarding the
  // upstream `content-encoding` would label plain bytes as brotli, and the
  // upstream `content-length` would describe the compressed size, not these
  // bytes: in production that combination reached the browser as an empty
  // body, so every client-side read big enough for Fly to compress failed
  // (the student directory's second page, first). The platform re-compresses
  // and re-measures the response on its own way out.
  const responseHeaders = new Headers(upstream.headers)
  responseHeaders.delete('content-encoding')
  responseHeaders.delete('content-length')

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}
