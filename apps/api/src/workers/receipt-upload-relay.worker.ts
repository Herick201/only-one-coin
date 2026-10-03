import { Worker, type Queue } from "bullmq";
import {
  RECEIPT_UPLOAD_RELAY_QUEUE,
  enqueueReceiptExtract,
  enqueueReceiptNormalize,
  enqueueReceiptScreen,
  enqueueReceiptValidate,
  type ReceiptExtractPayload,
  type ReceiptNormalizePayload,
  type ReceiptScreenPayload,
  type ReceiptValidatePayload,
  type QueueRedis,
} from "@ooc/queue";
import { RECEIPT_EXTRACTION_TIER_PRIMARY } from "@ooc/domain";
import type { FastifyBaseLogger } from "fastify";
import type { IReceiptNormalizationStore } from "@/infra/persistence/enrollment/DrizzleReceiptUploadRepository.js";

/** Rows offered per sweep — same order-of-magnitude reasoning as
 * `RELAY_BATCH` in outbox-relay.worker.ts. */
const RELAY_BATCH = 200;

/**
 * The bridge from Postgres to the queue for receipt uploads — the exact
 * shape of `startOutboxRelayWorker`. Every tick it offers each `uploaded`
 * row to the normalize queue; the job id is derived from the row, so
 * offering a row that already has a job is a no-op, and a row whose job was
 * lost (a crash between confirm and enqueue) is simply offered again on the
 * next tick.
 *
 * The same sweep offers the screening (OOC-22): a receipt is screened once
 * it is both `processed` and attached to a payment, and those two happen in
 * either order — the submit may land before or after the normalize job —
 * so the condition is polled here rather than fired from either side.
 *
 * The OCR extraction (OOC-20) is offered on the same condition, side by
 * side with the screening — neither waits on the other. `extractQueue` is
 * absent when no model key is configured; receipts then simply wait,
 * unread, until one is.
 *
 * The traffic light (OOC-21) waits for both: a receipt is offered to the
 * validate queue only once it is screened AND has its level-1 row (a
 * reading or a recorded failure). Without a model key nothing is ever read,
 * so nothing is ever offered — the pipeline stays as it was before OCR.
 */
export function startReceiptUploadRelayWorker(
  redis: QueueRedis,
  logger: FastifyBaseLogger,
  deps: {
    store: IReceiptNormalizationStore;
    normalizeQueue: Queue<ReceiptNormalizePayload>;
    screenQueue: Queue<ReceiptScreenPayload>;
    extractQueue: Queue<ReceiptExtractPayload> | null;
    validateQueue: Queue<ReceiptValidatePayload>;
  },
): Worker {
  return new Worker(
    RECEIPT_UPLOAD_RELAY_QUEUE,
    async () => {
      const ids = await deps.store.listUploadedIds(RELAY_BATCH);
      for (const receiptUploadId of ids) {
        await enqueueReceiptNormalize(deps.normalizeQueue, { receiptUploadId });
      }
      if (ids.length > 0) {
        logger.debug({ offered: ids.length }, "receipt upload relay offered pending rows");
      }

      const screenable = await deps.store.listScreenableIds(RELAY_BATCH);
      for (const receiptUploadId of screenable) {
        await enqueueReceiptScreen(deps.screenQueue, { receiptUploadId });
      }
      if (screenable.length > 0) {
        logger.debug({ offered: screenable.length }, "receipt upload relay offered rows to screen");
      }

      if (deps.extractQueue) {
        const extractable = await deps.store.listExtractableIds(RELAY_BATCH, RECEIPT_EXTRACTION_TIER_PRIMARY);
        for (const receiptUploadId of extractable) {
          await enqueueReceiptExtract(deps.extractQueue, { receiptUploadId });
        }
        if (extractable.length > 0) {
          logger.debug({ offered: extractable.length }, "receipt upload relay offered rows to extract");
        }
      }

      const validatable = await deps.store.listValidatableIds(RELAY_BATCH, RECEIPT_EXTRACTION_TIER_PRIMARY);
      for (const receiptUploadId of validatable) {
        await enqueueReceiptValidate(deps.validateQueue, { receiptUploadId });
      }
      if (validatable.length > 0) {
        logger.debug({ offered: validatable.length }, "receipt upload relay offered rows to validate");
      }
    },
    { ...redis, concurrency: 1 },
  );
}
