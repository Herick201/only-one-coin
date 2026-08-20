import { randomUUID } from "node:crypto";
import fastify, { type FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import errorHandlerPlugin from "@/infra/plugins/errorHandler.js";
import swaggerPlugin from "@/infra/plugins/swagger.js";
import { mergeAuthIntoSwagger } from "@/infra/plugins/authSwagger.js";
import { rootRoute } from "@/http/RootRoute.js";
import { healthCheckRoute } from "@/http/HealthCheckRoute.js";
import { createExampleRoute } from "@/http/example/CreateExampleRoute.js";
import { registerAuthRoutes } from "@/http/auth/AuthCatchAllRoute.js";
import { container } from "@/container.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({ loggerInstance: container.logger, genReqId: () => randomUUID() });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(errorHandlerPlugin);

  if (!container.production) {
    await app.register(swaggerPlugin);
    await mergeAuthIntoSwagger(app, container.auth);
  }

  app.after(() => {
    const provider = app.withTypeProvider<ZodTypeProvider>();

    // common routes
    provider.route(rootRoute);
    provider.route(healthCheckRoute);

    // auth routes
    registerAuthRoutes(app, container.auth);

    // api routes, prefixed with /api/v1
    provider.register(
      (instance, _opts, done) => {
        instance.withTypeProvider<ZodTypeProvider>().route(createExampleRoute);
        done();
      },
      { prefix: "/api/v1" },
    );
  });

  await app.ready();

  return app;
}
