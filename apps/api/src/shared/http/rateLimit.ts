import type { FastifyRequest } from "fastify";

/**
 * One counter a route spends from. Rules sharing a `name` share the counter —
 * that is how every staff route draws on one per-user budget.
 *
 * - `ip`: the caller's IP (infra/edge/clientIp.ts). Counted in `onRequest`,
 *   before the body is parsed or the session is looked up — a burst never
 *   reaches Postgres.
 * - `user`: the authenticated staff account. Counted after authorization.
 * - `key`: anything the route names off the validated request — the
 *   checkout's seat hold is its session (OOC-24, "por sessão"). Counted after
 *   validation; a request without the key skips the rule.
 */
export type RateLimitRule = {
  name: string;
  limit: number;
  windowSeconds: number;
} & (
  | { by: "ip" }
  | { by: "user" }
  | { by: "key"; key: (request: FastifyRequest) => string | null | undefined }
);

const MINUTE = 60;

/**
 * The numbers are provisional — a first guess sized on two facts, to be
 * revised with what production shows (the 429s are logged with the rule
 * name). Per-IP ceilings are loose on purpose: a school lab or a cabina puts
 * thirty students behind one address, and the captcha, not the IP count, is
 * what stops a script on the submit. Per-hold ceilings are tight: one person
 * fills one checkout.
 */
export const RATE_LIMITS = {
  /** Every staff route, per account. Default of `.roles()`/`.owners()`. */
  staff: { name: "staff", by: "user", limit: 600, windowSeconds: 5 * MINUTE },

  /** Better Auth's catch-all: sign-in, sign-out, session refresh. */
  auth: { name: "auth:ip", by: "ip", limit: 60, windowSeconds: 5 * MINUTE },
  /** Liveness probes and the root banner. */
  probe: { name: "probe:ip", by: "ip", limit: 120, windowSeconds: MINUTE },
  /** Public reads rendered on every page (catalog, feature-flag state). */
  publicRead: { name: "public-read:ip", by: "ip", limit: 600, windowSeconds: 5 * MINUTE },
  /** The staff invite and password-reset links, read and completed. */
  staffLink: { name: "staff-link:ip", by: "ip", limit: 30, windowSeconds: 10 * MINUTE },
  /** "Forgot my password" — sends an e-mail. */
  staffResetRequest: { name: "staff-reset-request:ip", by: "ip", limit: 10, windowSeconds: 10 * MINUTE },

  /** Checkout: taking and handing back a seat. */
  seatHold: { name: "seat-hold:ip", by: "ip", limit: 60, windowSeconds: 10 * MINUTE },
  /** Checkout: minting and confirming the receipt upload. */
  receiptUpload: { name: "receipt-upload:ip", by: "ip", limit: 60, windowSeconds: 10 * MINUTE },
  /** Checkout: the submit. */
  enrollmentSubmit: { name: "enrollment-submit:ip", by: "ip", limit: 60, windowSeconds: 10 * MINUTE },
} as const satisfies Record<string, RateLimitRule>;

/**
 * The checkout's per-session ceiling: a rule keyed on the seat hold the
 * request body names in `field` — the hold is the only id a checkout has
 * before the submit, so it is its session.
 */
export function perSeatHold(name: string, limit: number, field: string): RateLimitRule {
  return {
    name: `${name}:hold`,
    by: "key",
    key: (request: FastifyRequest) => {
      const value = (request.body as Record<string, unknown> | undefined)?.[field];
      return typeof value === "string" ? value : null;
    },
    limit,
    windowSeconds: 10 * MINUTE,
  };
}
