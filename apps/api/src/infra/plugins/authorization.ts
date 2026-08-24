import { InsufficientPrivilegeError, UnauthorizedError, type AuthenticatedUser, type Role } from "@ooc/domain";
import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { container } from "@/container.js";
import { SESSION_COOKIE_NAME } from "@/infra/auth/betterAuth.js";

export type RouteAuth = { public: true } | { public: false; roles: Role[] };

declare module "fastify" {
  interface FastifyContextConfig {
    auth?: RouteAuth;
  }

  interface FastifyRequest {
    currentUser?: AuthenticatedUser;
  }
}

function extractSessionToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const name = part.slice(0, separatorIndex).trim();
    if (name === SESSION_COOKIE_NAME) {
      return decodeURIComponent(part.slice(separatorIndex + 1).trim());
    }
  }

  return null;
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
          `— call .roles(...) or .public() on its RouteBuilder (CLAUDE.md §6).`,
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

    if (!auth.roles.includes(user.role)) {
      throw new InsufficientPrivilegeError({ path: request.url });
    }

    request.currentUser = user;
  });
}

export default fp(authorizationPlugin);
