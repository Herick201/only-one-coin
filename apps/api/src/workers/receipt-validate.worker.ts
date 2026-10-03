import { Worker, type ConnectionOptions } from "bullmq";
import { RECEIPT_VALIDATE_QUEUE, ReceiptValidatePayloadSchema, type ReceiptValidatePayload } from "@ooc/queue";
import type { ValidateReceiptUseCase } from "@ooc/domain";
import type { FastifyBaseLogger } from "fastify";

/**
 * The receipt traffic light (OOC-21): hands the row to
 * `ValidateReceiptUseCase` once the relay sees it screened and read. Logs
 * ids, the verdict, its reason and what happened to the payment — never the
 * amount read nor the amount expected (CLAUDE.md §6, PII in logs).
 */
export function startReceiptValidateWorker(
  connection: ConnectionOptions,
  logger: FastifyBaseLogger,
  deps: { validateReceipt: ValidateReceiptUseCase },
): Worker<ReceiptValidatePayload> {
  return new Worker<ReceiptValidatePayload>(
    RECEIPT_VALIDATE_QUEUE,
    async (job) => {
      const { receiptUploadId } = ReceiptValidatePayloadSchema.parse(job.data);

      try {
        const { outcome, effect } = await deps.validateReceipt.run({ receiptUploadId });
        if (!outcome) {
          return;
        }
        logger.info({ receiptUploadId, verdict: outcome.verdict, reason: outcome.reason, effect }, "receipt validated");
      } catch (error) {
        logger.warn({ receiptUploadId, attempt: job.attemptsMade + 1 }, "receipt validate attempt failed, will retry");
        throw error;
      }
    },
    { connection, concurrency: 3 },
  );
}
