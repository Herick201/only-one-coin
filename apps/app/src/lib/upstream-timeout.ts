/**
 * How long `apps/app` waits on `apps/api` before giving up — the same figure
 * for the browser-facing proxies and for the Server Component reads.
 *
 * Without a bound, an API that accepted the connection and never answered
 * kept every caller waiting for as long as the runtime allowed: the login
 * button in "Verificando…", the panel in its "verifying session" screen,
 * indefinitely. A bounded wait turns that into an error somebody can act on.
 */
export const UPSTREAM_TIMEOUT_MS = 15_000

export function upstreamSignal(): AbortSignal {
  return AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
}
