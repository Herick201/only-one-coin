import { classGroups, courses, enrollments, payments, planPrices, plans, receiptUploads, students } from "@ooc/db";
import type { PaymentMethod, ReceiptFraudSignalKind } from "@ooc/domain";
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";
import { OPEN_STATUSES, PAYMENTS_PAGE_SIZE, paymentSearchCondition } from "./ListPaymentsQuery.js";

/**
 * The review queue of the Payments screen (OOC-55): every payment nobody has
 * decided yet, oldest first, with what a reviewer needs before opening the
 * receipt — whether there is one to open, and what the antifraud screening
 * found on it. Read-only, like the ledger next to it.
 */

/**
 * How long an open payment may wait for a decision before the screen flags
 * it. Provisional — the same 5 days the reservation window had before it
 * left the enrollment ledger, pending confirmation from the business.
 */
export const REVIEW_WINDOW_DAYS = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Where the payment's latest receipt upload stands, as the screen reads it. */
export type ReviewReceiptState = "missing" | "uploading" | "ready" | "refused";

export interface PaymentReviewItem {
  id: string;
  enrollmentId: string;
  studentId: string;
  studentName: string;
  courseName: string;
  classGroupName: string;
  planName: string;
  status: "pending" | "under_review";
  method: PaymentMethod;
  methodDetail: string | null;
  operationNumber: string | null;
  expectedAmountCents: number;
  currency: "PEN";
  receipt: ReviewReceiptState;
  /** Only the kind of each signal: the detail carries ids of another
   * student's receipt and payment, which this screen has no business
   * showing. */
  fraudSignals: ReceiptFraudSignalKind[];
  submittedAt: Date;
  reviewDeadline: Date;
}

export interface PaymentReviewQueue {
  items: PaymentReviewItem[];
  /** Open payments matching the filters, across every page. */
  total: number;
  page: number;
  pageSize: number;
}

function receiptState(status: string | null): ReviewReceiptState {
  if (status === null) return "missing";
  if (status === "processed") return "ready";
  if (status === "rejected") return "refused";
  // `pending` (URL minted, nothing PUT yet) and `uploaded` (waiting for the
  // normalize worker) are both a receipt on its way.
  return "uploading";
}

/** The kinds in `receipt_uploads.fraud_signals`, once each, in the order the
 * screening wrote them. */
function signalKinds(raw: unknown): ReceiptFraudSignalKind[] {
  if (!Array.isArray(raw)) return [];
  const kinds = raw
    .map((signal) => (signal as { kind?: unknown } | null)?.kind)
    .filter((kind): kind is ReceiptFraudSignalKind => typeof kind === "string");
  return [...new Set(kinds)];
}

export class ListPaymentReviewQueueQuery {
  constructor(private readonly db: Db) {}

  async run(filters: { q?: string; academicPeriodId?: string; page?: number } = {}): Promise<PaymentReviewQueue> {
    const page = Math.max(1, Math.floor(filters.page ?? 1));

    // The upload that speaks for the payment: the most recent one. A refused
    // receipt gets replaced, and the reviewer cares about the replacement.
    const latestUpload = this.db
      .selectDistinctOn([receiptUploads.paymentId], {
        paymentId: receiptUploads.paymentId,
        status: receiptUploads.status,
        fraudSignals: receiptUploads.fraudSignals,
      })
      .from(receiptUploads)
      .where(isNotNull(receiptUploads.paymentId))
      .orderBy(receiptUploads.paymentId, desc(receiptUploads.createdAt), desc(receiptUploads.id))
      .as("latest_upload");

    const conditions: SQL[] = [inArray(payments.status, OPEN_STATUSES), isNull(enrollments.deletedAt)];
    if (filters.academicPeriodId) conditions.push(eq(classGroups.academicPeriodId, filters.academicPeriodId));
    const search = paymentSearchCondition(filters.q);
    if (search) conditions.push(search);
    const where = and(...conditions);

    const rowsPromise = this.db
      .select({
        id: payments.id,
        enrollmentId: payments.enrollmentId,
        status: payments.status,
        method: payments.method,
        methodDetail: payments.methodDetail,
        operationNumber: payments.operationNumber,
        createdAt: payments.createdAt,
        studentId: students.id,
        firstName: students.firstName,
        lastName: students.lastName,
        courseName: courses.name,
        classGroupCode: classGroups.code,
        classGroupSchedule: classGroups.schedule,
        planName: plans.name,
        expectedAmountCents: planPrices.amountCents,
        uploadStatus: latestUpload.status,
        fraudSignals: latestUpload.fraudSignals,
      })
      .from(payments)
      .innerJoin(enrollments, eq(enrollments.id, payments.enrollmentId))
      .innerJoin(students, eq(students.id, enrollments.studentId))
      .innerJoin(classGroups, eq(classGroups.id, enrollments.classGroupId))
      .innerJoin(courses, eq(courses.id, classGroups.courseId))
      .innerJoin(planPrices, eq(planPrices.id, enrollments.planPriceId))
      .innerJoin(plans, eq(plans.id, planPrices.planId))
      .leftJoin(latestUpload, eq(latestUpload.paymentId, payments.id))
      .where(where)
      // A queue: whoever has waited longest is first, always.
      .orderBy(asc(payments.createdAt), asc(payments.id))
      .limit(PAYMENTS_PAGE_SIZE)
      .offset((page - 1) * PAYMENTS_PAGE_SIZE);

    // Only the joins a filter can reach; each follows a NOT NULL foreign key.
    const totalPromise = this.db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(payments)
      .innerJoin(enrollments, eq(enrollments.id, payments.enrollmentId))
      .innerJoin(students, eq(students.id, enrollments.studentId))
      .innerJoin(classGroups, eq(classGroups.id, enrollments.classGroupId))
      .innerJoin(courses, eq(courses.id, classGroups.courseId))
      .where(where);

    const [rows, counted] = await Promise.all([rowsPromise, totalPromise]);

    const items = rows.map(
      (row): PaymentReviewItem => ({
        id: row.id,
        enrollmentId: row.enrollmentId,
        studentId: row.studentId,
        studentName: `${row.firstName} ${row.lastName}`,
        courseName: row.courseName,
        // Same label as the enrollment ledger: the printed code when the
        // class group has one, the schedule otherwise.
        classGroupName: row.classGroupCode || row.classGroupSchedule,
        planName: row.planName,
        // The WHERE above holds the status to the open pair; the method is
        // held to the union by payments_method_check.
        status: row.status as PaymentReviewItem["status"],
        method: row.method as PaymentMethod,
        methodDetail: row.methodDetail,
        operationNumber: row.operationNumber,
        expectedAmountCents: row.expectedAmountCents,
        currency: "PEN",
        receipt: receiptState(row.uploadStatus),
        fraudSignals: signalKinds(row.fraudSignals),
        submittedAt: row.createdAt,
        reviewDeadline: new Date(row.createdAt.getTime() + REVIEW_WINDOW_DAYS * DAY_MS),
      }),
    );

    return { items, total: counted[0]?.value ?? 0, page, pageSize: PAYMENTS_PAGE_SIZE };
  }
}
