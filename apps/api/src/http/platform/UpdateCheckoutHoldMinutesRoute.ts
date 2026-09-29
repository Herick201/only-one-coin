import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const UpdateCheckoutHoldMinutesBodySchema = z.object({
  // Bounds are the usecase's (CheckoutHoldMinutesSchema) and the database's;
  // here only the shape.
  minutes: z.number().int(),
});

const UpdateCheckoutHoldMinutesResponseSchema = z.object({
  checkoutHoldMinutes: z.number().int(),
});

/**
 * How long the public checkout holds a seat (apps/api/CLAUDE.md, "Dois
 * relógios"). Management only, like the rest of the settings screen. Applies
 * to holds claimed after the change; writes audit_log.
 */
export const updateCheckoutHoldMinutesRoute = RouteBuilder.put("/settings/checkout-hold")
  .docs({
    tags: ["Platform"],
    summary: "Change the checkout seat hold, in minutes",
    description: "Applies to holds claimed from now on. Writes audit_log.",
  })
  .roles("master", "admin")
  .body(UpdateCheckoutHoldMinutesBodySchema)
  .response(200, UpdateCheckoutHoldMinutesResponseSchema)
  .response(401, ErrorResponseSchema)
  .response(403, ErrorResponseSchema)
  .response(422, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const result = await container.useCases.platform.updateCheckoutHoldMinutes.run({
      actorId: request.currentUser!.id,
      minutes: request.body.minutes,
    });

    reply.status(200).send(result);
  });
