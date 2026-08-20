import { Worker, type ConnectionOptions } from "bullmq";
import { SEND_EMAIL_QUEUE, SendEmailPayloadSchema } from "@ooc/queue";
import type { FastifyBaseLogger } from "fastify";

/**
 * Placeholder — só loga o payload. A implementação real chama o adapter de
 * e-mail (packages/notifications, quando existir) e grava o resultado na
 * tabela outbox.
 */
export function startSendEmailWorker(connection: ConnectionOptions, logger: FastifyBaseLogger): Worker {
  return new Worker(
    SEND_EMAIL_QUEUE,
    async (job) => {
      const payload = SendEmailPayloadSchema.parse(job.data);
      logger.info({ payload }, "send-email job received (stub — not sent)");
    },
    { connection },
  );
}
