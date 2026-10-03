import { Queue, type ConnectionOptions } from "bullmq";
import { QUEUE_PREFIX } from "../prefix.js";
import { RECEIPT_NORMALIZE_QUEUE, ReceiptNormalizePayloadSchema, type ReceiptNormalizePayload } from "../jobs/receipt-normalize.job.js";

/** Retry policy for a normalize attempt lost to something transient (bucket
 * timeout, decode worker OOM): 3 tries, short backoff — unlike e-mail, a
 * stuck receipt blocks the checkout, so the ladder is short and staff can
 * always ask the student to resend. */
export const RECEIPT_NORMALIZE_ATTEMPTS = 3;

export function createReceiptNormalizeQueue(connection: ConnectionOptions): Queue<ReceiptNormalizePayload> {
  return new Queue<ReceiptNormalizePayload>(RECEIPT_NORMALIZE_QUEUE, {
    connection,
    prefix: QUEUE_PREFIX,
    defaultJobOptions: {
      attempts: RECEIPT_NORMALIZE_ATTEMPTS,
      backoff: { type: "exponential", delay: 10_000 },
      removeOnComplete: true,
      removeOnFail: { age: 7 * 24 * 60 * 60 },
    },
  });
}

/**
 * The job id is derived from the receipt upload row, so the relay can offer
 * the same row on every sweep and BullMQ keeps exactly one job for it while
 * it is waiting, delayed between retries or running (same reasoning as
 * `enqueueSendEmail`).
 */
export async function enqueueReceiptNormalize(
  queue: Queue<ReceiptNormalizePayload>,
  payload: ReceiptNormalizePayload,
): Promise<void> {
  const parsed = ReceiptNormalizePayloadSchema.parse(payload);
  await queue.add(RECEIPT_NORMALIZE_QUEUE, parsed, { jobId: `receipt-${parsed.receiptUploadId}` });
}
