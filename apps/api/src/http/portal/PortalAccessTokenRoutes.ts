import { hashPortalToken } from "@ooc/domain";
import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { RATE_LIMITS } from "@/shared/http/rateLimit.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const ParamsSchema = z.object({ token: z.string().min(1).max(128) });
const PurposeSchema = z.enum(["activation", "reset"]);

// Public — whoever opens this link has no session; that is why they are here.
// Says only whether the link works and what it is for: no name, no e-mail.
export const getPortalAccessTokenRoute = RouteBuilder.get("/portal/access-tokens/:token")
  .docs({ tags: ["Portal"], summary: "Check a portal access link", description: "Backs /access/[token] before the form renders." })
  .public()
  .rateLimit(RATE_LIMITS.portalLink)
  .params(ParamsSchema)
  .response(200, z.object({ state: z.enum(["valid", "expired_or_used"]), purpose: PurposeSchema.nullable() }))
  .handler(async (request, reply) => {
    const token = await container.repositories.portalAccess.findToken(hashPortalToken(request.params.token));
    if (token && token.usedAt === null && token.expiresAt.getTime() > Date.now()) {
      reply.status(200).send({ state: "valid", purpose: token.purpose });
      return;
    }
    reply.status(200).send({ state: "expired_or_used", purpose: null });
  });

export const completePortalAccessTokenRoute = RouteBuilder.post("/portal/access-tokens/:token/complete")
  .docs({ tags: ["Portal"], summary: "Set the portal password from a link", description: "Activation and reset alike." })
  .public()
  .rateLimit(RATE_LIMITS.portalLink)
  .params(ParamsSchema)
  .body(z.object({ password: z.string().max(256) }))
  .response(200, z.object({ purpose: PurposeSchema }))
  .response(410, ErrorResponseSchema)
  .response(422, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const result = await container.useCases.portal.completeAccess.run({ token: request.params.token, password: request.body.password });
    reply.status(200).send({ purpose: result.purpose });
  });
