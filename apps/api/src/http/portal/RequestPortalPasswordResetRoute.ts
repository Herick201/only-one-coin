import { DEFAULT_LOCALE, LocaleSchema, parsePortalIdentifier } from "@ooc/domain";
import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { RATE_LIMITS, perPortalIdentifier } from "@/shared/http/rateLimit.js";
import { container } from "@/container.js";

const HOUR = 3600;

// Loose on purpose, like the sign-in: no field is ever named back, so a
// malformed body (array, null, string) gets the same 202 as a good one.
const BodySchema = z.unknown();

/**
 * Student "forgot my password" (spec 2026-10-05 §4). 202 with an empty body on
 * every path — account or not, captcha passed or not. The captcha sits here
 * because this route sends e-mail to an address the caller does not prove to
 * own; a refused or unverifiable captcha just sends nothing.
 */
export const requestPortalPasswordResetRoute = RouteBuilder.post("/portal/password-resets/request")
  .docs({ tags: ["Portal"], summary: "Ask for a portal password link by e-mail", description: "Same 202 whatever happens." })
  .public()
  .rateLimit(RATE_LIMITS.portalResetRequest, perPortalIdentifier("portal-reset-request", 3, HOUR))
  .body(BodySchema)
  .response(202, z.object({}))
  .handler(async (request, reply) => {
    const body =
      typeof request.body === "object" && request.body !== null && !Array.isArray(request.body)
        ? (request.body as Record<string, unknown>)
        : {};
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken : "";
    const locale = LocaleSchema.catch(DEFAULT_LOCALE).parse(body.locale);

    const captcha = captchaToken ? await container.edge.captcha.verify(captchaToken, request.clientIp) : "failed";
    if (captcha === "passed") {
      await container.useCases.portal.requestPasswordReset.run({ identifier: parsePortalIdentifier(body), locale });
    } else {
      request.log.info({ captcha }, "portal reset request without a passed captcha");
    }

    reply.status(202).send({});
  });
