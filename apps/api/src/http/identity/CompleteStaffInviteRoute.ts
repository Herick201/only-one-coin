import { z } from "zod";
import { meetsStaffPasswordPolicy } from "@ooc/domain";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { RATE_LIMITS } from "@/shared/http/rateLimit.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const CompleteStaffInviteBodySchema = z.object({
  token: z.string().min(1),
  // The panel's own floor (StaffPasswordPolicy) — the same rule the account
  // screen applies; Better Auth's 8 is lower and would let a weak one through.
  password: z.string().max(128).refine(meetsStaffPasswordPolicy, "weak_password"),
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
  .rateLimit(RATE_LIMITS.staffLink)
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
