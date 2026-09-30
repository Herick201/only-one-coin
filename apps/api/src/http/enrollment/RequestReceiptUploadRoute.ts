import { RECEIPT_CONTENT_TYPES } from "@ooc/domain";
import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const RequestReceiptUploadBodySchema = z.object({
  // The seat hold claimed in the class-group step (ClaimSeatHoldRoute) — the
  // only server-minted id the checkout has before it submits.
  seatHoldId: z.string().uuid(),
  // The browser's own File.type. Only shapes the upload policy — the actual
  // accept/reject decision is the normalize worker's, from the bytes
  // themselves (apps/api/CLAUDE.md, "Upload").
  contentType: z.enum(RECEIPT_CONTENT_TYPES),
});

const RequestReceiptUploadResponseSchema = z.object({
  receiptUploadId: z.string().uuid(),
  uploadUrl: z.string(),
  uploadFields: z.record(z.string(), z.string()),
  maxBytes: z.number().int(),
});

// Public — same exposure as ClaimSeatHoldRoute, which this immediately
// follows in the checkout: nobody has an account yet.
export const requestReceiptUploadRoute = RouteBuilder.post("/receipt-uploads")
  .docs({
    tags: ["Enrollments"],
    summary: "Mint a signed upload target for the checkout's receipt photo",
    description:
      "The checkout POSTs the file straight to the bucket with the returned url/fields — the file never reaches this function (CLAUDE.md §6). Server-side validation and normalization happen afterwards, in the worker.",
  })
  .public()
  .body(RequestReceiptUploadBodySchema)
  .response(201, RequestReceiptUploadResponseSchema)
  .response(404, ErrorResponseSchema)
  .response(422, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const result = await container.useCases.enrollment.requestReceiptUpload.run(request.body);

    reply.status(201).send({
      receiptUploadId: result.receiptUploadId,
      uploadUrl: result.upload.url,
      uploadFields: result.upload.fields,
      maxBytes: result.maxBytes,
    });
  });
