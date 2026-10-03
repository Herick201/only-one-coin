import { Queue } from "bullmq";
import type { QueueRedis } from "../connection.js";
import { SEAT_HOLD_SWEEP_EVERY_MS, SEAT_HOLD_SWEEP_QUEUE } from "../jobs/seat-hold-sweep.job.js";

export function createSeatHoldSweepQueue(redis: QueueRedis): Queue {
  return new Queue(SEAT_HOLD_SWEEP_QUEUE, { ...redis });
}

/** Idempotent: upserting the scheduler on every boot leaves exactly one. */
export async function scheduleSeatHoldSweep(queue: Queue): Promise<void> {
  await queue.upsertJobScheduler(
    SEAT_HOLD_SWEEP_QUEUE,
    { every: SEAT_HOLD_SWEEP_EVERY_MS },
    { name: SEAT_HOLD_SWEEP_QUEUE, opts: { removeOnComplete: true, removeOnFail: 100 } },
  );
}
