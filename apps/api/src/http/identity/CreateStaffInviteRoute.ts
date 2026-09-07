import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const CreateStaffInviteBodySchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().email(),
  role: z.enum(["admin", "coordinator", "treasury", "mass_approver", "teacher"]),
});

const CreateStaffInviteResponseSchema = z.object({
  inviteId: z.string(),
  token: z.string(),
  expiresAt: z.string(),
});

// Admin-only — opening a panel account is the surface the anti-escalation
// rule gives to admin alone (CLAUDE.md §8). No password collected here: the
// invite link is the whole point.
export const createStaffInviteRoute = RouteBuilder.post("/staff/invites")
  .docs({
    tags: ["Identity"],
    summary: "Invite somebody to the panel",
    description: "Generates a one-time invite link — the person completes their own registration.",
  })
  .roles("admin")
  .body(CreateStaffInviteBodySchema)
  .response(201, CreateStaffInviteResponseSchema)
  .response(422, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const actorId = request.currentUser!.id;

    const { invite } = await container.useCases.staff.createInvite.run({
      actorId,
      email: request.body.email,
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      role: request.body.role,
    });

    reply.status(201).send({
      inviteId: invite.id,
      token: invite.token,
      expiresAt: invite.expiresAt.toISOString(),
    });
  });
