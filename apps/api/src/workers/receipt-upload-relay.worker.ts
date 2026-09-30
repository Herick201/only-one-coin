import { Worker, type ConnectionOptions, type Queue } from "bullmq";
import { RECEIPT_UPLOAD_RELAY_QUEUE, enqueueReceiptNormalize, type ReceiptNormalizePayload } from "@ooc/queue";
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
 */
export function startReceiptUploadRelayWorker(
  connection: ConnectionOptions,
  logger: FastifyBaseLogger,
  deps: { store: IReceiptNormalizationStore; normalizeQueue: Queue<ReceiptNormalizePayload> },
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
    },
    { connection, concurrency: 1 },
  );
}
