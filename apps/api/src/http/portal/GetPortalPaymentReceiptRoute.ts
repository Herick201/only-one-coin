import { NotFoundError } from "@ooc/domain";
import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

/**
 * The student's own receipt, as a 5-minute URL (CLAUDE.md §8) — the same
 * query and the same `payment.receipt_viewed` audit line as the backoffice's
 * `GET /payments/:id/receipt`, behind an ownership check first. A payment
 * that is someone else's answers exactly like one that does not exist
 * (anti-IDOR): the id from the URL is never the authorization.
 */
export const getPortalPaymentReceiptRoute = RouteBuilder.get("/portal/payments/:id/receipt")
  .docs({
    tags: ["Portal"],
    summary: "Get a 5-minute URL for one of the student's own receipts",
    description: "Every call is written to the audit log.",
  })
  .roles("student")
  .params(z.object({ id: z.string().uuid() }))
  .response(200, z.object({ url: z.string().url(), expiresAt: z.string() }))
  .response(404, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const userId = request.currentUser!.id;
    const owns = await container.queries.studentPortal.ownsPayment(userId, request.params.id);
    if (!owns) {
      throw new NotFoundError({ reason: "payment.receipt_not_found", message: "The payment has no processed receipt.", path: request.url });
    }
    const result = await container.queries.paymentReceiptImage.run({ paymentId: request.params.id, actorId: userId });
    reply.status(200).send({ url: result.url, expiresAt: result.expiresAt.toISOString() });
  });
