import { CreateGuardianSchema, CreateStudentSchema } from "@ooc/domain";
import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const RegisterStudentBodySchema = z.object({
  student: CreateStudentSchema,
  guardian: CreateGuardianSchema.omit({ studentId: true }).nullable(),
});

const GuardianResponseSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  relationship: z.enum(["mother", "father", "legal_guardian"]),
  nationalIdType: z.enum(["DNI", "CE", "passport"]),
  nationalId: z.string(),
  email: z.string(),
  phone: z.string(),
});

const RegisterStudentResponseSchema = z.object({
  student: z.object({
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
  }),
  guardian: GuardianResponseSchema.nullable(),
});

// admin/coordinator only — the manual backoffice registration flow
// (CLAUDE.md §1, "/backoffice/students"). It never enrolls anyone; it only
// creates the person record.
export const registerStudentRoute = RouteBuilder.post("/students")
  .docs({
    tags: ["Students"],
    summary: "Register a student (and optional guardian) from the backoffice",
    description:
      "Manual registration exception — the documented path is the student filling the public enrollment form themselves.",
  })
  .roles("admin", "coordinator")
  .body(RegisterStudentBodySchema)
  .response(201, RegisterStudentResponseSchema)
  .response(400, ErrorResponseSchema)
  .response(422, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const { student, guardian } = request.body;

    const result = await container.useCases.student.register.run({
      student,
      guardian,
    });

    reply.status(201).send({
      student: { ...result.student, birthDate: result.student.birthDate.toISOString() },
      guardian: result.guardian,
    });
  });
