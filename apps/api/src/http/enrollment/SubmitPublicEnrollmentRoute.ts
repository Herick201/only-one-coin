import {
  CreateStudentSchema,
  DEFAULT_LOCALE,
  GuardianFieldsSchema,
  LocaleSchema,
  MethodDetailField,
  OperationNumberField,
  PaymentMethodSchema,
  refineGmail,
  refineNationalId,
} from "@ooc/domain";
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
    // The hold claimed when the checkout settled on the class group
    // (ClaimSeatHoldRoute). Its seat and its channel become this
    // enrollment's; an expired or unknown hold is a 422, and the checkout
    // starts again from the class group step.
    holdId: z.string().uuid(),
    // Minted by RequestReceiptUploadRoute and confirmed by
    // ConfirmReceiptUploadRoute before this call — must belong to the same
    // hold and have actually landed in the bucket, or this is a 422.
    receiptUploadId: z.string().uuid(),
    classGroupId: z.string().uuid(),
    planId: z.string().uuid(),
    // Same field rules as the entity (normalized, then checked — fields.ts),
    // plus the checkout's own Gmail gate. A refusal is a 400 naming each
    // field and its code; the checkout translates the code.
    student: CreateStudentSchema.superRefine(refineGmail),
    guardian: GuardianFieldsSchema.omit({ studentId: true })
      .extend({
        // The checkbox, not the record — CLAUDE.md §8: "quem aceita é o
        // apoderado, com a data, a versão e o IP dele", all three stamped
        // by the route below, never accepted from the client. A guardian
        // block the client sends without this ticked is a malformed
        // request, not a business decision for the usecase to make.
        consentAccepted: z.literal(true),
      })
      .superRefine(refineNationalId)
      .nullable(),
    // The language the form was filled in; the e-mails follow it (CLAUDE.md
    // §4). Optional so an older client still enrolls — in es-PE, the default.
    locale: LocaleSchema.default(DEFAULT_LOCALE),
    payment: z
      .object({
        method: PaymentMethodSchema,
        methodDetail: MethodDetailField.nullable(),
        operationNumber: OperationNumberField,
        // Minted once by the client at submit and resent unchanged on
        // retry (CLAUDE.md §5) — never generated here.
        idempotencyKey: z.string().uuid(),
      })
      .refine((payment) => payment.method !== "other" || payment.methodDetail !== null, {
        message: "required",
        path: ["methodDetail"],
      }),
  });

const SubmitPublicEnrollmentResponseSchema = z.object({
  enrollmentId: z.string().uuid(),
  paymentId: z.string().uuid(),
});

// Public — this IS the front door of the funnel (CLAUDE.md §1). No
// Turnstile, no rate limit yet (docs/ROADMAP.md Sessão 25) — a deliberately
// reduced slice, not safe to point real traffic at until that lands.
// Signed-URL upload landed in OOC-19: no OCR yet past the normalize step.
export const submitPublicEnrollmentRoute = RouteBuilder.post("/enrollments/public")
  .docs({
    tags: ["Enrollments"],
    summary: "Submit the public enrollment checkout",
    description:
      "Creates the student (and guardian, if a minor), turns the checkout seat hold into the enrollment, opens its payment pending and links the confirmed receipt upload to it. Reduced slice: no OCR yet.",
  })
  .public()
  .body(SubmitPublicEnrollmentBodySchema)
  .response(201, SubmitPublicEnrollmentResponseSchema)
  .response(400, ErrorResponseSchema)
  .response(404, ErrorResponseSchema)
  .response(422, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const { holdId, receiptUploadId, classGroupId, planId, student, guardian, payment, locale } = request.body;

    const result = await container.useCases.enrollment.submitPublic.run({
      seatHoldId: holdId,
      receiptUploadId,
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
      locale,
      payment,
    });

    reply.status(201).send({ enrollmentId: result.enrollment.id, paymentId: result.payment.id });
  });
