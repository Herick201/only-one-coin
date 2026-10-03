import { Redis } from "ioredis";
import type { FastifyBaseLogger } from "fastify";

/** A request never waits longer than this on a rate-limit counter. */
const COMMAND_TIMEOUT_MS = 250;

/**
 * The connection the HTTP edge (rate limit, idempotency cache) uses — same
 * Redis as the queue, different contract: a request must not hang on it.
 * `lazyConnect` so building the container (tests do, at import) never dials
 * Redis; the first command does. Keys go under `ooc:` by hand (QUEUE_PREFIX),
 * never through ioredis's `keyPrefix`: the ACL user only reaches `ooc:*`.
 */
export function createEdgeRedis(redisUrl: string, logger: FastifyBaseLogger): Redis {
  const redis = new Redis(redisUrl, {
    lazyConnect: true,
    commandTimeout: COMMAND_TIMEOUT_MS,
    maxRetriesPerRequest: 1,
  });
  // Without a listener ioredis prints every reconnect failure as an
  // unhandled error event. The commands themselves fail open (callers).
  redis.on("error", (err: Error) => {
    logger.warn({ err: { message: err.message } }, "edge redis connection error");
  });
  return redis;
}
