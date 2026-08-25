import fastify, { type FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@ooc/domain";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import authorizationPlugin from "@/infra/plugins/authorization.js";
import errorHandlerPlugin from "@/infra/plugins/errorHandler.js";
import { SESSION_COOKIE_NAME } from "@/infra/auth/betterAuth.js";
import { container } from "@/container.js";
import { buildApp } from "@/app.js";

async function buildTestApp(): Promise<FastifyInstance> {
  const app = fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(errorHandlerPlugin);
  await app.register(authorizationPlugin);

  const provider = app.withTypeProvider<ZodTypeProvider>();

  provider.route(
    RouteBuilder.get("/coordinator-only")
      .roles("coordinator", "admin")
      .response(200, z.object({ ok: z.boolean() }))
      .handler(async (_request, reply) => {
        reply.send({ ok: true });
      }),
  );

  provider.route(
    RouteBuilder.get("/open")
      .public()
      .response(200, z.object({ ok: z.boolean() }))
      .handler(async (_request, reply) => {
        reply.send({ ok: true });
      }),
  );

  await app.ready();
  return app;
}

describe("authorization plugin", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fails app boot when a route declares neither .roles() nor .public()", async () => {
    const app = fastify();
    await app.register(errorHandlerPlugin);
    await app.register(authorizationPlugin);

    const provider = app.withTypeProvider<ZodTypeProvider>();

    expect(() =>
      provider.route(
        RouteBuilder.get("/missing-auth-declaration")
          .response(200, z.object({ ok: z.boolean() }))
          .handler(async (_request, reply) => reply.send({ ok: true })),
      ),
    ).toThrow(/missing an auth declaration/);
  });

  it("the real app boots successfully (every registered route declared auth)", async () => {
    const app = await buildApp();
    await app.close();
  });

  it("rejects a role-gated route with no session cookie", async () => {
    const app = await buildTestApp();
    const response = await app.inject({ method: "GET", url: "/coordinator-only" });
    expect(response.statusCode).toBe(401);
  });

  it("rejects a role-gated route when the session belongs to the wrong role", async () => {
    const app = await buildTestApp();
    const treasuryUser: AuthenticatedUser = { id: "u1", email: "t@example.com", role: "treasury" };
    vi.spyOn(container.identity.currentSession, "resolve").mockResolvedValue(treasuryUser);

    const response = await app.inject({
      method: "GET",
      url: "/coordinator-only",
      cookies: { [SESSION_COOKIE_NAME]: "some-valid-token" },
    });

    expect(response.statusCode).toBe(403);
  });

  it("allows a role-gated route when the session role is in the allowed list", async () => {
    const app = await buildTestApp();
    const coordinatorUser: AuthenticatedUser = { id: "u2", email: "c@example.com", role: "coordinator" };
    vi.spyOn(container.identity.currentSession, "resolve").mockResolvedValue(coordinatorUser);

    const response = await app.inject({
      method: "GET",
      url: "/coordinator-only",
      cookies: { [SESSION_COOKIE_NAME]: "some-valid-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });

  it("never checks the session for a .public() route", async () => {
    const app = await buildTestApp();
    const resolveSpy = vi.spyOn(container.identity.currentSession, "resolve");

    const response = await app.inject({ method: "GET", url: "/open" });

    expect(response.statusCode).toBe(200);
    expect(resolveSpy).not.toHaveBeenCalled();
  });
});
