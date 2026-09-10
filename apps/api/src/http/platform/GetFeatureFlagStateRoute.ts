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
 * `.public()`: the portal shell reads this for a student, and the invite page
 * reads it for somebody with no session at all — there is no cargo to check,
 * and no service secret either. What it returns is a list of booleans (which
 * sections are on), not anything an owner needs kept from a logged-out
 * caller — the door that matters is who can *change* one (`.owners()` on
 * `PUT /feature-flags/:key`), not who can read the current state.
 */
export const getFeatureFlagStateRoute = RouteBuilder.get("/feature-flags/state")
  .docs({
    tags: ["Platform"],
    summary: "Feature-flag overrides in force",
    description: "Public read for apps/app's flag resolver.",
  })
  .public()
  .response(200, FeatureFlagStateResponseSchema)
  .response(401, ErrorResponseSchema)
  .handler(async (_request, reply) => {
    const rows = await container.repositories.featureFlagOverride.list();

    reply.status(200).send({
      overrides: Object.fromEntries(rows.map((row) => [row.key, row.enabled])),
    });
  });
