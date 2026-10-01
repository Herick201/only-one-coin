import { PaymentMethodSchema } from "@ooc/domain";
import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";
import { PAYMENT_READ_ROLES } from "./paymentRoles.js";

const StatusSchema = z.enum(["pending", "under_review", "approved", "rejected"]);

// Every filter applied by Postgres; absent means "all". `q` keeps the same
// two-character floor as the other ledgers.
const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  status: StatusSchema.optional(),
  method: PaymentMethodSchema.optional(),
  period: z.string().uuid().optional(),
  q: z.string().trim().min(2).max(100).optional(),
  sort: z.enum(["newest", "oldest"]).default("newest"),
});

const RowSchema = z.object({
  id: z.string().uuid(),
  enrollmentId: z.string().uuid(),
  studentId: z.string().uuid(),
  studentName: z.string(),
  courseName: z.string(),
  status: StatusSchema,
  method: PaymentMethodSchema,
  methodDetail: z.string().nullable(),
  operationNumber: z.string().nullable(),
  amountCents: z.number().int(),
  expectedAmountCents: z.number().int(),
  currency: z.literal("PEN"),
  submittedAt: z.string(),
  decidedAt: z.string().nullable(),
  decidedByName: z.string().nullable(),
});

const ResponseSchema = z.object({
  items: z.array(RowSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  metrics: z.object({
    periodName: z.string(),
    inReview: z.number().int(),
    oldestOpenHours: z.number().nullable(),
    approved: z.number().int(),
    collectedCents: z.number().int(),
    rejected: z.number().int(),
  }),
});

export const listPaymentsRoute = RouteBuilder.get("/payments")
  .docs({
    tags: ["Payments"],
    summary: "List the payment ledger",
    description:
      "Backs /backoffice/payments. One page at a time, filtered and searched server-side; the metrics describe the current period.",
  })
  .roles(...PAYMENT_READ_ROLES)
  .query(QuerySchema)
  .response(200, ResponseSchema)
  .response(400, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const { page, status, method, period, q, sort } = request.query;
    const result = await container.queries.listPayments.run({
      page,
      status,
      method,
      academicPeriodId: period,
      q,
      sort,
    });
    reply.status(200).send({
      items: result.items.map((row) => ({
        ...row,
        submittedAt: row.submittedAt.toISOString(),
        decidedAt: row.decidedAt?.toISOString() ?? null,
      })),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      metrics: result.metrics,
    });
  });
