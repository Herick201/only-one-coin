import { DEFAULT_LOCALE, LocaleSchema, parsePortalIdentifier } from "@ooc/domain";
import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { RATE_LIMITS, perPortalIdentifier } from "@/shared/http/rateLimit.js";
import { container } from "@/container.js";

const HOUR = 3600;

// Loose on purpose, like the sign-in: no field is ever named back, so a
// malformed body (array, null, string) gets the same 202 as a good one.
const BodySchema = z.unknown();

/** The error's type and driver code along its cause chain — never a message. */
export function describeWithoutParams(error: unknown): { name: string; codes: string[] } {
  const codes: string[] = [];
  for (let current: unknown = error, depth = 0; current && depth < 4; depth += 1) {
    const code = typeof current === "object" ? (current as { code?: unknown }).code : undefined;
    if (typeof code === "string") codes.push(code);
    current = typeof current === "object" ? (current as { cause?: unknown }).cause : undefined;
  }
  return { name: error instanceof Error ? error.name : typeof error, codes };
}

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

    // A failure here (database down) only happens once an account was found,
    // so letting it become a 500 would answer "this identifier exists". It is
    // logged and the caller gets the same 202. Only the error's name and code
    // go to the log: a drizzle query error's message carries the query params,
    // and those are the identifier.
    try {
      const captcha = captchaToken ? await container.edge.captcha.verify(captchaToken, request.clientIp) : "failed";
      if (captcha === "passed") {
        await container.useCases.portal.requestPasswordReset.run({ identifier: parsePortalIdentifier(body), locale });
      } else {
        request.log.info({ captcha }, "portal reset request without a passed captcha");
      }
    } catch (error) {
      request.log.error({ err: describeWithoutParams(error) }, "portal reset request failed");
    }

    reply.status(202).send({});
  });
