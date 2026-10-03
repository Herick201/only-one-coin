import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "@/app.js";

/**
 * CI gate §6.5 for the account screen's password routes: every staff cargo
 * may call them, so the case to refuse is no session at all. No database —
 * the authorization hook answers before the handler runs.
 */

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
});

describe("own-password routes refuse a request without a session", () => {
  it.each([
    ["GET", "/api/v1/me/password"],
    ["POST", "/api/v1/me/password"],
  ])("%s %s → 401", async (method, url) => {
    const response = await app.inject({
      method: method as "GET",
      url,
      payload: method === "GET" ? undefined : { currentPassword: "x", newPassword: "y" },
    });

    expect(response.statusCode).toBe(401);
  });
});
