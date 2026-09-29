import { EnrollmentOriginInputSchema } from "@ooc/domain";
import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const ClaimSeatHoldBodySchema = z.object({
  classGroupId: z.string().uuid(),
  // The channel the checkout was entered through, resolved by the browser on
  // first access and carried here. Closed union: anything that is not exactly
  // a known channel — including nothing at all — is `web`.
  origin: EnrollmentOriginInputSchema,
});

const ClaimSeatHoldResponseSchema = z.object({
  holdId: z.string().uuid(),
  classGroupId: z.string().uuid(),
  /** The server's deadline, for the record. */
  expiresAt: z.string(),
  /** Seconds left at the moment of answering. The checkout counts down from
   * this on its own clock, so a phone set ten minutes wrong still shows the
   * right countdown — the deadline that counts is still the server's. */
  secondsLeft: z.number().int(),
});

// Public — the checkout takes the seat before anybody has an account
// (apps/api/CLAUDE.md, "Dois relógios"). Same exposure as the submit it
// precedes: no Turnstile and no rate limit yet (docs/ROADMAP.md Sessão 25),
// so a script can lock seats for the length of a hold. Tracked, not solved,
// by this slice.
export const claimSeatHoldRoute = RouteBuilder.post("/seat-holds")
  .docs({
    tags: ["Enrollments"],
    summary: "Hold a seat while the public checkout is filled in",
    description:
      "Takes one seat from the class group and records the checkout's channel. The seat goes back automatically when the hold expires without a submit.",
  })
  .public()
  .body(ClaimSeatHoldBodySchema)
  .response(201, ClaimSeatHoldResponseSchema)
  .response(400, ErrorResponseSchema)
  .response(404, ErrorResponseSchema)
  .response(422, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const hold = await container.useCases.enrollment.claimSeatHold.run(request.body);

    reply.status(201).send({
      holdId: hold.id,
      classGroupId: hold.classGroupId,
      expiresAt: hold.expiresAt.toISOString(),
      secondsLeft: Math.max(0, Math.floor((hold.expiresAt.getTime() - Date.now()) / 1000)),
    });
  });
