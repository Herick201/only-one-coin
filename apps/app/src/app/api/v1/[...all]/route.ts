import { serverEnv } from '@/server-env'

// Same-origin proxy to apps/api's business routes, mirroring
// src/app/api/auth/[...all]/route.ts — the session cookie Better Auth set
// through that same proxy pattern only ever has to travel same-origin, never
// cross-origin (docs/ARCHITECTURE.md §5.6). apps/app never talks to Postgres
// directly (CLAUDE.md §8); this is purely a network hop, no business logic.
async function proxy(request: Request): Promise<Response> {
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

  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  })
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
  proxy as OPTIONS,
}
