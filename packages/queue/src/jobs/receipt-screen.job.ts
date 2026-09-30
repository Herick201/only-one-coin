import { z } from "zod";

export const RECEIPT_SCREEN_QUEUE = "receipt-screen";

/** Only a pointer to the `receipt_uploads` row, same as
 * `ReceiptNormalizePayloadSchema` — the fingerprint and the signals stay in
 * Postgres, never in Redis. */
export const ReceiptScreenPayloadSchema = z.object({
  receiptUploadId: z.string().uuid(),
});

export type ReceiptScreenPayload = z.infer<typeof ReceiptScreenPayloadSchema>;
