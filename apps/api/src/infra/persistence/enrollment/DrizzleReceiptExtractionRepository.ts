import {
  findExtractedField,
  type IReceiptExtractionRepository,
  type ReceiptExtraction,
  type ReceiptExtractionFailureReason,
  type ReceiptExtractionSubject,
} from "@ooc/domain";
import { paymentReceipts, receiptUploads } from "@ooc/db";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";

export class DrizzleReceiptExtractionRepository implements IReceiptExtractionRepository {
  constructor(private readonly db: Db) {}

  async findSubject(receiptUploadId: string, tier: number): Promise<ReceiptExtractionSubject | null> {
    const [row] = await this.db
      .select({
        id: receiptUploads.id,
        paymentId: receiptUploads.paymentId,
        processedObjectKey: receiptUploads.processedObjectKey,
      })
      .from(receiptUploads)
      .where(
        and(
          eq(receiptUploads.id, receiptUploadId),
          eq(receiptUploads.status, "processed"),
          isNotNull(receiptUploads.paymentId),
          sql`not exists (
            select 1 from ${paymentReceipts}
             where ${paymentReceipts.receiptUploadId} = ${receiptUploads.id}
               and ${paymentReceipts.tier} = ${tier}
          )`,
        ),
      )
      .limit(1);

    if (!row?.paymentId || !row.processedObjectKey) {
      return null;
    }

    return { receiptUploadId: row.id, paymentId: row.paymentId, processedObjectKey: row.processedObjectKey };
  }

  /** The amount and operation number are also copied to their own columns
   * — the validation step (Sessão 27) and the operation-number guard read
   * them there, without unpacking the JSON. */
  async recordExtraction(params: {
    subject: ReceiptExtractionSubject;
    tier: number;
    extraction: ReceiptExtraction;
  }): Promise<void> {
    const { subject, tier, extraction } = params;

    await this.db
      .insert(paymentReceipts)
      .values({
        paymentId: subject.paymentId,
        receiptUploadId: subject.receiptUploadId,
        tier,
        modelName: extraction.modelName,
        modelVersion: extraction.modelVersion,
        amountCents: findExtractedField(extraction, "amount_cents")?.value ?? null,
        operationNumber: findExtractedField(extraction, "operation_number")?.value ?? null,
        extractedFields: extraction.fields,
      })
      // A redelivered job lands on the (receipt_upload_id, tier) index and
      // changes nothing.
      .onConflictDoNothing({
        target: [paymentReceipts.receiptUploadId, paymentReceipts.tier],
        where: sql`${paymentReceipts.receiptUploadId} is not null`,
      });
  }

  async recordFailure(params: {
    subject: ReceiptExtractionSubject;
    tier: number;
    modelName: string;
    reason: ReceiptExtractionFailureReason;
  }): Promise<void> {
    const { subject, tier } = params;

    await this.db
      .insert(paymentReceipts)
      .values({
        paymentId: subject.paymentId,
        receiptUploadId: subject.receiptUploadId,
        tier,
        modelName: params.modelName,
        failureReason: params.reason,
      })
      .onConflictDoNothing({
        target: [paymentReceipts.receiptUploadId, paymentReceipts.tier],
        where: sql`${paymentReceipts.receiptUploadId} is not null`,
      });
  }
}
