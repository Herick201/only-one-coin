import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

// `q` optional: omitted, this is the student directory (docs/ROADMAP.md
// Sessão 34); set, it is the manual enrollment form's picker (CLAUDE.md §1).
// The floor on `q` keeps a search box from turning into a
// directory-enumeration primitive when it IS used to search — the
// no-filter directory read is a distinct, deliberately gated case (roles
// below), not the same risk.
const ListStudentsQuerySchema = z.object({
  q: z.string().trim().min(2).max(100).optional(),
});

const StudentStatusSchema = z.enum(["active", "under_review", "inactive"]);

const StudentListResponseSchema = z.array(
  z.object({
    id: z.string().uuid(),
    firstName: z.string(),
    lastName: z.string(),
    nationalIdType: z.enum(["DNI", "CE", "passport"]),
    nationalId: z.string(),
    email: z.string(),
    phone: z.string(),
    birthDate: z.string(),
    country: z.string(),
    region: z.string().nullable(),
    city: z.string(),
    createdAt: z.string(),
    isMinor: z.boolean(),
    status: StudentStatusSchema,
    activeCourses: z.number().int(),
    totalEnrollments: z.number().int(),
    lastActivityAt: z.string(),
  }),
);

// admin/coordinator only — same audience as the rest of the student
// directory and the manual registration/enrollment routes it sits beside
// (CLAUDE.md §1).
export const listStudentsRoute = RouteBuilder.get("/students")
  .docs({
    tags: ["Students"],
    summary: "List students, or search by name / national id",
    description: "Backs the student directory and the manual enrollment form's student picker.",
  })
  .roles("admin", "coordinator")
  .query(ListStudentsQuerySchema)
  .response(200, StudentListResponseSchema)
  .response(400, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const results = await container.queries.listStudents.run(request.query.q);

    reply.status(200).send(
      results.map((row) => ({
        ...row,
        birthDate: row.birthDate.toISOString(),
        createdAt: row.createdAt.toISOString(),
        lastActivityAt: row.lastActivityAt.toISOString(),
      })),
    );
  });
