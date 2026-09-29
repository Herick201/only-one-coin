import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { container } from "@/container.js";

const ReleaseSeatHoldParamsSchema = z.object({
  holdId: z.string().uuid(),
});

// Public, like the claim: the hold id is the only credential the anonymous
// checkout has. Always 204 — whether the hold was alive, already gone or never
// existed is not something this answer reveals.
export const releaseSeatHoldRoute = RouteBuilder.post("/seat-holds/:holdId/release")
  .docs({
    tags: ["Enrollments"],
    summary: "Give a held seat back before the hold expires",
    description: "Called when the checkout moves to another class group. No-op for a hold that is no longer active.",
  })
  .public()
  .params(ReleaseSeatHoldParamsSchema)
  .response(204, z.void())
  .handler(async (request, reply) => {
    await container.useCases.enrollment.releaseSeatHold.run({ holdId: request.params.holdId });

    reply.status(204).send();
  });
