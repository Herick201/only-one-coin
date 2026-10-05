import { PORTAL_SIGN_IN_SENTINEL_EMAIL } from "@ooc/domain";
import { APIError } from "better-auth/api";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app.js";
import { container } from "@/container.js";
import { describeWithoutParams } from "@/http/portal/RequestPortalPasswordResetRoute.js";
import { AUTH_SIGN_IN_BY_EMAIL, portalIdentifierKey } from "@/shared/http/rateLimit.js";

/**
 * The student portal's public routes, no database: the use cases and Better
 * Auth are stubbed. What is pinned here is the HTTP contract — above all that
 * every way of failing looks the same (CLAUDE.md §8).
 */

let app: FastifyInstance;
beforeAll(async () => {
  app = await buildApp();
});
afterAll(async () => {
  await app.close();
});
beforeEach(() => {
  // Counters must not leak between runs through a local Redis: null is the
  // limiter's own "no answer" (fail-open), so no request is ever counted here.
  vi.spyOn(container.edge.rateLimiter, "hit").mockResolvedValue(null);
});
afterEach(() => {
  vi.restoreAllMocks();
});

function stubSignIn(acceptedEmail: string, acceptedPassword: string) {
  return vi.spyOn(container.auth.api, "signInEmail").mockImplementation((async (args: { body: { email: string; password: string } }) => {
    if (args.body.email === acceptedEmail && args.body.password === acceptedPassword) {
      const headers = new Headers();
      headers.append("set-cookie", "better-auth.session_token=signed; Path=/; HttpOnly; SameSite=Lax");
      return { headers, response: {} };
    }
    throw new APIError("UNAUTHORIZED", { message: "Invalid email or password", code: "INVALID_EMAIL_OR_PASSWORD" });
  }) as never);
}

const signIn = (payload: unknown) => app.inject({ method: "POST", url: "/api/v1/portal/sign-in", payload: payload as object });

describe("POST /portal/sign-in", () => {
  it("signs a real credential in by document and hands the session cookie over", async () => {
    vi.spyOn(container.useCases.portal.resolveSignInEmail, "run").mockResolvedValue("ana@gmail.com");
    const signInSpy = stubSignIn("ana@gmail.com", "clave-segura-1");

    const response = await signIn({ method: "national_id", nationalIdType: "DNI", identifier: "12.345.678", password: "clave-segura-1" });

    expect(response.statusCode).toBe(204);
    expect([response.headers["set-cookie"]].flat().join(";")).toContain("better-auth.session_token=signed");
    expect(container.useCases.portal.resolveSignInEmail.run).toHaveBeenCalledWith({
      identifier: { method: "national_id", nationalIdType: "DNI", nationalId: "12345678" },
    });
    expect(signInSpy.mock.calls[0]![0]).toMatchObject({ body: { email: "ana@gmail.com" }, returnHeaders: true });
  });

  it.each([
    ["a wrong password", { method: "email", identifier: "ana@gmail.com", password: "otra-clave-1" }],
    ["no account", { method: "email", identifier: "nadie@gmail.com", password: "clave-segura-1" }],
    ["a malformed e-mail", { method: "email", identifier: "no-es-correo", password: "clave-segura-1" }],
    ["a document that fails its type", { method: "national_id", nationalIdType: "DNI", identifier: "12", password: "x" }],
    ["an unknown method", { method: "phone", identifier: "999999999", password: "x" }],
    ["a missing password", { method: "email", identifier: "ana@gmail.com" }],
    ["an empty body", {}],
  ])("answers %s with the one generic 401 and no cookie", async (_label, payload) => {
    vi.spyOn(container.useCases.portal.resolveSignInEmail, "run").mockImplementation(async ({ identifier }) =>
      identifier?.method === "email" && identifier.email === "ana@gmail.com" ? "ana@gmail.com" : PORTAL_SIGN_IN_SENTINEL_EMAIL,
    );
    stubSignIn("ana@gmail.com", "clave-segura-1");

    const response = await signIn(payload);

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ status: 401, reason: "auth.invalid_credentials", path: "/api/v1/portal/sign-in" });
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it.each([
    ["an array body", { payload: "[]", headers: { "content-type": "application/json" } }],
    ["a JSON null body", { payload: "null", headers: { "content-type": "application/json" } }],
    ["a JSON string body", { payload: '"x"', headers: { "content-type": "application/json" } }],
    ["no body at all", {}],
  ])("answers %s with the same 401, no cookie, and still runs the sign-in", async (_label, options) => {
    vi.spyOn(container.useCases.portal.resolveSignInEmail, "run").mockResolvedValue(PORTAL_SIGN_IN_SENTINEL_EMAIL);
    const signInSpy = stubSignIn("ana@gmail.com", "clave-segura-1");

    const response = await app.inject({ method: "POST", url: "/api/v1/portal/sign-in", ...options });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ status: 401, reason: "auth.invalid_credentials", path: "/api/v1/portal/sign-in" });
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(signInSpy).toHaveBeenCalledWith(expect.objectContaining({ body: { email: PORTAL_SIGN_IN_SENTINEL_EMAIL, password: "" } }));
  });

  it("always runs Better Auth's sign-in, even for a malformed identifier (same time spent)", async () => {
    vi.spyOn(container.useCases.portal.resolveSignInEmail, "run").mockResolvedValue(PORTAL_SIGN_IN_SENTINEL_EMAIL);
    const signInSpy = stubSignIn("ana@gmail.com", "clave-segura-1");
    await signIn({ method: "email", identifier: "no-es-correo", password: "x" });
    expect(signInSpy).toHaveBeenCalledWith(expect.objectContaining({ body: { email: PORTAL_SIGN_IN_SENTINEL_EMAIL, password: "x" } }));
  });
});

