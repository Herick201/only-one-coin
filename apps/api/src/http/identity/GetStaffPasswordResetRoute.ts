import { z } from "zod";
import { NotFoundError } from "@ooc/domain";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const GetStaffPasswordResetParamsSchema = z.object({
  token: z.string().min(1),
});

const GetStaffPasswordResetResponseSchema = z.object({
  name: z.string(),
  email: z.string(),
  status: z.enum(["pending", "completed", "cancelled"]),
  expiresAt: z.string(),
});

// Public — same reasoning as GetStaffInviteRoute: whoever opens this link has
// no session (they are here because they cannot sign in).
export const getStaffPasswordResetRoute = RouteBuilder.get("/staff/password-resets/:token")
  .docs({
    tags: ["Identity"],
    summary: "Resolve a password-reset link by its token",
    description: "Backs /backoffice/reset-password/[token] before it renders the form.",
  })
  .public()
  .params(GetStaffPasswordResetParamsSchema)
  .response(200, GetStaffPasswordResetResponseSchema)
  .response(404, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const reset = await container.repositories.staffPasswordReset.findByToken(request.params.token);
    if (!reset) {
      throw new NotFoundError({
        reason: "staff_password_reset.not_found",
        message: "No password reset with this token.",
        path: request.url,
      });
    }

    const display = await container.identity.staffUserLookup.findDisplayByUserId(reset.userId);
    if (!display) {
      // The account behind this link is gone — same answer as a token that
      // never existed, not a 500: nothing left here to reset.
      throw new NotFoundError({
        reason: "staff_password_reset.not_found",
        message: "No account behind this password reset.",
        path: request.url,
      });
    }

    reply.status(200).send({
      name: display.name,
      email: display.email,
      status: reset.status,
      expiresAt: reset.expiresAt.toISOString(),
    });
  });
