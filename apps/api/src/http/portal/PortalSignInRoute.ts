import { UnauthorizedError, parsePortalIdentifier } from "@ooc/domain";
import { APIError } from "better-auth/api";
import { fromNodeHeaders } from "better-auth/node";
import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { RATE_LIMITS, perPortalIdentifier } from "@/shared/http/rateLimit.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const MINUTE = 60;

// Loose on purpose: a strict schema would answer a malformed field with a 400
// naming it. Everything is read inside the handler and every failure is the
// same 401 (CLAUDE.md §8).
const PortalSignInBodySchema = z.object({}).passthrough();

function invalidCredentials(path: string): UnauthorizedError {
  return new UnauthorizedError({ reason: "auth.invalid_credentials", message: "Portal sign-in refused.", path });
}

/**
 * The student portal's sign-in (spec 2026-10-05 §3). Either door — e-mail or
 * document — is resolved to the account's address on the server, and Better
 * Auth does the rest: the password check (hashing even when there is no
 * account), the session and the signed cookie. Staff accounts are not found
 * here (only `student` accounts with a file behind them are), so the panel's
 * people cannot use this door.
 */
export const portalSignInRoute = RouteBuilder.post("/portal/sign-in")
  .docs({
    tags: ["Portal"],
    summary: "Sign a student in by e-mail or document",
    description: "204 with the session cookie, or the one generic 401 for every failure.",
  })
  .public()
  .rateLimit(RATE_LIMITS.portalSignIn, perPortalIdentifier("portal-sign-in", 10, 15 * MINUTE))
  .body(PortalSignInBodySchema)
  .response(204, z.null())
  .response(401, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const identifier = parsePortalIdentifier(body);
    const password = typeof body.password === "string" ? body.password : "";
    const email = await container.useCases.portal.resolveSignInEmail.run({ identifier });

    try {
      const { headers } = await container.auth.api.signInEmail({
        body: { email, password },
        headers: fromNodeHeaders(request.headers),
        returnHeaders: true,
      });
      reply.header("set-cookie", headers.getSetCookie());
      reply.status(204).send();
    } catch (error) {
      if (error instanceof APIError) throw invalidCredentials(request.url);
      throw error;
    }
  });
