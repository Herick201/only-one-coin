import { CatalogClassGroupNotFoundError } from "@ooc/domain";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";
import { CATALOG_READ_ROLES } from "./catalogRoles.js";
import { ClassGroupItemSchema, IdParamsSchema } from "./CatalogSchemas.js";

export const getClassGroupRoute = RouteBuilder.get("/catalog/class-groups/:id")
  .docs({ tags: ["Catalog"], summary: "One class group", description: "Retired ones answer too, flagged." })
  .roles(...CATALOG_READ_ROLES)
  .params(IdParamsSchema)
  .response(200, ClassGroupItemSchema)
  .response(404, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const [item] = await container.queries.listClassGroups.run({ id: request.params.id });
    if (!item) throw new CatalogClassGroupNotFoundError();
    reply.status(200).send(item);
  });
