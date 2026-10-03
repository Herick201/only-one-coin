import { Queue, type ConnectionOptions } from "bullmq";
import { QUEUE_PREFIX } from "../prefix.js";
import { OUTBOX_RELAY_EVERY_MS, OUTBOX_RELAY_QUEUE } from "../jobs/outbox-relay.job.js";

export function createOutboxRelayQueue(connection: ConnectionOptions): Queue {
  return new Queue(OUTBOX_RELAY_QUEUE, { connection, prefix: QUEUE_PREFIX });
}

/** Idempotent: upserting the scheduler on every boot leaves exactly one. */
export async function scheduleOutboxRelay(queue: Queue): Promise<void> {
  await queue.upsertJobScheduler(
    OUTBOX_RELAY_QUEUE,
    { every: OUTBOX_RELAY_EVERY_MS },
    { name: OUTBOX_RELAY_QUEUE, opts: { removeOnComplete: true, removeOnFail: 100 } },
  );
}
