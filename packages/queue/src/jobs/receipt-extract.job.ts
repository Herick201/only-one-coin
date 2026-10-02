import { z } from "zod";

export const RECEIPT_EXTRACT_QUEUE = "receipt-extract";

/** Only a pointer to the `receipt_uploads` row, same as the screen job — the
 * image stays in the bucket and the reading goes to Postgres, never Redis. */
export const ReceiptExtractPayloadSchema = z.object({
  receiptUploadId: z.string().uuid(),
});

export type ReceiptExtractPayload = z.infer<typeof ReceiptExtractPayloadSchema>;
