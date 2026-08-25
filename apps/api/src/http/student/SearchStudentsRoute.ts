import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

// Minimum length keeps a search box from turning into an unbounded table
// scan / directory-enumeration primitive (CLAUDE.md §8) — two characters is
// already useless as a full-directory query, on top of the ten-row cap the
// query itself applies.
const SearchStudentsQuerySchema = z.object({
  q: z.string().trim().min(2).max(100),
});

const SearchStudentsResponseSchema = z.array(
  z.object({
    id: z.string().uuid(),
    firstName: z.string(),
    lastName: z.string(),
    nationalIdType: z.enum(["DNI", "CE", "passport"]),
    nationalId: z.string(),
  }),
);

// admin/coordinator only — same audience as the manual enrollment/registration
// routes this feeds (CLAUDE.md §1). Returns the same PII shape the backoffice
// student directory already shows staff, nothing wider.
export const searchStudentsRoute = RouteBuilder.get("/students")
  .docs({
    tags: ["Students"],
    summary: "Search students by name or national id",
    description: "Backs the manual enrollment form's student picker.",
  })
  .roles("admin", "coordinator")
  .query(SearchStudentsQuerySchema)
  .response(200, SearchStudentsResponseSchema)
  .response(400, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const results = await container.queries.searchStudents.run(request.query.q);
    reply.status(200).send(results);
  });
