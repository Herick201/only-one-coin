import { EmailField } from "@ooc/domain";
import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { RATE_LIMITS, perSeatHold } from "@/shared/http/rateLimit.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const BodySchema = z.object({
  holdId: z.string().uuid(),
  email: EmailField,
  code: z.string().regex(/^\d{6}$/),
});

/**
 * Checks the typed code (spec 2026-10-07). No captcha: five attempts per code
 * and the per-hold limit already cap a guess far below the million codes.
 */
export const confirmEmailVerificationRoute = RouteBuilder.post("/enrollments/email-verifications/confirm")
  .docs({ tags: ["Enrollments"], summary: "Confirm the checkout's e-mail verification code" })
  .public()
  .rateLimit(RATE_LIMITS.emailVerificationConfirm, perSeatHold("email-verification-confirm", 30, "holdId"))
  .body(BodySchema)
  .response(200, z.object({ verified: z.literal(true) }))
  .response(400, ErrorResponseSchema)
  .response(422, ErrorResponseSchema)
  .response(429, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const { holdId, email, code } = request.body;
    await container.useCases.enrollment.confirmEmailVerification.run({ seatHoldId: holdId, email, code });
    reply.status(200).send({ verified: true });
  });
