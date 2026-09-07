import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const CompleteStaffPasswordResetBodySchema = z.object({
  token: z.string().min(1),
  // Better Auth's own floor (CLAUDE.md §8) — enforced again here since this
  // is a public route nothing else guards.
  password: z.string().min(8),
});

const CompleteStaffPasswordResetResponseSchema = z.object({
  userId: z.string(),
});

// Public — same reasoning as CompleteStaffInviteRoute: whoever is resetting a
// password has no session to authenticate this call with.
export const completeStaffPasswordResetRoute = RouteBuilder.post("/staff/password-resets/complete")
  .docs({
    tags: ["Identity"],
    summary: "Complete a password reset",
    description: "Sets the new password on the existing account and closes the link out.",
  })
  .public()
  .body(CompleteStaffPasswordResetBodySchema)
  .response(200, CompleteStaffPasswordResetResponseSchema)
  .response(404, ErrorResponseSchema)
  .response(422, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const result = await container.useCases.staff.completePasswordReset.run({
      token: request.body.token,
      password: request.body.password,
    });

    reply.status(200).send(result);
  });