describe("portal rate-limit keys", () => {
  it("count one identifier however it is typed", () => {
    expect(portalIdentifierKey({ method: "national_id", nationalIdType: "DNI", identifier: "12.345.678" })).toBe(
      portalIdentifierKey({ method: "national_id", nationalIdType: "DNI", identifier: "12345678" }),
    );
    expect(portalIdentifierKey({ method: "email", identifier: " Ana@Gmail.com" })).toBe(portalIdentifierKey({ method: "email", identifier: "ana@gmail.com" }));
    expect(portalIdentifierKey({})).toBeNull();
  });

  it("count the catch-all's sign-in by e-mail, and nothing else there", () => {
    const key = AUTH_SIGN_IN_BY_EMAIL.by === "key" ? AUTH_SIGN_IN_BY_EMAIL.key : () => null;
    expect(key({ url: "/api/auth/sign-in/email", body: { email: "Rosa@X.com" } } as never)).toBe("rosa@x.com");
    expect(key({ url: "/api/auth/get-session", body: undefined } as never)).toBeNull();
  });
});

describe("POST /portal/password-resets/request", () => {
  const request = (payload: object) => app.inject({ method: "POST", url: "/api/v1/portal/password-resets/request", payload });

  it.each([
    ["a passed captcha", "passed", 1],
    ["a failed captcha", "failed", 0],
    ["an unavailable captcha", "unavailable", 0],
  ] as const)("answers 202 {} with %s, asking the use case only when it passed", async (_label, outcome, calls) => {
    vi.spyOn(container.edge.captcha, "verify").mockResolvedValue(outcome);
    const run = vi.spyOn(container.useCases.portal.requestPasswordReset, "run").mockResolvedValue();

    const response = await request({ method: "email", identifier: "ana@gmail.com", captchaToken: "t", locale: "pt-BR" });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({});
    expect(run).toHaveBeenCalledTimes(calls);
    if (calls) expect(run).toHaveBeenCalledWith({ identifier: { method: "email", email: "ana@gmail.com" }, locale: "pt-BR" });
  });

  it("answers a malformed identifier the same way", async () => {
    vi.spyOn(container.edge.captcha, "verify").mockResolvedValue("passed");
    vi.spyOn(container.useCases.portal.requestPasswordReset, "run").mockResolvedValue();
    const response = await request({ method: "national_id", identifier: "x", captchaToken: "t" });
    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({});
  });

  it.each([
    ["an array body", "[]"],
    ["a JSON null body", "null"],
    ["a JSON string body", '"x"'],
  ])("answers %s with 202 {} too", async (_label, payload) => {
    vi.spyOn(container.edge.captcha, "verify").mockResolvedValue("passed");
    vi.spyOn(container.useCases.portal.requestPasswordReset, "run").mockResolvedValue();
    const response = await app.inject({ method: "POST", url: "/api/v1/portal/password-resets/request", payload, headers: { "content-type": "application/json" } });
    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({});
  });

  it.each([
    ["the use case", "run"],
    ["the captcha check", "verify"],
  ] as const)("still answers 202 {} when %s throws", async (_label, which) => {
    const verify = vi.spyOn(container.edge.captcha, "verify");
    const run = vi.spyOn(container.useCases.portal.requestPasswordReset, "run");
    if (which === "verify") {
      verify.mockRejectedValue(new Error("network down"));
    } else {
      verify.mockResolvedValue("passed");
      run.mockRejectedValue(new Error("Failed query: select ...\nparams: ana@gmail.com"));
    }

    const response = await request({ method: "email", identifier: "ana@gmail.com", captchaToken: "t" });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({});
    if (which === "run") expect(run).toHaveBeenCalledTimes(1);
  });

  it("logs a failure by its name and driver codes, never its message", () => {
    const failure = new Error("Failed query: select ...\nparams: ana@gmail.com", {
      cause: Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }),
    });
    const described = describeWithoutParams(failure);
    expect(described).toEqual({ name: "Error", codes: ["ECONNREFUSED"] });
    expect(JSON.stringify(described)).not.toContain("ana@gmail.com");
  });
});

describe("portal access links", () => {
  it("say whether a link is usable, nothing about whose it is", async () => {
    vi.spyOn(container.repositories.portalAccess, "findToken").mockResolvedValue({
      id: "tok_1",
      userId: "usr_ana",
      purpose: "activation",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    });
    const response = await app.inject({ method: "GET", url: "/api/v1/portal/access-tokens/abc" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ state: "valid", purpose: "activation" });
  });

  it("answers an unknown link as expired_or_used", async () => {
    vi.spyOn(container.repositories.portalAccess, "findToken").mockResolvedValue(null);
    const response = await app.inject({ method: "GET", url: "/api/v1/portal/access-tokens/abc" });
    expect(response.json()).toEqual({ state: "expired_or_used", purpose: null });
  });

  it("complete hands the password to the use case", async () => {
    const run = vi.spyOn(container.useCases.portal.completeAccess, "run").mockResolvedValue({ userId: "usr_ana", purpose: "reset" });
    const response = await app.inject({ method: "POST", url: "/api/v1/portal/access-tokens/abc/complete", payload: { password: "nueva-clave-1" } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ purpose: "reset" });
    expect(run).toHaveBeenCalledWith({ token: "abc", password: "nueva-clave-1" });
  });
});
