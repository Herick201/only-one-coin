import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { NotFoundError } from "@ooc/domain";
import { container } from "@/container.js";

const GetStudentParamsSchema = z.object({
  studentId: z.string().uuid(),
});

const GuardianResponseSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  relationship: z.enum(["mother", "father", "legal_guardian"]),
  nationalIdType: z.enum(["DNI", "CE", "passport"]),
  nationalId: z.string(),
  email: z.string(),
  phone: z.string(),
  consent: z.object({ version: z.string(), acceptedAt: z.string(), ip: z.string() }).nullable(),
});

const GetStudentResponseSchema = z.object({
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
  status: z.enum(["active", "under_review", "inactive"]),
  activeCourses: z.number().int(),
  totalEnrollments: z.number().int(),
  lastActivityAt: z.string(),
  guardian: GuardianResponseSchema.nullable(),
  // Always empty for now — no `documents`, `document_requests`, upload or
  // `audit_log` table exists yet (docs/ROADMAP.md Sessão 7). Sent as empty
  // lists rather than omitted, so the frontend's existing empty states
  // render instead of the page needing a special "not built yet" branch.
  // `enrollments` joins the same list: a real history entry needs a
  // tracking `code` and `teacherName` neither of which the schema has yet
  // (no `teachers` table — Sessão 36), so it stays empty rather than
  // guessing either.
  enrollments: z.array(z.unknown()),
  documents: z.array(z.unknown()),
  documentRequests: z.array(z.unknown()),
  attachments: z.array(z.unknown()),
  activity: z.array(z.unknown()),
});

// admin/coordinator only — same audience as the rest of the student
// directory (CLAUDE.md §1). A teacher never reaches this route: the panel
// narrows them to their own class groups before a student id is ever in
// reach, and the role gate here is the backstop if they arrive by URL
// anyway.
export const getStudentRoute = RouteBuilder.get("/students/:studentId")
  .docs({
    tags: ["Students"],
    summary: "Get a student's file",
    description: "Backs the student detail screen — identity, contact and guardian.",
  })
  .roles("admin", "coordinator")
  .params(GetStudentParamsSchema)
  .response(200, GetStudentResponseSchema)
  .response(404, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const student = await container.queries.getStudent.run(request.params.studentId);

    if (!student) {
      throw new NotFoundError({
        reason: "student.not_found",
        message: `No student with id ${request.params.studentId}`,
        path: request.url,
      });
    }

    reply.status(200).send({
      ...student,
      birthDate: student.birthDate.toISOString(),
      createdAt: student.createdAt.toISOString(),
      lastActivityAt: student.lastActivityAt.toISOString(),
      guardian: student.guardian
        ? {
            ...student.guardian,
            consent: student.guardian.consent
              ? { ...student.guardian.consent, acceptedAt: student.guardian.consent.acceptedAt.toISOString() }
              : null,
          }
        : null,
      enrollments: [],
      documents: [],
      documentRequests: [],
      attachments: [],
      activity: [],
    });
  });
