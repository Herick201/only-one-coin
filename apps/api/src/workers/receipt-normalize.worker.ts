import { Worker, type ConnectionOptions } from "bullmq";
import { RECEIPT_NORMALIZE_QUEUE, ReceiptNormalizePayloadSchema, type ReceiptNormalizePayload } from "@ooc/queue";
import type { IReceiptUploadRepository } from "@ooc/domain";
import type { FastifyBaseLogger } from "fastify";
import type { IReceiptNormalizationStore } from "@/infra/persistence/enrollment/DrizzleReceiptUploadRepository.js";
import type { ReceiptObjectStore } from "@/infra/storage/ReceiptObjectStore.js";
import { fingerprintReceiptImage, readExifFacts } from "@/infra/storage/fingerprintReceiptImage.js";
import { normalizeReceiptImage } from "@/infra/storage/normalizeReceiptImage.js";

/**
 * Downscale, greyscale, EXIF-strip, HEIC-convert — the one place the receipt
 * photo's bytes actually pass through a process (CLAUDE.md §6), and it is
 * this worker, never the request that offered the upload target.
 *
 * The processed key is what CLAUDE.md's 5-year retention keeps; the raw one
 * is deleted the moment the processed version lands, so `object_key` never
 * points at something the bucket no longer has once `status` is `processed`.
 * A row that fails validation (bad magic bytes) or decode is `rejected` and
 * its raw object is deleted too — nothing unusable sits in the bucket
 * waiting for a human to notice.
 *
 * It is also where the receipt's fingerprint is taken (OOC-22): the sha256
 * of the raw bytes and the EXIF facts can only be read here, before the raw
 * object is deleted and the metadata stripped; the perceptual hash is of the
 * processed image, so every receipt is hashed from the same kind of input.
 */
export function startReceiptNormalizeWorker(
  connection: ConnectionOptions,
  logger: FastifyBaseLogger,
  deps: { store: IReceiptUploadRepository & IReceiptNormalizationStore; objects: ReceiptObjectStore },
): Worker<ReceiptNormalizePayload> {
  return new Worker<ReceiptNormalizePayload>(
    RECEIPT_NORMALIZE_QUEUE,
    async (job) => {
      const { receiptUploadId } = ReceiptNormalizePayloadSchema.parse(job.data);

      try {
        const row = await deps.store.findById(receiptUploadId);
        if (!row || row.status !== "uploaded") {
          // The relay only offers `uploaded` rows, but a redelivered job can
          // still find one an earlier attempt already finished — nothing
          // left to do.
          return;
        }

        const raw = await deps.objects.getObject(row.objectKey);
        const result = await normalizeReceiptImage(raw);

        if (!result.ok) {
          await deps.store.markRejected(row.id, result.reason);
          await deps.objects.deleteObject(row.objectKey);
          logger.info({ receiptUploadId, reason: result.reason }, "receipt normalize rejected");
          return;
        }

        const fingerprint = await fingerprintReceiptImage(raw, result.buffer);
        const exif = await readExifFacts(raw);

        const processedKey = row.objectKey.replace("/raw/", "/processed/") + ".jpg";
        await deps.objects.putObject(processedKey, result.buffer, result.contentType);
        await deps.objects.deleteObject(row.objectKey);
        await deps.store.markProcessed(row.id, { processedObjectKey: processedKey, fingerprint, exif });
        logger.info({ receiptUploadId }, "receipt normalize processed");
      } catch (error) {
        logger.warn({ receiptUploadId, attempt: job.attemptsMade + 1 }, "receipt normalize attempt failed, will retry");
        throw error;
      }
    },
    { connection, concurrency: 3 },
  );
}
