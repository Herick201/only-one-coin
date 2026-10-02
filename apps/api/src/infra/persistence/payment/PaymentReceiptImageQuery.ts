import { auditLog, receiptUploads } from "@ooc/db";
import { NotFoundError } from "@ooc/domain";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";
import type { ReceiptObjectStore } from "@/infra/storage/ReceiptObjectStore.js";

export const RECEIPT_URL_TTL_SECONDS = 5 * 60;

/**
 * The processed receipt of a payment, as a 5-minute URL (CLAUDE.md §8). Every
 * look is written to the audit log in the same breath: a receipt is a bank
 * screen, and who opened it is part of the record.
 */
export class PaymentReceiptImageQuery {
  constructor(
    private readonly db: Db,
    private readonly objectStore: ReceiptObjectStore,
  ) {}

  async run(params: { paymentId: string; actorId: string }): Promise<{ url: string; expiresAt: Date }> {
    const [upload] = await this.db
      .select({ id: receiptUploads.id, key: receiptUploads.processedObjectKey })
      .from(receiptUploads)
      .where(and(eq(receiptUploads.paymentId, params.paymentId), isNotNull(receiptUploads.processedObjectKey)))
      .orderBy(desc(receiptUploads.createdAt))
      .limit(1);
    if (!upload?.key) {
      throw new NotFoundError({ reason: "payment.receipt_not_found", message: "The payment has no processed receipt." });
    }

    const url = await this.objectStore.createReadUrl(upload.key, RECEIPT_URL_TTL_SECONDS);
    await this.db.insert(auditLog).values({
      actorId: params.actorId,
      action: "payment.receipt_viewed",
      targetId: params.paymentId,
      metadata: { receiptUploadId: upload.id },
    });

    return { url, expiresAt: new Date(Date.now() + RECEIPT_URL_TTL_SECONDS * 1000) };
  }
}
