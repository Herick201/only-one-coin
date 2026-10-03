import { HttpError, InvalidFieldsError, toFieldErrors } from "@ooc/domain";
import type { FastifyError, FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";

async function errorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof HttpError) {
      reply.status(error.status).send({
        status: error.status,
        reason: error.reason,
        path: error.path ?? request.url,
        ...(error instanceof InvalidFieldsError ? { fields: error.fields } : {}),
      });
      return;
    }

    if (error.validation) {
      reply.status(error.statusCode ?? 400).send({
        status: error.statusCode ?? 400,
        reason: "validation_error",
        path: request.url,
        // Body fields only — a bad query string or path param is a client
        // bug with nothing for a person to fix.
        ...(hasZodFastifySchemaValidationErrors(error) && error.validationContext === "body"
          ? { fields: toFieldErrors(error.validation.map((item) => item.params.issue)) }
          : {}),
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
