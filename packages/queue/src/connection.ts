import { Redis } from "ioredis";

/** BullMQ's own default, kept when the URL names no ACL user (local Redis,
 * or the `default` user, which is not scoped to any prefix). */
const DEFAULT_PREFIX = "bull";

/**
 * What every Queue and Worker is built from: the shared ioredis client and
 * the key prefix, spread together into the BullMQ options.
 */
export interface QueueRedis {
  connection: Redis;
  prefix: string;
}

/**
 * The prefix is the URL's username. The shared Redis gives each project an
 * ACL user restricted to keys under its own name (user `ooc` → `ooc:*`), so
 * BullMQ's default `bull:*` would be refused with NOPERM on the first write.
 * Deriving it from the URL keeps the credential and the key space from
 * drifting apart: one secret decides both.
 */
export function createRedisConnection(redisUrl: string): QueueRedis {
  const username = decodeURIComponent(new URL(redisUrl).username);
  return {
    connection: new Redis(redisUrl, { maxRetriesPerRequest: null }),
    prefix: username && username !== "default" ? username : DEFAULT_PREFIX,
  };
}
