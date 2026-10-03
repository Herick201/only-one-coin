import { Worker } from "bullmq";
import type { NotificationProvider } from "@ooc/notifications";
import { SEND_EMAIL_ATTEMPTS, SEND_EMAIL_QUEUE, SendEmailPayloadSchema, type SendEmailPayload, type QueueRedis } from "@ooc/queue";
import type { FastifyBaseLogger } from "fastify";
import type { IOutboxStore } from "@/infra/persistence/notification/DrizzleOutboxRepository.js";
import { deliverOutboxEmail } from "./deliverOutboxEmail.js";

/**
 * Delivers one outbox row per job (the relay enqueues them). Logs carry the
 * outbox id and the outcome, never the recipient or the vars (CLAUDE.md §6).
 */
export function startSendEmailWorker(
  redis: QueueRedis,
  logger: FastifyBaseLogger,
  deps: { store: IOutboxStore; provider: NotificationProvider },
): Worker<SendEmailPayload> {
  return new Worker<SendEmailPayload>(
    SEND_EMAIL_QUEUE,
    async (job) => {
      const { outboxId } = SendEmailPayloadSchema.parse(job.data);
      const maxAttempts = job.opts.attempts ?? SEND_EMAIL_ATTEMPTS;

      try {
        const outcome = await deliverOutboxEmail(outboxId, {
          ...deps,
          isFinalAttempt: job.attemptsMade + 1 >= maxAttempts,
        });
        logger.info({ outboxId, outcome }, "send-email job done");
      } catch (error) {
        logger.warn(
          { outboxId, attempt: job.attemptsMade + 1, code: (error as { code?: unknown }).code },
          "send-email attempt failed, will retry",
        );
        throw error;
      }
    },
    { ...redis, concurrency: 5 },
  );
}
