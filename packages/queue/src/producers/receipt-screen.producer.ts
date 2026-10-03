import { Queue, type ConnectionOptions } from "bullmq";
import { QUEUE_PREFIX } from "../prefix.js";
import { RECEIPT_SCREEN_QUEUE, ReceiptScreenPayloadSchema, type ReceiptScreenPayload } from "../jobs/receipt-screen.job.js";

/** A screening attempt only fails on something transient (database
 * timeout) — same short ladder as the normalize step. */
export const RECEIPT_SCREEN_ATTEMPTS = 3;

export function createReceiptScreenQueue(connection: ConnectionOptions): Queue<ReceiptScreenPayload> {
  return new Queue<ReceiptScreenPayload>(RECEIPT_SCREEN_QUEUE, {
    connection,
    prefix: QUEUE_PREFIX,
    defaultJobOptions: {
      attempts: RECEIPT_SCREEN_ATTEMPTS,
      backoff: { type: "exponential", delay: 10_000 },
      removeOnComplete: true,
      removeOnFail: { age: 7 * 24 * 60 * 60 },
    },
  });
}

/** Job id derived from the row, so the relay can offer it on every sweep
 * until `screened_at` is stamped (same reasoning as
 * `enqueueReceiptNormalize`). */
export async function enqueueReceiptScreen(
  queue: Queue<ReceiptScreenPayload>,
  payload: ReceiptScreenPayload,
): Promise<void> {
  const parsed = ReceiptScreenPayloadSchema.parse(payload);
  await queue.add(RECEIPT_SCREEN_QUEUE, parsed, { jobId: `receipt-screen-${parsed.receiptUploadId}` });
}
