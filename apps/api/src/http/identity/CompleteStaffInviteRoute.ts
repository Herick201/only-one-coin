import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const CompleteStaffInviteBodySchema = z.object({
  token: z.string().min(1),
  // Better Auth's own floor (CLAUDE.md §8, seed-admin.ts) — enforced again
  // here since this is a public route nothing else guards.
  password: z.string().min(8),
});

const CompleteStaffInviteResponseSchema = z.object({
  userId: z.string(),
  email: z.string(),
});

// Public — same reasoning as GetStaffInviteRoute: the person completing an
// invite has no session to authenticate this call with.
export const completeStaffInviteRoute = RouteBuilder.post("/staff/invites/complete")
  .docs({
    tags: ["Identity"],
    summary: "Complete an invite — creates the real account",
    description: "The invitee's own password, chosen here — nobody else ever holds it (CLAUDE.md §8).",
  })
  .public()
  .body(CompleteStaffInviteBodySchema)
  .response(201, CompleteStaffInviteResponseSchema)
  .response(404, ErrorResponseSchema)
  .response(422, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const result = await container.useCases.staff.completeInvite.run({
      token: request.body.token,
      password: request.body.password,
    });

    reply.status(201).send(result);
  });
