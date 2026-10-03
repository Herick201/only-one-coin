import { Queue, type ConnectionOptions } from "bullmq";
import { QUEUE_PREFIX } from "../prefix.js";
import { SEND_EMAIL_QUEUE, SendEmailPayloadSchema, type SendEmailPayload } from "../jobs/send-email.job.js";

/** Retry policy for a delivery the provider refused for a transient reason
 * (5xx, 429, network): 5 tries over roughly half an hour. */
export const SEND_EMAIL_ATTEMPTS = 5;

export function createSendEmailQueue(connection: ConnectionOptions): Queue<SendEmailPayload> {
  return new Queue<SendEmailPayload>(SEND_EMAIL_QUEUE, {
    connection,
    prefix: QUEUE_PREFIX,
    defaultJobOptions: {
      attempts: SEND_EMAIL_ATTEMPTS,
      backoff: { type: "exponential", delay: 60_000 },
      // The outbox row keeps the record of what was sent; the job is only
      // the vehicle. Failed jobs stay a week for inspection (the DLQ).
      removeOnComplete: true,
      removeOnFail: { age: 7 * 24 * 60 * 60 },
    },
  });
}

/**
 * The job id is derived from the outbox row, so the relay can offer the same
 * row on every sweep and BullMQ keeps exactly one job for it while it is
 * waiting, delayed between retries or running.
 */
export async function enqueueSendEmail(queue: Queue<SendEmailPayload>, payload: SendEmailPayload): Promise<void> {
  const parsed = SendEmailPayloadSchema.parse(payload);
  await queue.add(SEND_EMAIL_QUEUE, parsed, { jobId: `outbox-${parsed.outboxId}` });
}
