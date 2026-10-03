import { Worker, type ConnectionOptions } from "bullmq";
import { RECEIPT_EXTRACT_QUEUE, ReceiptExtractPayloadSchema, type ReceiptExtractPayload } from "@ooc/queue";
import { ReceiptExtractionError, findExtractedField, type ExtractReceiptUseCase } from "@ooc/domain";
import type { FastifyBaseLogger } from "fastify";

/**
 * Level 1 of the OCR ladder (OOC-20): hands the row to
 * `ExtractReceiptUseCase`. A failed call throws so BullMQ retries it with
 * backoff (level 1r); on the last attempt the failure is recorded instead,
 * so the receipt stops being offered and the reviewer sees there is no
 * reading.
 *
 * Logs ids, the model and the per-field confidence — never a value read
 * off the receipt (CLAUDE.md §6, PII in logs).
 */
export function startReceiptExtractWorker(
  connection: ConnectionOptions,
  logger: FastifyBaseLogger,
  deps: { extractReceipt: ExtractReceiptUseCase },
): Worker<ReceiptExtractPayload> {
  return new Worker<ReceiptExtractPayload>(
    RECEIPT_EXTRACT_QUEUE,
    async (job) => {
      const { receiptUploadId } = ReceiptExtractPayloadSchema.parse(job.data);
      const attempt = job.attemptsMade + 1;

      try {
        const { extraction } = await deps.extractReceipt.run({ receiptUploadId });
        if (!extraction) {
          return;
        }
        logger.info(
          {
            receiptUploadId,
            model: extraction.modelName,
            modelVersion: extraction.modelVersion,
            confidence: Object.fromEntries(extraction.fields.map((field) => [field.field, field.confidence])),
            amountRead: findExtractedField(extraction, "amount_cents")?.value != null,
            operationNumberRead: findExtractedField(extraction, "operation_number")?.value != null,
          },
          "receipt extracted",
        );
      } catch (error) {
        const reason = error instanceof ReceiptExtractionError ? error.reason : "unexpected_error";
        const providerStatus = error instanceof ReceiptExtractionError ? error.providerStatus : null;

        if (attempt < (job.opts.attempts ?? 1)) {
          logger.warn({ receiptUploadId, attempt, reason, providerStatus }, "receipt extract attempt failed, will retry");
          throw error;
        }

        const recorded = await deps.extractReceipt.recordFailure({ receiptUploadId, error });
        logger.error({ receiptUploadId, attempt, reason, providerStatus, recorded }, "receipt extract gave up");
      }
    },
    // Each job is one network call that mostly waits on the provider.
    { connection, concurrency: 5 },
  );
}
