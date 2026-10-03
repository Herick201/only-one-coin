import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const BodySchema = z.object({
  // Bounds are the usecase's (ReceiptRejectBelowPercentSchema) and the
  // database's; here only the shape.
  percent: z.number().int(),
});

const ResponseSchema = z.object({
  receiptRejectBelowPercent: z.number().int(),
});

/**
 * Below which percentage of the expected amount the traffic light suggests
 * rejecting (OOC-21). Management only. Applies to the next validation;
 * writes audit_log.
 */
export const updateReceiptRejectBelowPercentRoute = RouteBuilder.put("/settings/receipt-reject-below")
  .docs({
    tags: ["Platform"],
    summary: "Change the percentage below which rejection is suggested",
    description: "Suggested only — a person still rejects. Applies to the next validation. Writes audit_log.",
  })
  .roles("master", "admin")
  .body(BodySchema)
  .response(200, ResponseSchema)
  .response(401, ErrorResponseSchema)
  .response(403, ErrorResponseSchema)
  .response(422, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const result = await container.useCases.platform.updateReceiptRejectBelowPercent.run({
      actorId: request.currentUser!.id,
      percent: request.body.percent,
    });

    reply.status(200).send(result);
  });
