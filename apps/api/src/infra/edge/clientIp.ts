import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import type { IncomingHttpHeaders } from "node:http";

/**
 * The headers apps/app's proxy stamps on every call (apps/app/src/lib/
 * api-identity.ts). Same names on both sides — keep them in sync.
 */
export const PROXY_SECRET_HEADER = "x-ooc-proxy-secret";
export const PROXY_CLIENT_IP_HEADER = "x-ooc-client-ip";

/** Set by Fly's edge on every request it accepts — the IP it accepted the
 * connection from. A client cannot forge it: the edge overwrites it. */
const FLY_CLIENT_IP_HEADER = "fly-client-ip";

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function validIp(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && isIP(trimmed) ? trimmed : null;
}

function secretMatches(sent: string | undefined, expected: string): boolean {
  if (!sent) {
    return false;
  }
  const a = Buffer.from(sent);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Who is actually calling — the key every per-IP rate limit counts against,
 * and the IP a guardian's consent is stamped with (CLAUDE.md §8, Ley 29733).
 *
 * The browser never reaches this process directly: apps/app proxies it from a
 * Vercel function, so the connection (and Fly-Client-IP) is Vercel's, the
 * same handful of addresses for every student in Peru. The student's IP comes
 * in a header the proxy sets — and a header is something anyone calling
 * fly.dev directly can write too. So it is believed only next to the shared
 * secret; without it, the caller is whoever opened the connection.
 *
 * With no secret configured (`API_PROXY_SECRET` unset) the first
 * X-Forwarded-For hop is used instead: right for traffic through Vercel, which
 * overwrites that header, and forgeable by a direct caller — the degraded mode
 * index.ts warns about in production.
 */
export function resolveClientIp(
  headers: IncomingHttpHeaders,
  socketIp: string | undefined,
  proxySecret: string | undefined,
): string {
  const connectionIp = validIp(single(headers[FLY_CLIENT_IP_HEADER])) ?? socketIp ?? "unknown";

  if (proxySecret) {
    if (secretMatches(single(headers[PROXY_SECRET_HEADER]), proxySecret)) {
      return validIp(single(headers[PROXY_CLIENT_IP_HEADER])) ?? connectionIp;
    }
    return connectionIp;
  }

  const forwarded = single(headers["x-forwarded-for"])?.split(",")[0];
  return validIp(forwarded) ?? connectionIp;
}
