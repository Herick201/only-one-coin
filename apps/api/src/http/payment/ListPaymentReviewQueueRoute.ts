import { z } from "zod";
import { RECEIPT_FRAUD_SIGNAL_KINDS } from "@ooc/domain";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";
import { PAYMENT_READ_ROLES } from "./paymentRoles.js";

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  period: z.string().uuid().optional(),
  q: z.string().trim().min(2).max(100).optional(),
});

const PaymentMethodEnum = z.enum(["yape", "plin", "bcp", "interbank", "other"]);
const confidence = z.number().min(0).max(1);
const readField = <T extends z.ZodTypeAny>(value: T) => z.object({ value: value.nullable(), confidence });

// What OCR level 1 read off the latest receipt (OOC-20) — shown to the
// reviewer, never judged by this route. Null while there is no processed
// receipt to read.
const ReadingSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("not_read") }),
  z.object({
    state: z.literal("failed"),
    reason: z.enum(["provider_unavailable", "invalid_response", "unexpected_error"]),
    modelName: z.string().nullable(),
    readAt: z.string(),
  }),
  z.object({
    state: z.literal("read"),
    modelName: z.string().nullable(),
    modelVersion: z.string().nullable(),
    readAt: z.string(),
    amountCents: readField(z.number().int()),
    operationNumber: readField(z.string()),
    paymentMethod: readField(PaymentMethodEnum).extend({ detail: z.string().nullable() }),
    payerName: readField(z.string()),
    paidAt: readField(z.string()),
  }),
]);

const ItemSchema = z.object({
  id: z.string().uuid(),
  enrollmentId: z.string().uuid(),
  studentId: z.string().uuid(),
  studentName: z.string(),
  courseName: z.string(),
  classGroupName: z.string(),
  planName: z.string(),
  status: z.enum(["pending", "under_review"]),
  method: PaymentMethodEnum,
  methodDetail: z.string().nullable(),
  operationNumber: z.string().nullable(),
  expectedAmountCents: z.number().int(),
  currency: z.literal("PEN"),
  receipt: z.enum(["missing", "uploading", "ready", "refused"]),
  fraudSignals: z.array(z.enum(RECEIPT_FRAUD_SIGNAL_KINDS)),
  reading: ReadingSchema.nullable(),
  submittedAt: z.string(),
  reviewDeadline: z.string(),
});

export const listPaymentReviewQueueRoute = RouteBuilder.get("/payments/review")
  .docs({
    tags: ["Payments"],
    summary: "List the payments waiting for a decision",
    description: "Backs the review queue of /backoffice/payments. Oldest first, one page at a time.",
  })
  .roles(...PAYMENT_READ_ROLES)
  .query(QuerySchema)
  .response(
    200,
    z.object({ items: z.array(ItemSchema), total: z.number().int(), page: z.number().int(), pageSize: z.number().int() }),
  )
  .response(400, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const { page, period, q } = request.query;
    const result = await container.queries.listPaymentReviewQueue.run({ page, academicPeriodId: period, q });
    reply.status(200).send({
      items: result.items.map((row) => ({
        ...row,
        reading:
          row.reading && row.reading.state !== "not_read"
            ? { ...row.reading, readAt: row.reading.readAt.toISOString() }
            : row.reading,
        submittedAt: row.submittedAt.toISOString(),
        reviewDeadline: row.reviewDeadline.toISOString(),
      })),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    });
  });
