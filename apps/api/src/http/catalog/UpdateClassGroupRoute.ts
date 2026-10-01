import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";
import { CATALOG_WRITE_ROLES } from "./catalogRoles.js";
import { IdParamsSchema, IdResponseSchema, UpdateClassGroupBodySchema, toDate } from "./CatalogSchemas.js";

/**
 * Edits a class group; an explicit null clears a date. The period never
 * changes, and neither do the seats taken.
 * No rate limit yet (docs/ROADMAP.md Sessão 25).
 */
export const updateClassGroupRoute = RouteBuilder.patch("/catalog/class-groups/:id")
  .docs({ tags: ["Catalog"], summary: "Edit a class group" })
  .roles(...CATALOG_WRITE_ROLES)
  .params(IdParamsSchema)
  .body(UpdateClassGroupBodySchema)
  .response(200, IdResponseSchema)
  .response(400, ErrorResponseSchema)
  .response(404, ErrorResponseSchema)
  .response(422, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const { startsOn, endsOn, enrollmentOpensAt, enrollmentClosesAt, ...rest } = request.body;
    const group = await container.useCases.catalog.updateClassGroup.run({
      actorId: request.currentUser!.id,
      id: request.params.id,
      patch: {
        ...rest,
        ...(startsOn !== undefined && { startsOn: toDate(startsOn) }),
        ...(endsOn !== undefined && { endsOn: toDate(endsOn) }),
        ...(enrollmentOpensAt !== undefined && { enrollmentOpensAt: toDate(enrollmentOpensAt) }),
        ...(enrollmentClosesAt !== undefined && { enrollmentClosesAt: toDate(enrollmentClosesAt) }),
      },
    });
    reply.status(200).send({ id: group.id });
  });
