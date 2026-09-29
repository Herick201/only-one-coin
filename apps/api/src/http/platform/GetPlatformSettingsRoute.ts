import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const GetPlatformSettingsResponseSchema = z.object({
  checkoutHoldMinutes: z.number().int(),
});

// Same roles that open the settings screen (canConfigureSettings in apps/app).
export const getPlatformSettingsRoute = RouteBuilder.get("/settings")
  .docs({
    tags: ["Platform"],
    summary: "The settings the backoffice can change without a deploy",
  })
  .roles("master", "admin")
  .response(200, GetPlatformSettingsResponseSchema)
  .response(401, ErrorResponseSchema)
  .response(403, ErrorResponseSchema)
  .handler(async (_request, reply) => {
    const settings = await container.repositories.platformSettings.get();

    reply.status(200).send(settings);
  });
