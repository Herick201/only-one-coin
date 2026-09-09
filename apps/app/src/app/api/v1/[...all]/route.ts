import { proxyToApi } from '@/lib/api-proxy'

// Same-origin proxy to apps/api's business routes — the same hop the
// Better Auth routes take in src/app/api/auth/[...all]/route.ts.
export {
  proxyToApi as GET,
  proxyToApi as POST,
  proxyToApi as PUT,
  proxyToApi as PATCH,
  proxyToApi as DELETE,
  proxyToApi as OPTIONS,
}
