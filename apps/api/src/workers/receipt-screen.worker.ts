import { Worker, type ConnectionOptions } from "bullmq";
import { RECEIPT_SCREEN_QUEUE, ReceiptScreenPayloadSchema, type ReceiptScreenPayload, QUEUE_PREFIX } from "@ooc/queue";
import type { ScreenReceiptUploadUseCase } from "@ooc/domain";
import type { FastifyBaseLogger } from "fastify";

/**
 * Level 0 of the OCR ladder (apps/api/CLAUDE.md, "Antifraude do
 * comprovante"): hands the row to `ScreenReceiptUploadUseCase`, which does
 * the comparing and the recording. Logs only ids and signal kinds — never
 * the EXIF software string or anything else read off the file.
 */
export function startReceiptScreenWorker(
  connection: ConnectionOptions,
  logger: FastifyBaseLogger,
  deps: { screenReceiptUpload: ScreenReceiptUploadUseCase },
): Worker<ReceiptScreenPayload> {
  return new Worker<ReceiptScreenPayload>(
    RECEIPT_SCREEN_QUEUE,
    async (job) => {
      const { receiptUploadId } = ReceiptScreenPayloadSchema.parse(job.data);

      try {
        const { signals, routedToReview } = await deps.screenReceiptUpload.run({ receiptUploadId });
        if (signals === null) {
          return;
        }
        logger.info(
          { receiptUploadId, signals: signals.map((signal) => signal.kind), routedToReview },
          "receipt screened",
        );
      } catch (error) {
        logger.warn({ receiptUploadId, attempt: job.attemptsMade + 1 }, "receipt screen attempt failed, will retry");
        throw error;
      }
    },
    { connection, prefix: QUEUE_PREFIX, concurrency: 3 },
  );
}
