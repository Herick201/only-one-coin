import { Queue } from "bullmq";
import type { QueueRedis } from "../connection.js";
import { RECEIPT_EXTRACT_QUEUE, ReceiptExtractPayloadSchema, type ReceiptExtractPayload } from "../jobs/receipt-extract.job.js";

/** Level 1r of the OCR ladder (apps/api/CLAUDE.md): a technical failure
 * (timeout, 429) is retried with the same model up to 3 times — the first
 * attempt plus three retries. After the last one the worker records the
 * failure instead of throwing. */
export const RECEIPT_EXTRACT_ATTEMPTS = 4;

export function createReceiptExtractQueue(redis: QueueRedis): Queue<ReceiptExtractPayload> {
  return new Queue<ReceiptExtractPayload>(RECEIPT_EXTRACT_QUEUE, {
    ...redis,
    defaultJobOptions: {
      attempts: RECEIPT_EXTRACT_ATTEMPTS,
      // 15s, 30s, 60s: long enough for a 429 window to pass.
      backoff: { type: "exponential", delay: 15_000 },
      removeOnComplete: true,
      removeOnFail: { age: 7 * 24 * 60 * 60 },
    },
  });
}

/** Job id derived from the row, so the relay can offer it on every sweep
 * until its `payment_receipts` row exists (same reasoning as
 * `enqueueReceiptScreen`). */
export async function enqueueReceiptExtract(
  queue: Queue<ReceiptExtractPayload>,
  payload: ReceiptExtractPayload,
): Promise<void> {
  const parsed = ReceiptExtractPayloadSchema.parse(payload);
  await queue.add(RECEIPT_EXTRACT_QUEUE, parsed, { jobId: `receipt-extract-${parsed.receiptUploadId}` });
}
