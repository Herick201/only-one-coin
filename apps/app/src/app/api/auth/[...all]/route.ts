import { proxyToApi } from '@/lib/api-proxy'

// Better Auth's own routes, reached same-origin so the session cookie it sets
// lands on this origin without a cross-origin hop (docs/ARCHITECTURE.md §5.6).
export {
  proxyToApi as GET,
  proxyToApi as POST,
  proxyToApi as PUT,
  proxyToApi as PATCH,
  proxyToApi as DELETE,
  proxyToApi as OPTIONS,
}
