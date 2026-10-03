import { z } from "zod";
import { DEFAULT_LOCALE, LocaleSchema } from "@ooc/domain";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { RATE_LIMITS } from "@/shared/http/rateLimit.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const RequestStaffPasswordResetBodySchema = z.object({
  email: z.string().trim().max(254).email(),
  // The language of the login screen — the e-mail goes out in it.
  locale: LocaleSchema.default(DEFAULT_LOCALE),
});

const RequestStaffPasswordResetResponseSchema = z.object({});

// Public — whoever asks for this cannot sign in. 202 with an empty body on
// every path, whether or not the address belongs to a panel account
// (CLAUDE.md §8, anti-enumeration): the use case returns nothing for the
// handler to branch on. The e-mail itself leaves through the outbox, never
// from this request. No rate limit yet (docs/ROADMAP.md Sessão 25); the use
// case's per-account cooldown is what stands in for it on the inbox side.
export const requestStaffPasswordResetRoute = RouteBuilder.post("/staff/password-resets/request")
  .docs({
    tags: ["Identity"],
    summary: "Ask for a password-reset link by e-mail",
    description:
      "Backs \"Forgot my password\" on the panel's login. Same 202 whether or not the address has a panel account.",
  })
  .public()
  .rateLimit(RATE_LIMITS.staffResetRequest)
  .body(RequestStaffPasswordResetBodySchema)
  .response(202, RequestStaffPasswordResetResponseSchema)
  .response(400, ErrorResponseSchema)
  .handler(async (request, reply) => {
    await container.useCases.staff.requestPasswordReset.run({
      email: request.body.email,
      locale: request.body.locale,
    });

    reply.status(202).send({});
  });
