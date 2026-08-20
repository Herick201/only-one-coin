import { HttpError } from "@ooc/domain";
import type { FastifyError, FastifyInstance } from "fastify";
import fp from "fastify-plugin";

async function errorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof HttpError) {
      reply.status(error.status).send({
        status: error.status,
        reason: error.reason,
        path: error.path ?? request.url,
      });
      return;
    }

    if (error.validation) {
      reply.status(error.statusCode ?? 400).send({
        status: error.statusCode ?? 400,
        reason: "validation_error",
        path: request.url,
      });
      return;
    }

    request.log.error({ err: error, reqId: request.id }, "unhandled error");
    reply.status(500).send({
      status: 500,
      reason: "internal_error",
      errorId: request.id,
    });
  });
}

export default fp(errorHandlerPlugin);
