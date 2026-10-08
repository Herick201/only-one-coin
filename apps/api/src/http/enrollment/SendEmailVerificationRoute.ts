import { EmailField, HttpError, LocaleSchema, PersonNameField, UnableToProcessEntryError, refineGmail } from "@ooc/domain";
import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { RATE_LIMITS, perSeatHold } from "@/shared/http/rateLimit.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const BodySchema = z
  .object({
    holdId: z.string().uuid(),
    // The student's rules: an address, a Gmail, a username Gmail allows.
    email: EmailField,
    // Who the e-mail greets — the first name the student already typed.
    recipientName: PersonNameField,
    locale: LocaleSchema,
    captchaToken: z.string().min(1).max(2048),
  })
  .superRefine(refineGmail);

/**
 * Mails the checkout's 6-digit code (spec 2026-10-07). Public: the student
 * has no account yet. Captcha in the body because this sends e-mail to an
 * address the caller has not proven; per-IP and per-hold limits on top, and
 * the use case's own per-hold cooldown and cap. No enumeration concern: it
 * never reads `students`, and only ever writes to the address it was given.
 */
export const sendEmailVerificationRoute = RouteBuilder.post("/enrollments/email-verifications")
  .docs({ tags: ["Enrollments"], summary: "Mail the checkout's e-mail verification code" })
  .public()
  .rateLimit(RATE_LIMITS.emailVerificationSend, perSeatHold("email-verification-send", 10, "holdId"))
  .body(BodySchema)
  .response(202, z.object({ resendAfterSeconds: z.number().int() }))
  .response(400, ErrorResponseSchema)
  .response(422, ErrorResponseSchema)
  .response(429, ErrorResponseSchema)
  .response(503, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const { holdId, email, recipientName, locale, captchaToken } = request.body;

    const captcha = await container.edge.captcha.verify(captchaToken, request.clientIp);
    if (captcha === "failed") {
      throw new UnableToProcessEntryError({ reason: "captcha.failed", message: "The captcha token was refused." });
    }
    if (captcha === "unavailable") {
      throw new HttpError({ status: 503, reason: "captcha.unavailable", message: "The captcha could not be verified." });
    }

    const result = await container.useCases.enrollment.sendEmailVerification.run({
      seatHoldId: holdId,
      email,
      recipientName,
      locale,
    });
    reply.status(202).send(result);
  });
