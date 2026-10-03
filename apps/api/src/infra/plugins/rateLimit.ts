import { createHash } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { QUEUE_PREFIX } from "@ooc/queue";
import type { RateLimitRule } from "@/shared/http/rateLimit.js";
import type { RateLimiter } from "@/infra/edge/RedisRateLimiter.js";

declare module "fastify" {
  interface FastifyContextConfig {
    rateLimit?: RateLimitRule[];
  }
}

export interface RateLimitPluginOptions {
  limiter: RateLimiter;
}

/** The value the rule counts against — hashed before it becomes a Redis key,
 * so no IP lands in Redis (CLAUDE.md §6, PII). */
function subjectOf(rule: RateLimitRule, request: FastifyRequest): string | null {
  switch (rule.by) {
    case "ip":
      return request.clientIp;
    case "user":
      return request.currentUser?.id ?? null;
    case "key":
      return rule.key(request) ?? null;
  }
}

function counterKey(rule: RateLimitRule, subject: string): string {
  const digest = createHash("sha256").update(`${rule.by}:${subject}`).digest("hex").slice(0, 32);
  return `${QUEUE_PREFIX}:rl:${rule.name}:${digest}`;
}

async function enforce(
  limiter: RateLimiter,
  rules: RateLimitRule[],
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply | undefined> {
  for (const rule of rules) {
    const subject = subjectOf(rule, request);
    if (subject === null) {
      continue;
    }

    const hit = await limiter.hit(counterKey(rule, subject), rule.windowSeconds * 1000);
    if (hit && hit.count > rule.limit) {
      // Rule and route, never the IP or the key itself.
      request.log.warn({ rule: rule.name, route: request.routeOptions.url }, "rate limit exceeded");
      return reply
        .status(429)
        .header("retry-after", String(Math.max(1, Math.ceil(hit.resetMs / 1000))))
        .send({ status: 429, reason: "rate_limit.exceeded", path: request.url });
    }
  }
  return undefined;
}

/**
 * Deny-by-default rate limiting (CLAUDE.md §6, "Sem rate limiting"): same
 * shape as the authorization plugin. Every route carries a list of rules — a
 * `.public()` route has to declare its own with `.rateLimit(...)`, a
 * `.roles()`/`.owners()` route gets the per-user staff budget unless it
 * declares one — and a route that reaches registration with none fails the
 * boot, not just a request.
 *
 * Fail-open: a counter Redis cannot answer lets the request through. Redis
 * down is already the queue down; locking every student out of the checkout
 * on top of that would turn a degraded API into a dead one. The captcha on
 * the submit does not depend on Redis.
 *
 * Register after clientIp (needs `request.clientIp`) and before
 * authorization: per-IP rules run first, so a burst is refused before the
 * session lookup ever queries the database.
 */
async function rateLimitPlugin(app: FastifyInstance, options: RateLimitPluginOptions) {
  const { limiter } = options;

  app.addHook("onRoute", (routeOptions) => {
    if (routeOptions.config?.rateLimit === undefined) {
      throw new Error(
        `Route ${String(routeOptions.method)} ${routeOptions.url} is missing a rate limit declaration ` +
          `— call .rateLimit(...) on its RouteBuilder (CLAUDE.md §6).`,
      );
    }
  });

  app.addHook("onRequest", async (request, reply) => {
    const rules = request.routeOptions.config?.rateLimit?.filter((rule) => rule.by === "ip") ?? [];
    return enforce(limiter, rules, request, reply);
  });

  app.addHook("preHandler", async (request, reply) => {
    const rules = request.routeOptions.config?.rateLimit?.filter((rule) => rule.by !== "ip") ?? [];
    return enforce(limiter, rules, request, reply);
  });
}

export default fp(rateLimitPlugin);
