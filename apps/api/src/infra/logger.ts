import type { FastifyBaseLogger, FastifyRequest } from "fastify";
import pino from "pino";
import type { Config } from "@/config.js";

const REDACTED = "[redacted]";

/** Portal activation/reset links: the token is always the segment after it. */
const PORTAL_TOKEN_PATH = /(\/portal\/access-tokens\/)[^/?#]+/;
/**
 * Staff invite and reset links: `GET /staff/invites/<token>` and
 * `GET /staff/password-resets/<token>` — the token is the last segment. The
 * static siblings (`complete`, `request`) and the id routes, which carry a
 * further segment (`/:id/cancel`, `/:id/renew`), are left readable.
 */
const STAFF_TOKEN_PATH = /(\/staff\/(?:invites|password-resets)\/)(?!(?:complete|request)(?=[?#]|$))[^/?#]+(?=[?#]|$)/;

/**
 * The request URL as it may be logged: a one-time link's token is a
 * credential (it sets a password), so it never reaches the log.
 */
export function redactTokenPaths(url: string): string {
  return url.replace(PORTAL_TOKEN_PATH, `$1${REDACTED}`).replace(STAFF_TOKEN_PATH, `$1${REDACTED}`);
}

/**
 * Fastify's own `req` serializer (fastify/lib/logger-pino.js), with the URL
 * redacted. A serializer on the logger instance overrides Fastify's, so this
 * is what "incoming request" and every error log carrying `req` print.
 */
export function serializeRequest(req: FastifyRequest): Record<string, unknown> {
  return {
    method: req.method,
    url: redactTokenPaths(req.url),
    version: req.headers?.["accept-version"],
    host: req.host,
    remoteAddress: req.ip,
    remotePort: req.socket?.remotePort,
  };
}

export function createLogger(config: Config): FastifyBaseLogger {
  return pino({
    level: config.NODE_ENV === "production" ? "info" : "debug",
    serializers: { req: serializeRequest },
  });
}
