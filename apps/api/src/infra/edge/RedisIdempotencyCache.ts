import type { Redis } from "ioredis";
import type { FastifyBaseLogger } from "fastify";
import { QUEUE_PREFIX } from "@ooc/queue";

/** Long enough to outlive any submit; a crashed one frees the key on its own. */
const PENDING_TTL_MS = 30_000;
/** A retry that comes back later than this is answered by the database. */
const DONE_TTL_MS = 24 * 60 * 60 * 1000;

type Entry =
  | { state: "pending"; fingerprint: string }
  | { state: "done"; fingerprint: string; response: unknown };

export type IdempotencyBegin =
  /** The first attempt already finished: answer with what it answered. */
  | { kind: "replay"; response: unknown }
  /** The first attempt is still running. */
  | { kind: "in_progress" }
  /** The key was used for a different request. */
  | { kind: "mismatch" }
  /** Nobody has this key yet — this request runs, then settles it. */
  | { kind: "fresh"; complete(response: unknown): Promise<void>; abandon(): Promise<void> };

export interface IdempotencyCache {
  begin(scope: string, key: string, fingerprint: string): Promise<IdempotencyBegin>;
}

const UNCACHED: IdempotencyBegin = {
  kind: "fresh",
  complete: async () => {},
  abandon: async () => {},
};

/**
 * Absorbs the double POST of a bad phone connection (CLAUDE.md §5) before it
 * reaches Postgres. The database stays the guarantee — the submit still looks
 * the idempotency key up inside its transaction — this is what keeps a burst
 * of retries from each opening one.
 *
 * Only ids and a hash of the request body go in: no PII in Redis.
 */
export class RedisIdempotencyCache implements IdempotencyCache {
  constructor(
    private readonly redis: Redis,
    private readonly logger: FastifyBaseLogger,
  ) {}

  async begin(scope: string, key: string, fingerprint: string): Promise<IdempotencyBegin> {
    const redisKey = `${QUEUE_PREFIX}:idem:${scope}:${key}`;

    try {
      const pending: Entry = { state: "pending", fingerprint };
      const claimed = await this.redis.set(redisKey, JSON.stringify(pending), "PX", PENDING_TTL_MS, "NX");

      if (claimed === "OK") {
        return {
          kind: "fresh",
          complete: (response) => this.settle(redisKey, { state: "done", fingerprint, response }),
          abandon: () => this.release(redisKey),
        };
      }

      const raw = await this.redis.get(redisKey);
      if (raw === null) {
        // Expired between the two calls — the attempt it belonged to is gone.
        // Saying "in progress" sends the client back once more, and that
        // retry claims the key normally.
        return { kind: "in_progress" };
      }

      const entry = JSON.parse(raw) as Entry;
      if (entry.fingerprint !== fingerprint) {
        return { kind: "mismatch" };
      }
      return entry.state === "done" ? { kind: "replay", response: entry.response } : { kind: "in_progress" };
    } catch (err) {
      this.logger.error({ err, scope }, "idempotency cache unavailable; falling through to the database");
      return UNCACHED;
    }
  }

  private async settle(redisKey: string, entry: Entry): Promise<void> {
    try {
      await this.redis.set(redisKey, JSON.stringify(entry), "PX", DONE_TTL_MS);
    } catch (err) {
      this.logger.error({ err }, "idempotency cache could not record a finished request");
    }
  }

  private async release(redisKey: string): Promise<void> {
    try {
      await this.redis.del(redisKey);
    } catch (err) {
      // The pending entry expires on its own in PENDING_TTL_MS.
      this.logger.error({ err }, "idempotency cache could not release a failed request");
    }
  }
}
