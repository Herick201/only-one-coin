import { Queue, type ConnectionOptions } from "bullmq";
import { SEND_EMAIL_QUEUE, SendEmailPayloadSchema, type SendEmailPayload } from "../jobs/send-email.job.js";

export function createSendEmailQueue(connection: ConnectionOptions): Queue<SendEmailPayload> {
  return new Queue<SendEmailPayload>(SEND_EMAIL_QUEUE, { connection });
}

export async function enqueueSendEmail(
  queue: Queue<SendEmailPayload>,
  payload: SendEmailPayload,
): Promise<void> {
  const parsed = SendEmailPayloadSchema.parse(payload);
  await queue.add(SEND_EMAIL_QUEUE, parsed);
}
