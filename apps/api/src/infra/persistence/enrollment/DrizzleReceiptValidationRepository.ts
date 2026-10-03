import {
  RECEIPT_EXTRACTION_TIER_PRIMARY,
  type IReceiptValidationRepository,
  type PaymentStatus,
  type ReceiptValidationEffect,
  type ReceiptValidationSubject,
} from "@ooc/domain";
import { auditLog, enrollments, paymentReceipts, payments, receiptUploads } from "@ooc/db";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";
import { insertOutboxEmails } from "@/infra/persistence/notification/DrizzleOutboxRepository.js";

/**
 * The receipt traffic light's writes (OOC-21). The automatic approval
 * reuses the manual settlement's moves (payment out of an open state, seat
 * `reserved → confirmed`, outbox, audit) but not its usecase: that one
 * demands a person and accepts `under_review`, and this one must do
 * neither.
 */
export class DrizzleReceiptValidationRepository implements IReceiptValidationRepository {
  constructor(private readonly db: Db) {}

  async findSubject(receiptUploadId: string): Promise<ReceiptValidationSubject | null> {
    const [row] = await this.db
      .select({
        receiptUploadId: receiptUploads.id,
        paymentId: payments.id,
        enrollmentId: enrollments.id,
        studentId: enrollments.studentId,
        classGroupId: enrollments.classGroupId,
        paymentStatus: payments.status,
        expectedCents: payments.amountCents,
        declaredOperationNumber: payments.operationNumber,
        readAmountCents: paymentReceipts.amountCents,
        readOperationNumber: paymentReceipts.operationNumber,
      })
      .from(receiptUploads)
      .innerJoin(payments, eq(payments.id, receiptUploads.paymentId))
      .innerJoin(enrollments, eq(enrollments.id, payments.enrollmentId))
      // The level-1 row — a failed reading has one too, with null columns,
      // and validates as `amount_unread`.
      .innerJoin(
        paymentReceipts,
        and(eq(paymentReceipts.receiptUploadId, receiptUploads.id), eq(paymentReceipts.tier, RECEIPT_EXTRACTION_TIER_PRIMARY)),
      )
      .where(
        and(eq(receiptUploads.id, receiptUploadId), isNotNull(receiptUploads.screenedAt), isNull(receiptUploads.validatedAt)),
      )
      .limit(1);

    return row ? { ...row, paymentStatus: row.paymentStatus as PaymentStatus } : null;
  }

  async record(params: Parameters<IReceiptValidationRepository["record"]>[0]): Promise<ReceiptValidationEffect> {
    const { subject, outcome, detail, approval } = params;

    return this.db.transaction(async (tx) => {
      const [stamped] = await tx
        .update(receiptUploads)
        .set({ validationVerdict: outcome.verdict, validationDetail: detail, validatedAt: sql`now()`, updatedAt: sql`now()` })
        .where(and(eq(receiptUploads.id, subject.receiptUploadId), isNull(receiptUploads.validatedAt)))
        .returning({ id: receiptUploads.id });
      if (!stamped) return "already_validated";

      // Only the upload that speaks for the payment moves it — the most
      // recent one, by the same order the review queue uses
      // (ListPaymentReviewQueueQuery's `latestUpload`).
      const [newer] = await tx
        .select({ id: receiptUploads.id })
        .from(receiptUploads)
        .where(
          and(
            eq(receiptUploads.paymentId, subject.paymentId),
            sql`(${receiptUploads.createdAt}, ${receiptUploads.id}) > (
              select self.created_at, self.id from ${receiptUploads} self where self.id = ${subject.receiptUploadId}
            )`,
          ),
        )
        .limit(1);
      if (newer) return "none";

      // Locks the payment and its enrollment: a reviewer settling the same
      // payment right now serialises behind (or ahead of) this.
      const [current] = await tx
        .select({ status: payments.status, seatStatus: enrollments.seatStatus })
        .from(payments)
        .innerJoin(enrollments, eq(enrollments.id, payments.enrollmentId))
        .where(eq(payments.id, subject.paymentId))
        .for("update");
      if (!current || current.status !== "pending") return "none";

      if (outcome.verdict === "approve" && approval && current.seatStatus !== "released") {
        await tx
          .update(payments)
          .set({ status: "approved", updatedAt: sql`now()` })
          .where(and(eq(payments.id, subject.paymentId), eq(payments.status, "pending")));
        // A monthly module's seat is already confirmed and stays as it is.
        await tx
          .update(enrollments)
          .set({ seatStatus: "confirmed", updatedAt: sql`now()` })
          .where(and(eq(enrollments.id, subject.enrollmentId), eq(enrollments.seatStatus, "reserved")));
        await insertOutboxEmails(tx, approval.notifications);
        await tx.insert(auditLog).values({
          actorId: approval.audit.actorId,
          action: approval.audit.action,
          targetId: approval.audit.targetId,
          metadata: approval.audit.metadata ?? null,
          createdAt: approval.audit.at,
        });
        return "approved";
      }

      await tx
        .update(payments)
        .set({ status: "under_review", updatedAt: sql`now()` })
        .where(and(eq(payments.id, subject.paymentId), eq(payments.status, "pending")));
      return "routed_to_review";
    });
  }
}
