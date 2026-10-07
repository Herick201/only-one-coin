import type { FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";
import { redactTokenPaths, serializeRequest } from "./logger.js";

describe("redactTokenPaths", () => {
  it.each([
    ["/api/v1/portal/access-tokens/abcDEF_123-x", "/api/v1/portal/access-tokens/[redacted]"],
    ["/api/v1/portal/access-tokens/abcDEF_123-x/complete", "/api/v1/portal/access-tokens/[redacted]/complete"],
    ["/api/v1/portal/access-tokens/abc?x=1", "/api/v1/portal/access-tokens/[redacted]?x=1"],
    ["/api/v1/staff/invites/tok3n", "/api/v1/staff/invites/[redacted]"],
    ["/api/v1/staff/password-resets/tok3n", "/api/v1/staff/password-resets/[redacted]"],
    ["/api/v1/staff/password-resets/tok3n?lang=en", "/api/v1/staff/password-resets/[redacted]?lang=en"],
  ])("hides the token in %s", (url, expected) => {
    expect(redactTokenPaths(url)).toBe(expected);
  });

  it.each([
    "/api/v1/staff/invites",
    "/api/v1/staff/invites/complete",
    "/api/v1/staff/password-resets/request",
    "/api/v1/staff/password-resets/complete",
    "/api/v1/staff/invites/018f2b5c-4000-7000-8000-000000000001/cancel",
    "/api/v1/staff/password-resets/018f2b5c-4000-7000-8000-000000000001/renew",
    "/api/v1/portal/password-resets/request",
    "/api/v1/catalog",
  ])("leaves %s readable", (url) => {
    expect(redactTokenPaths(url)).toBe(url);
  });
});

describe("serializeRequest", () => {
  it("logs what Fastify logs, with the token redacted", () => {
    const req = {
      method: "GET",
      url: "/api/v1/portal/access-tokens/secret-token",
      headers: {},
      host: "api.test",
      ip: "127.0.0.1",
      socket: { remotePort: 4321 },
    } as unknown as FastifyRequest;

    expect(serializeRequest(req)).toEqual({
      method: "GET",
      url: "/api/v1/portal/access-tokens/[redacted]",
      version: undefined,
      host: "api.test",
      remoteAddress: "127.0.0.1",
      remotePort: 4321,
    });
  });
});
