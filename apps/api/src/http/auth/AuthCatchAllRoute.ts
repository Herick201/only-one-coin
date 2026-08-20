import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Auth } from "@/infra/auth/betterAuth.js";

export function registerAuthRoutes(app: FastifyInstance, auth: Auth) {
  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    handler: async (request, reply) => {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const headers = fromNodeHeaders(request.headers);

      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
      });

      const response = await auth.handler(req);
      const bodyText = response.body ? await response.text() : null;

      // better-auth answers its own errors as {message, code}
      if (response.status >= 400) {
        return sendAsDomainError(reply, request, response.status, bodyText);
      }

      reply.status(response.status);
      response.headers.forEach((value, key) => reply.header(key, value));
      return reply.send(bodyText);
    },
  });
}

function sendAsDomainError(
  reply: FastifyReply,
  request: FastifyRequest,
  status: number,
  bodyText: string | null,
) {
  let code: string | undefined;
  let message: string | undefined;
  try {
    const parsed = bodyText ? (JSON.parse(bodyText) as { code?: string; message?: string }) : null;
    code = parsed?.code;
    message = parsed?.message;
  } catch {
    // better-auth always answers errors as JSON; an unparsable body falls
    // through to the 500 branch below like any other unexpected failure.
  }

  if (status >= 500 || !code) {
    request.log.error({ status, code, message, reqId: request.id }, "better-auth error");
    return reply.status(500).send({ status: 500, reason: "internal_error", errorId: request.id });
  }

  request.log.info({ status, code }, "better-auth rejected request");
  return reply.status(status).send({
    status,
    reason: `auth.${code.toLowerCase()}`,
    path: request.url,
  });
}
