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

const ItemSchema = z.object({
  id: z.string().uuid(),
  enrollmentId: z.string().uuid(),
  studentId: z.string().uuid(),
  studentName: z.string(),
  courseName: z.string(),
  classGroupName: z.string(),
  planName: z.string(),
  status: z.enum(["pending", "under_review"]),
  method: z.enum(["yape", "plin", "bcp", "interbank", "other"]),
  methodDetail: z.string().nullable(),
  operationNumber: z.string().nullable(),
  expectedAmountCents: z.number().int(),
  currency: z.literal("PEN"),
  receipt: z.enum(["missing", "uploading", "ready", "refused"]),
  fraudSignals: z.array(z.enum(RECEIPT_FRAUD_SIGNAL_KINDS)),
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
        submittedAt: row.submittedAt.toISOString(),
        reviewDeadline: row.reviewDeadline.toISOString(),
      })),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    });
  });
