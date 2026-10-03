import type { Redis } from "ioredis";
import type { FastifyBaseLogger } from "fastify";

export interface RateLimitHit {
  /** Requests counted in the current window, this one included. */
  count: number;
  /** Milliseconds until the window resets. */
  resetMs: number;
}

/**
 * One counter per key, fixed window. `null` means the counter could not be
 * read: the caller lets the request through (fail-open, apps/api/CLAUDE.md,
 * "Proteção da rota pública").
 */
export interface RateLimiter {
  hit(key: string, windowMs: number): Promise<RateLimitHit | null>;
}

// INCR and the expiry in one round trip, atomically: two separate commands
// would leave a counter without a TTL whenever the process died between them
// — a key that never resets is an IP locked out for good. The PTTL guard
// heals one that somehow lost its expiry anyway.
const HIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {count, ttl}
`;

type RedisWithHit = Redis & {
  rateLimitHit(key: string, windowMs: number): Promise<[number, number]>;
};

/**
 * Counters on the same Redis as the queue (`redis-nrlabs`, CLAUDE.md §3), on
 * a connection of their own: the queue's has `maxRetriesPerRequest: null`,
 * which BullMQ needs and which would make a request wait on Redis forever.
 * This one gives up fast (`createEdgeRedis`) and the request goes through.
 */
export class RedisRateLimiter implements RateLimiter {
  private readonly redis: RedisWithHit;

  constructor(
    redis: Redis,
    private readonly logger: FastifyBaseLogger,
  ) {
    redis.defineCommand("rateLimitHit", { numberOfKeys: 1, lua: HIT_SCRIPT });
    this.redis = redis as RedisWithHit;
  }

  async hit(key: string, windowMs: number): Promise<RateLimitHit | null> {
    try {
      const [count, resetMs] = await this.redis.rateLimitHit(key, windowMs);
      return { count, resetMs };
    } catch (err) {
      this.logger.error({ err }, "rate limit counter unavailable; letting the request through");
      return null;
    }
  }
}
