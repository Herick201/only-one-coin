import { randomUUID } from "node:crypto";
import fastify, { type FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import errorHandlerPlugin from "@/infra/plugins/errorHandler.js";
import authorizationPlugin from "@/infra/plugins/authorization.js";
import swaggerPlugin from "@/infra/plugins/swagger.js";
import { mergeAuthIntoSwagger } from "@/infra/plugins/authSwagger.js";
import { rootRoute } from "@/http/RootRoute.js";
import { healthCheckRoute } from "@/http/HealthCheckRoute.js";
import { registerAuthRoutes } from "@/http/auth/AuthCatchAllRoute.js";
import { registerStudentRoute } from "@/http/student/RegisterStudentRoute.js";
import { searchStudentsRoute } from "@/http/student/SearchStudentsRoute.js";
import { createManualEnrollmentRoute } from "@/http/enrollment/CreateManualEnrollmentRoute.js";
import { listOpenClassGroupsRoute } from "@/http/catalog/ListOpenClassGroupsRoute.js";
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

  // Registered after swagger-ui — its own /docs routes are added during
  // swaggerPlugin's registration above and must not go through the
  // deny-by-default onRoute check below (CLAUDE.md §6 targets application
  // routes; the swagger UI's internal routes aren't built via RouteBuilder
  // and are dev-only in the first place, container.production gated above).
  await app.register(authorizationPlugin);

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
        instance.withTypeProvider<ZodTypeProvider>().route(registerStudentRoute);
        instance.withTypeProvider<ZodTypeProvider>().route(searchStudentsRoute);
        instance.withTypeProvider<ZodTypeProvider>().route(createManualEnrollmentRoute);
        instance.withTypeProvider<ZodTypeProvider>().route(listOpenClassGroupsRoute);
        done();
      },
      { prefix: "/api/v1" },
    );
  });

  await app.ready();

  return app;
}
