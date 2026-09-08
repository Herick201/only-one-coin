import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const SetFeatureFlagParamsSchema = z.object({
  // The registry's own keys — `portal.payments`, `backoffice.staff`. Bounded
  // here only in shape: the list itself lives in apps/app, and a key that is
  // not in it simply governs nothing (the resolver ignores unknown rows).
  key: z.string().min(1).max(64).regex(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*)*$/),
});

const SetFeatureFlagBodySchema = z.object({
  /** `null` hands the flag back to the value declared in code. */
  enabled: z.boolean().nullable(),
});

const SetFeatureFlagResponseSchema = z.object({
  key: z.string(),
  enabled: z.boolean().nullable(),
});

/**
 * Turning a section on or off in production (CLAUDE.md §5).
 *
 * Owners only — and that is checked twice on purpose: `.owners()` refuses the
 * request at the door, and the usecase refuses it again before writing, so a
 * second caller added later cannot inherit the write without the rule. Every
 * change is appended to `audit_log`.
 */
export const setFeatureFlagRoute = RouteBuilder.put("/feature-flags/:key")
  .docs({
    tags: ["Platform"],
    summary: "Turn a feature flag on, off, or back to the code default",
    description: "Restricted to the platform owners' e-mail domain. Writes audit_log.",
  })
  .owners()
  .params(SetFeatureFlagParamsSchema)
  .body(SetFeatureFlagBodySchema)
  .response(200, SetFeatureFlagResponseSchema)
  .response(401, ErrorResponseSchema)
  .response(403, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const result = await container.useCases.platform.setFeatureFlag.run({
      actorId: request.currentUser!.id,
      actorEmail: request.currentUser!.email,
      key: request.params.key,
      enabled: request.body.enabled,
    });

    reply.status(200).send(result);
  });
