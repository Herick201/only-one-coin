import { Queue } from "bullmq";
import type { QueueRedis } from "../connection.js";
import { RECEIPT_UPLOAD_RELAY_EVERY_MS, RECEIPT_UPLOAD_RELAY_QUEUE } from "../jobs/receipt-upload-relay.job.js";

export function createReceiptUploadRelayQueue(redis: QueueRedis): Queue {
  return new Queue(RECEIPT_UPLOAD_RELAY_QUEUE, { ...redis });
}

/** Idempotent: upserting the scheduler on every boot leaves exactly one. */
export async function scheduleReceiptUploadRelay(queue: Queue): Promise<void> {
  await queue.upsertJobScheduler(
    RECEIPT_UPLOAD_RELAY_QUEUE,
    { every: RECEIPT_UPLOAD_RELAY_EVERY_MS },
    { name: RECEIPT_UPLOAD_RELAY_QUEUE, opts: { removeOnComplete: true, removeOnFail: 100 } },
  );
}
