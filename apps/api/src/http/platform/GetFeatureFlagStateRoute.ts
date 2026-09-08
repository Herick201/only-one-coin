import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const FeatureFlagStateResponseSchema = z.object({
  /** Only the flags somebody moved. Everything absent means "as declared in code". */
  overrides: z.record(z.string(), z.boolean()),
});

/**
 * What apps/app's resolver reads on every render (CLAUDE.md §5).
 *
 * `.internal()` rather than a role: the portal shell reads this for a student,
 * and the invite page reads it for somebody with no session at all — there is
 * no cargo to check. It is not `.public()` either: the list of what is off is
 * the list of what is being built, and that is not something to publish
 * (CLAUDE.md §8, anti-enumeração).
 */
export const getFeatureFlagStateRoute = RouteBuilder.get("/feature-flags/state")
  .docs({
    tags: ["Platform"],
    summary: "Feature-flag overrides in force",
    description: "Service-to-service read for apps/app's flag resolver. Internal token only.",
  })
  .internal()
  .response(200, FeatureFlagStateResponseSchema)
  .response(401, ErrorResponseSchema)
  .handler(async (_request, reply) => {
    const rows = await container.repositories.featureFlagOverride.list();

    reply.status(200).send({
      overrides: Object.fromEntries(rows.map((row) => [row.key, row.enabled])),
    });
  });
