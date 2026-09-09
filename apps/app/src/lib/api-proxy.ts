import { serverEnv } from '@/server-env'
import { UPSTREAM_TIMEOUT_MS, upstreamSignal } from './upstream-timeout'

/**
 * Same-origin hop from the browser to `apps/api`, shared by the two proxy
 * routes (`/api/auth/*` for Better Auth, `/api/v1/*` for the business routes).
 * The session cookie Better Auth sets through here only ever travels
 * same-origin, never cross-origin (docs/ARCHITECTURE.md §5.6); `apps/app`
 * never talks to Postgres directly (CLAUDE.md §8). Purely a network hop, no
 * business logic.
 *
 * The one thing it adds over a bare `fetch` is a bound on the wait: an API
 * that accepted the socket and never answered used to hold the browser's
 * request open for as long as the runtime allowed, and every screen upstream
 * of it — the login button included — sat in its pending state with nothing
 * to react to. Now that is a 504 in the project's own error envelope
 * (docs/ARCHITECTURE.md §5.7), which the caller can show and the person can
 * retry.
 */
export async function proxyToApi(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const target = new URL(url.pathname + url.search, serverEnv.API_INTERNAL_URL)

  const headers = new Headers(request.headers)
  headers.delete('host')

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'

  let upstream: Response
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: 'manual',
      signal: upstreamSignal(),
    })
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError'
    console.error(
      `[api-proxy] ${request.method} ${url.pathname} ${
        timedOut ? `timed out after ${UPSTREAM_TIMEOUT_MS}ms` : 'could not reach apps/api'
      }`,
      timedOut ? undefined : error,
    )
    return Response.json(
      {
        status: timedOut ? 504 : 502,
        reason: timedOut ? 'upstream.timeout' : 'upstream.unreachable',
        path: url.pathname,
      },
      { status: timedOut ? 504 : 502 },
    )
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  })
}
