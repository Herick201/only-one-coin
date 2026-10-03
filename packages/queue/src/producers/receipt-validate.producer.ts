import { Queue } from "bullmq";
import type { QueueRedis } from "../connection.js";
import { RECEIPT_VALIDATE_QUEUE, ReceiptValidatePayloadSchema, type ReceiptValidatePayload } from "../jobs/receipt-validate.job.js";

/** Validation only fails on something transient (database timeout) — same
 * short ladder as the screening. */
export const RECEIPT_VALIDATE_ATTEMPTS = 3;

export function createReceiptValidateQueue(redis: QueueRedis): Queue<ReceiptValidatePayload> {
  return new Queue<ReceiptValidatePayload>(RECEIPT_VALIDATE_QUEUE, {
    ...redis,
    defaultJobOptions: {
      attempts: RECEIPT_VALIDATE_ATTEMPTS,
      backoff: { type: "exponential", delay: 10_000 },
      removeOnComplete: true,
      removeOnFail: { age: 7 * 24 * 60 * 60 },
    },
  });
}

/** Job id derived from the row, so the relay can offer it on every sweep
 * until `validated_at` is stamped (same reasoning as `enqueueReceiptScreen`). */
export async function enqueueReceiptValidate(
  queue: Queue<ReceiptValidatePayload>,
  payload: ReceiptValidatePayload,
): Promise<void> {
  const parsed = ReceiptValidatePayloadSchema.parse(payload);
  await queue.add(RECEIPT_VALIDATE_QUEUE, parsed, { jobId: `receipt-validate-${parsed.receiptUploadId}` });
}
