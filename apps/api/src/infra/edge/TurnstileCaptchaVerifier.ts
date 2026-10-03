import type { FastifyBaseLogger } from "fastify";
import { z } from "zod";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 5_000;

export type CaptchaOutcome = "passed" | "failed" | "unavailable";

export interface CaptchaVerifier {
  verify(token: string, remoteIp: string | null): Promise<CaptchaOutcome>;
}

const SiteverifyResponseSchema = z.object({
  success: z.boolean(),
  "error-codes": z.array(z.string()).default([]),
});

/**
 * Cloudflare Turnstile, server side (CLAUDE.md §3). A token is single-use and
 * lives five minutes: a resend with the same token is `timeout-or-duplicate`,
 * so the checkout resets the widget after every attempt it sent.
 *
 * Cloudflare unreachable is `unavailable`, not `passed`: the route refuses
 * (503) rather than open the door while the captcha is down.
 */
export class TurnstileCaptchaVerifier implements CaptchaVerifier {
  constructor(
    private readonly secret: string,
    private readonly logger: FastifyBaseLogger,
  ) {}

  async verify(token: string, remoteIp: string | null): Promise<CaptchaOutcome> {
    const form = new URLSearchParams({ secret: this.secret, response: token });
    if (remoteIp) {
      form.set("remoteip", remoteIp);
    }

    let body: unknown;
    try {
      const response = await fetch(SITEVERIFY_URL, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        this.logger.error({ status: response.status }, "turnstile siteverify answered an error");
        return "unavailable";
      }
      body = await response.json();
    } catch (err) {
      this.logger.error({ err }, "turnstile siteverify unreachable");
      return "unavailable";
    }

    const parsed = SiteverifyResponseSchema.safeParse(body);
    if (!parsed.success) {
      this.logger.error("turnstile siteverify answered an unexpected shape");
      return "unavailable";
    }
    if (!parsed.data.success) {
      // Cloudflare's codes only (`invalid-input-response`, `timeout-or-duplicate`…) — never the token.
      this.logger.warn({ errorCodes: parsed.data["error-codes"] }, "turnstile token refused");
      return "failed";
    }
    return "passed";
  }
}
