import { z } from "zod";

export const RECEIPT_VALIDATE_QUEUE = "receipt-validate";

/** Only a pointer to the `receipt_uploads` row — the amounts stay in
 * Postgres, never Redis (same as the screen and extract jobs). */
export const ReceiptValidatePayloadSchema = z.object({
  receiptUploadId: z.string().uuid(),
});

export type ReceiptValidatePayload = z.infer<typeof ReceiptValidatePayloadSchema>;
