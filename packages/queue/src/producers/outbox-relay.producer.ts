import { Queue } from "bullmq";
import type { QueueRedis } from "../connection.js";
import { OUTBOX_RELAY_EVERY_MS, OUTBOX_RELAY_QUEUE } from "../jobs/outbox-relay.job.js";

export function createOutboxRelayQueue(redis: QueueRedis): Queue {
  return new Queue(OUTBOX_RELAY_QUEUE, { ...redis });
}

/** Idempotent: upserting the scheduler on every boot leaves exactly one. */
export async function scheduleOutboxRelay(queue: Queue): Promise<void> {
  await queue.upsertJobScheduler(
    OUTBOX_RELAY_QUEUE,
    { every: OUTBOX_RELAY_EVERY_MS },
    { name: OUTBOX_RELAY_QUEUE, opts: { removeOnComplete: true, removeOnFail: 100 } },
  );
}
