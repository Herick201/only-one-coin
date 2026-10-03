import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const BodySchema = z.object({
  // Bounds are the usecase's (ReceiptAmountToleranceCentsSchema) and the
  // database's; here only the shape.
  cents: z.number().int(),
});

const ResponseSchema = z.object({
  receiptAmountToleranceCents: z.number().int(),
});

/**
 * How far above the plan price a receipt is still green (OOC-21).
 * Management only, like the rest of the settings screen. Applies to the next
 * validation; writes audit_log.
 */
export const updateReceiptAmountToleranceRoute = RouteBuilder.put("/settings/receipt-amount-tolerance")
  .docs({
    tags: ["Platform"],
    summary: "Change the receipt amount tolerance, in cents",
    description: "Above the expected amount only. Applies to the next validation. Writes audit_log.",
  })
  .roles("master", "admin")
  .body(BodySchema)
  .response(200, ResponseSchema)
  .response(401, ErrorResponseSchema)
  .response(403, ErrorResponseSchema)
  .response(422, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const result = await container.useCases.platform.updateReceiptAmountTolerance.run({
      actorId: request.currentUser!.id,
      cents: request.body.cents,
    });

    reply.status(200).send(result);
  });
