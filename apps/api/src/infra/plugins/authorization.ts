import {
  InsufficientPrivilegeError,
  NotAPlatformOwnerError,
  UnauthorizedError,
  isOwnerEmail,
  type AuthenticatedUser,
  type Role,
} from "@ooc/domain";
import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { container } from "@/container.js";
import { SESSION_COOKIE_NAME } from "@/infra/auth/betterAuth.js";

/**
 * The four ways a route may declare who it answers to. Three of them are a
 * session check; `internal` is the one that is not — see the handling below.
 */
export type RouteAuth =
  | { public: true }
  | { public: false; roles: Role[] }
  | { public: false; owners: true }
  | { public: false; internal: true };

/** Header apps/app sends on an `.internal()` call (CLAUDE.md §5). */
export const INTERNAL_TOKEN_HEADER = "x-ooc-internal-token";

declare module "fastify" {
  interface FastifyContextConfig {
    auth?: RouteAuth;
  }

  interface FastifyRequest {
    currentUser?: AuthenticatedUser;
  }
}

// Better Auth prefixes the cookie `__Secure-{name}` whenever its baseURL is
// https (BETTER_AUTH_URL always is in staging/production) — its own reader
// checks the prefixed name first, falling back to the bare one
// (better-auth/dist/cookies/index.mjs, `getCookie`). Every request in
// production carries the prefixed name; matching only the bare one meant
// this always returned null there — a valid session looked identical to no
// cookie at all, no error anywhere (only caught by testing a real login).
const SECURE_SESSION_COOKIE_NAME = `__Secure-${SESSION_COOKIE_NAME}`;

/**
 * Constant-time comparison for the internal token — a secret compared with
 * `===` leaks its prefix to anyone who can time the answer.
 */
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function extractSessionToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) {
    return null;
  }

  let bareValue: string | null = null;

  for (const part of cookieHeader.split(";")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const name = part.slice(0, separatorIndex).trim();
    const value = decodeURIComponent(part.slice(separatorIndex + 1).trim());

    if (name === SECURE_SESSION_COOKIE_NAME) {
      return value;
    }
    if (name === SESSION_COOKIE_NAME) {
      bareValue = value;
    }
  }

  return bareValue;
}

/**
 * Deny-by-default authorization (CLAUDE.md §6, §8): every route must declare
 * .roles(...) or .public() on its RouteBuilder — a route registered without
 * either fails app boot via the onRoute hook below, not just a request at
 * runtime. `role` is re-read from the database on every request through
 * ICurrentSessionPort, never trusted from a client-supplied header/JWT
 * (CLAUDE.md §8).
 */
async function authorizationPlugin(app: FastifyInstance) {
  app.addHook("onRoute", (routeOptions) => {
    if (routeOptions.config?.auth === undefined) {
      throw new Error(
        `Route ${String(routeOptions.method)} ${routeOptions.url} is missing an auth declaration ` +
          `— call .roles(...), .owners(), .internal() or .public() on its RouteBuilder (CLAUDE.md §6).`,
      );
    }
  });

  app.addHook("onRequest", async (request: FastifyRequest) => {
    const auth = request.routeOptions.config?.auth;

    // onRoute already guarantees every registered route has this set;
    // narrowed here only so TypeScript knows `auth` isn't undefined below.
    if (!auth || auth.public) {
      return;
    }

    /**
     * Service-to-service: apps/app asking apps/api something it needs before
     * it knows who is browsing — today, which feature flags are on, which the
     * portal shell reads for a student and the invite page reads for nobody at
     * all (CLAUDE.md §5). There is no session to check, so a shared secret
     * stands in for one.
     *
     * It fails closed twice over: production boots only with the secret set
     * (config.ts), and a request without the matching header is refused here
     * — never quietly downgraded to a public read.
     *
     * Outside production the secret is optional and the check is skipped, the
     * same ground rule the flags themselves follow: local and preview are
     * ours, and a fresh clone must run with no secret to invent.
     */
    if ("internal" in auth) {
      const expected = container.config.INTERNAL_API_TOKEN;

      if (!expected) {
        if (container.production) {
          throw new UnauthorizedError({
            reason: "auth.internal_token_required",
            message: "INTERNAL_API_TOKEN is not configured on this deploy.",
            path: request.url,
          });
        }
        return;
      }

      const presented = request.headers[INTERNAL_TOKEN_HEADER];
      if (typeof presented !== "string" || !constantTimeEquals(presented, expected)) {
        throw new UnauthorizedError({
          reason: "auth.internal_token_required",
          message: "Missing or invalid internal token.",
          path: request.url,
        });
      }

      return;
    }

    const sessionToken = extractSessionToken(request.headers.cookie);
    if (!sessionToken) {
      throw new UnauthorizedError({
        reason: "auth.session_required",
        message: "No session cookie present.",
        path: request.url,
      });
    }

    const user = await container.identity.currentSession.resolve(sessionToken);
    if (!user) {
      throw new UnauthorizedError({
        reason: "auth.session_required",
        message: "Session is invalid or expired.",
        path: request.url,
      });
    }

    /**
     * The owners' door: what belongs to whoever runs the platform rather than
     * to whoever runs the school. The cargo is deliberately not consulted —
     * an `admin` of the Asociación is refused, an owner passes whatever cargo
     * their account carries (CLAUDE.md §5, §8).
     */
    if ("owners" in auth) {
      if (!isOwnerEmail(user.email)) {
        throw new NotAPlatformOwnerError({ path: request.url });
      }
    } else if (!auth.roles.includes(user.role)) {
      throw new InsufficientPrivilegeError({ path: request.url });
    }

    request.currentUser = user;
  });
}

export default fp(authorizationPlugin);
