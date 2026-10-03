import { classGroups, courses, enrollments, paymentReceipts, payments, planPrices, plans, receiptUploads, students } from "@ooc/db";
import {
  PaymentMethodSchema,
  RECEIPT_EXTRACTION_TIER_PRIMARY,
  isReceiptFraudSignalKind,
  isReceiptVerdict,
  isReceiptVerdictReason,
  type PaymentMethod,
  type ReceiptExtractionFailureReason,
  type ReceiptFraudSignalKind,
  type ReceiptVerdictOutcome,
} from "@ooc/domain";
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

/** One field the OCR read, with the model's own confidence (0–1). */
export interface ReviewReadField<TValue> {
  value: TValue | null;
  confidence: number;
}

/**
 * What OCR level 1 read off the latest receipt (OOC-20), shown to the
 * reviewer next to what the student declared. The judgement is `verdict`,
 * next to it (OOC-21). `null` while there is no processed receipt to read.
 */
export type ReviewReceiptReading =
  /** Processed, but no reading yet — the worker has not got to it, or no
   * OCR key is configured. */
  | { state: "not_read" }
  | { state: "failed"; reason: ReceiptExtractionFailureReason; modelName: string | null; readAt: Date }
  | {
      state: "read";
      modelName: string | null;
      modelVersion: string | null;
      readAt: Date;
      amountCents: ReviewReadField<number>;
      operationNumber: ReviewReadField<string>;
      paymentMethod: ReviewReadField<PaymentMethod> & { detail: string | null };
      payerName: ReviewReadField<string>;
      /** ISO 8601: an instant in UTC, or a bare date when the receipt printed
       * no time. */
      paidAt: ReviewReadField<string>;
    };

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
  reading: ReviewReceiptReading | null;
  /** The traffic light's verdict on the latest receipt (OOC-21) — `null`
   * while it has not run (no receipt, not screened or read yet, or no OCR
   * key configured). */
  verdict: ReceiptVerdictOutcome | null;
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
 * screening wrote them. A kind this version does not know is dropped: the
 * route's response schema is a closed enum, and one stray jsonb value must
 * not turn the whole queue into a 500. */
function signalKinds(raw: unknown): ReceiptFraudSignalKind[] {
  if (!Array.isArray(raw)) return [];
  const kinds = raw.map((signal) => (signal as { kind?: unknown } | null)?.kind).filter(isReceiptFraudSignalKind);
  return [...new Set(kinds)];
}

/** The verdict stamped on `receipt_uploads`. Same defence as `signalKinds`:
 * a value this version does not know reads as no verdict, never a 500. */
function receiptVerdict(verdict: string | null, detail: unknown): ReceiptVerdictOutcome | null {
  const reason = (detail as { reason?: unknown } | null)?.reason;
  if (!isReceiptVerdict(verdict) || !isReceiptVerdictReason(reason)) return null;
  return { verdict, reason };
}

const FAILURE_REASONS: readonly ReceiptExtractionFailureReason[] = [
  "provider_unavailable",
  "invalid_response",
  "unexpected_error",
];

function confidenceOf(raw: unknown): number {
  return typeof raw === "number" && raw >= 0 && raw <= 1 ? raw : 0;
}

/** One entry of `payment_receipts.extracted_fields`, by field name. A value
 * of the wrong type reads as not read — same reasoning as `signalKinds`:
 * one odd jsonb value must never take the whole queue down. */
function readField<TValue>(
  fields: Record<string, unknown>[],
  name: string,
  accept: (value: unknown) => value is TValue,
): ReviewReadField<TValue> {
  const entry = fields.find((field) => field.field === name);
  if (!entry || !accept(entry.value)) return { value: null, confidence: 0 };
  return { value: entry.value, confidence: confidenceOf(entry.confidence) };
}

const isString = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const isCents = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;
const isMethod = (value: unknown): value is PaymentMethod => PaymentMethodSchema.safeParse(value).success;

