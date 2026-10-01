import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { container } from "@/container.js";
import { CATALOG_READ_ROLES } from "./catalogRoles.js";
import { IdParamsSchema, WaitlistItemSchema } from "./CatalogSchemas.js";

export const listWaitlistRoute = RouteBuilder.get("/catalog/class-groups/:id/waitlist")
  .docs({ tags: ["Catalog"], summary: "Who is waiting for a class group", description: "First come first served." })
  .roles(...CATALOG_READ_ROLES)
  .params(IdParamsSchema)
  .response(200, z.object({ items: z.array(WaitlistItemSchema) }))
  .handler(async (request, reply) => {
    reply.status(200).send({ items: await container.queries.listWaitlist.run(request.params.id) });
  });
