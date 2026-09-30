import type { IReceiptUploadRepository, ReceiptUpload, ReceiptUploadStatus } from "@ooc/domain";
import { receiptUploads } from "@ooc/db";
import { and, asc, eq } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";

/**
 * The half of `receipt_uploads` only the normalize worker uses — same
 * reasoning as `IOutboxStore` in `DrizzleOutboxRepository.ts`: a worker-only
 * read/write shape kept out of the domain port (`IReceiptUploadRepository`),
 * which is scoped to what the two HTTP-facing usecases need.
 */
export interface IReceiptNormalizationStore {
  listUploadedIds(limit: number): Promise<string[]>;
  markProcessed(id: string, processedObjectKey: string): Promise<ReceiptUpload | null>;
  markRejected(id: string, reason: string): Promise<ReceiptUpload | null>;
}

export class DrizzleReceiptUploadRepository implements IReceiptUploadRepository, IReceiptNormalizationStore {
  constructor(private readonly db: Db) {}

  async create(params: { id: string; seatHoldId: string; objectKey: string; contentType: string }): Promise<ReceiptUpload> {
    const [row] = await this.db
      .insert(receiptUploads)
      .values({
        id: params.id,
        seatHoldId: params.seatHoldId,
        objectKey: params.objectKey,
        contentType: params.contentType,
      })
      .returning();

    if (!row) {
      throw new Error("Insert into receipt_uploads returned no row");
    }

    return toReceiptUpload(row);
  }

  async findById(id: string): Promise<ReceiptUpload | null> {
    const [row] = await this.db.select().from(receiptUploads).where(eq(receiptUploads.id, id)).limit(1);
    return row ? toReceiptUpload(row) : null;
  }

  async markUploaded(id: string, params: { contentType: string; byteSize: number }): Promise<ReceiptUpload | null> {
    const [row] = await this.db
      .update(receiptUploads)
      .set({ status: "uploaded", contentType: params.contentType, byteSize: params.byteSize, updatedAt: new Date() })
      .where(and(eq(receiptUploads.id, id), eq(receiptUploads.status, "pending")))
      .returning();

    return row ? toReceiptUpload(row) : null;
  }

  async listUploadedIds(limit: number): Promise<string[]> {
    const rows = await this.db
      .select({ id: receiptUploads.id })
      .from(receiptUploads)
      .where(eq(receiptUploads.status, "uploaded"))
      .orderBy(asc(receiptUploads.createdAt))
      .limit(limit);

    return rows.map((row) => row.id);
  }

  async markProcessed(id: string, processedObjectKey: string): Promise<ReceiptUpload | null> {
    const [row] = await this.db
      .update(receiptUploads)
      .set({ status: "processed", processedObjectKey, updatedAt: new Date() })
      .where(and(eq(receiptUploads.id, id), eq(receiptUploads.status, "uploaded")))
      .returning();

    return row ? toReceiptUpload(row) : null;
  }

  async markRejected(id: string, reason: string): Promise<ReceiptUpload | null> {
    const [row] = await this.db
      .update(receiptUploads)
      .set({ status: "rejected", rejectionReason: reason, updatedAt: new Date() })
      .where(and(eq(receiptUploads.id, id), eq(receiptUploads.status, "uploaded")))
      .returning();

    return row ? toReceiptUpload(row) : null;
  }
}

function toReceiptUpload(row: typeof receiptUploads.$inferSelect): ReceiptUpload {
  return {
    id: row.id,
    seatHoldId: row.seatHoldId,
    paymentId: row.paymentId,
    objectKey: row.objectKey,
    status: row.status as ReceiptUploadStatus,
    processedObjectKey: row.processedObjectKey,
  };
}