function receiptReading(
  uploadStatus: string | null,
  row: {
    readAt: Date | null;
    modelName: string | null;
    modelVersion: string | null;
    failureReason: string | null;
    fields: unknown;
  },
): ReviewReceiptReading | null {
  if (uploadStatus !== "processed") return null;
  if (!row.readAt) return { state: "not_read" };
  if (row.failureReason) {
    const reason = FAILURE_REASONS.find((known) => known === row.failureReason) ?? "unexpected_error";
    return { state: "failed", reason, modelName: row.modelName, readAt: row.readAt };
  }

  const fields = Array.isArray(row.fields)
    ? row.fields.filter((field): field is Record<string, unknown> => typeof field === "object" && field !== null)
    : [];
  const method = readField(fields, "payment_method", isMethod);
  const methodEntry = fields.find((field) => field.field === "payment_method");
  return {
    state: "read",
    modelName: row.modelName,
    modelVersion: row.modelVersion,
    readAt: row.readAt,
    amountCents: readField(fields, "amount_cents", isCents),
    operationNumber: readField(fields, "operation_number", isString),
    paymentMethod: {
      ...method,
      detail: method.value === "other" && isString(methodEntry?.detail) ? methodEntry.detail : null,
    },
    payerName: readField(fields, "payer_name", isString),
    paidAt: readField(fields, "paid_at", isString),
  };
}

export class ListPaymentReviewQueueQuery {
  constructor(private readonly db: Db) {}

  async run(filters: { q?: string; academicPeriodId?: string; page?: number } = {}): Promise<PaymentReviewQueue> {
    const page = Math.max(1, Math.floor(filters.page ?? 1));

    // The upload that speaks for the payment: the most recent one. A refused
    // receipt gets replaced, and the reviewer cares about the replacement.
    const latestUpload = this.db
      .selectDistinctOn([receiptUploads.paymentId], {
        id: receiptUploads.id,
        paymentId: receiptUploads.paymentId,
        status: receiptUploads.status,
        fraudSignals: receiptUploads.fraudSignals,
        validationVerdict: receiptUploads.validationVerdict,
        validationDetail: receiptUploads.validationDetail,
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
        validationVerdict: latestUpload.validationVerdict,
        validationDetail: latestUpload.validationDetail,
        readAt: paymentReceipts.createdAt,
        readModelName: paymentReceipts.modelName,
        readModelVersion: paymentReceipts.modelVersion,
        readFailureReason: paymentReceipts.failureReason,
        readFields: paymentReceipts.extractedFields,
      })
      .from(payments)
      .innerJoin(enrollments, eq(enrollments.id, payments.enrollmentId))
      .innerJoin(students, eq(students.id, enrollments.studentId))
      .innerJoin(classGroups, eq(classGroups.id, enrollments.classGroupId))
      .innerJoin(courses, eq(courses.id, classGroups.courseId))
      .innerJoin(planPrices, eq(planPrices.id, enrollments.planPriceId))
      .innerJoin(plans, eq(plans.id, planPrices.planId))
      .leftJoin(latestUpload, eq(latestUpload.paymentId, payments.id))
      // The level-1 reading of that same upload — at most one row, by the
      // (receipt_upload_id, tier) unique index.
      .leftJoin(
        paymentReceipts,
        and(
          eq(paymentReceipts.receiptUploadId, latestUpload.id),
          eq(paymentReceipts.tier, RECEIPT_EXTRACTION_TIER_PRIMARY),
        ),
      )
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
        reading: receiptReading(row.uploadStatus, {
          readAt: row.readAt,
          modelName: row.readModelName,
          modelVersion: row.readModelVersion,
          failureReason: row.readFailureReason,
          fields: row.readFields,
        }),
        verdict: receiptVerdict(row.validationVerdict, row.validationDetail),
        submittedAt: row.createdAt,
        reviewDeadline: new Date(row.createdAt.getTime() + REVIEW_WINDOW_DAYS * DAY_MS),
      }),
    );

    return { items, total: counted[0]?.value ?? 0, page, pageSize: PAYMENTS_PAGE_SIZE };
  }
}
