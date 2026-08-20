import type { FastifyInstance } from "fastify";
import type { Auth } from "@/infra/auth/betterAuth.js";

interface OpenApiDocument {
  paths?: Record<string, unknown>;
  components?: { schemas?: Record<string, unknown>; [key: string]: unknown };
  [key: string]: unknown;
}

export async function mergeAuthIntoSwagger(app: FastifyInstance, auth: Auth) {
  const authSchema = (await auth.api.generateOpenAPISchema()) as OpenApiDocument;

  // better-auth's own paths are relative to its basePath ("/sign-in/email"),
  // not to this Fastify app's root — reprefix with /api/auth so "try it out"
  // in the merged doc hits the real route.
  const authPaths = Object.fromEntries(
    Object.entries(authSchema.paths ?? {}).map(([path, def]) => [`/api/auth${path}`, def]),
  );

  const originalSwagger = app.swagger.bind(app);

  // Blunt monkey-patch: better-auth's routes aren't Fastify routes with a
  // Zod schema, so @fastify/swagger never sees them — merge its own
  // generated OpenAPI paths/components into ours after the fact.
  (app as unknown as { swagger: () => OpenApiDocument }).swagger = () => {
    const spec = originalSwagger() as OpenApiDocument;
    // Drop the raw wildcard entry @fastify/swagger infers from our
    // catch-all Fastify route — the real per-endpoint paths above replace it.
    const { "/api/auth/{*}": _catchAll, ...basePaths } = spec.paths ?? {};
    return {
      ...spec,
      paths: { ...basePaths, ...authPaths },
      components: {
        ...spec.components,
        schemas: { ...spec.components?.schemas, ...authSchema.components?.schemas },
      },
    };
  };
}
