import { CreateGuardianSchema, CreateStudentSchema, PaymentMethodSchema } from "@ooc/domain";
import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

// Version the guardian is agreeing to — CLAUDE.md §8, Ley 29733. Same
// provisional constant GetPublicCatalogRoute sends as `settings.
// consentVersion`; no `settings` table yet to read it from instead.
const CONSENT_VERSION = "v1";

const SubmitPublicEnrollmentBodySchema = z
  .object({
    classGroupId: z.string().uuid(),
    planId: z.string().uuid(),
    student: CreateStudentSchema,
    guardian: CreateGuardianSchema.omit({ studentId: true })
      .extend({
        // The checkbox, not the record — CLAUDE.md §8: "quem aceita é o
        // apoderado, com a data, a versão e o IP dele", all three stamped
        // by the route below, never accepted from the client. A guardian
        // block the client sends without this ticked is a malformed
        // request, not a business decision for the usecase to make.
        consentAccepted: z.literal(true),
      })
      .nullable(),
    payment: z
      .object({
        method: PaymentMethodSchema,
        methodDetail: z.string().min(1).nullable(),
        operationNumber: z.string().min(1),
        // Minted once by the client at submit and resent unchanged on
        // retry (CLAUDE.md §5) — never generated here.
        idempotencyKey: z.string().uuid(),
      })
      .refine((payment) => payment.method !== "other" || payment.methodDetail !== null, {
        message: "methodDetail is required when method is 'other'",
        path: ["methodDetail"],
      }),
  });

const SubmitPublicEnrollmentResponseSchema = z.object({
  enrollmentId: z.string().uuid(),
  paymentId: z.string().uuid(),
});

// Public — this IS the front door of the funnel (CLAUDE.md §1). No
// Turnstile, no rate limit, no signed-URL upload yet (docs/ROADMAP.md
// Sessões 23/25) — a deliberately reduced first slice, not safe to point
// real traffic at until those land.
export const submitPublicEnrollmentRoute = RouteBuilder.post("/enrollments/public")
  .docs({
    tags: ["Enrollments"],
    summary: "Submit the public enrollment checkout",
    description:
      "Creates the student (and guardian, if a minor), claims a seat and opens the enrollment with its payment pending. Reduced slice: no receipt upload, no OCR.",
  })
  .public()
  .body(SubmitPublicEnrollmentBodySchema)
  .response(201, SubmitPublicEnrollmentResponseSchema)
  .response(400, ErrorResponseSchema)
  .response(404, ErrorResponseSchema)
  .response(422, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const { classGroupId, planId, student, guardian, payment } = request.body;

    const result = await container.useCases.enrollment.submitPublic.run({
      classGroupId,
      planId,
      student,
      guardian: guardian
        ? {
            firstName: guardian.firstName,
            lastName: guardian.lastName,
            relationship: guardian.relationship,
            nationalIdType: guardian.nationalIdType,
            nationalId: guardian.nationalId,
            email: guardian.email,
            phone: guardian.phone,
          }
        : null,
      consent: guardian ? { version: CONSENT_VERSION, ip: request.ip } : null,
      payment,
    });

    reply.status(201).send({ enrollmentId: result.enrollment.id, paymentId: result.payment.id });
  });
