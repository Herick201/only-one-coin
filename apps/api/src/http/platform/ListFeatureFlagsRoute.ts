import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const FeatureFlagOverrideSchema = z.object({
  key: z.string(),
  enabled: z.boolean(),
  updatedBy: z.string(),
  /** Null when the account that moved it has since been removed. */
  updatedByName: z.string().nullable(),
  updatedAt: z.string(),
});

const ListFeatureFlagsResponseSchema = z.object({
  items: z.array(FeatureFlagOverrideSchema),
});

/**
 * The switchboard as the panel reads it: every flag somebody moved, with who
 * moved it and when. The catalog of flags themselves is not here — it lives in
 * `apps/app`, next to the sections it governs, and the screen merges the two.
 *
 * Owners only, like the write below.
 */
export const listFeatureFlagsRoute = RouteBuilder.get("/feature-flags")
  .docs({
    tags: ["Platform"],
    summary: "List the feature-flag overrides",
    description: "Backs Funcionalidades. Restricted to the platform owners' e-mail domain.",
  })
  .owners()
  .response(200, ListFeatureFlagsResponseSchema)
  .response(401, ErrorResponseSchema)
  .response(403, ErrorResponseSchema)
  .handler(async (_request, reply) => {
    const items = await container.repositories.featureFlagOverride.listForPanel();

    reply.status(200).send({
      items: items.map((item) => ({ ...item, updatedAt: item.updatedAt.toISOString() })),
    });
  });
