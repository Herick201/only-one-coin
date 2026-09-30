import { z } from "zod";

export const RECEIPT_NORMALIZE_QUEUE = "receipt-normalize";

/** Only a pointer to the `receipt_uploads` row — the worker reads the object
 * key and writes the outcome back to it, the same reasoning as
 * `SendEmailPayloadSchema` keeping PII out of Redis (CLAUDE.md §6). */
export const ReceiptNormalizePayloadSchema = z.object({
  receiptUploadId: z.string().uuid(),
});

export type ReceiptNormalizePayload = z.infer<typeof ReceiptNormalizePayloadSchema>;
