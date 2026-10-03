import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { RATE_LIMITS, perSeatHold } from "@/shared/http/rateLimit.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const ConfirmReceiptUploadParamsSchema = z.object({
  receiptUploadId: z.string().uuid(),
});

const ConfirmReceiptUploadBodySchema = z.object({
  seatHoldId: z.string().uuid(),
});

const ConfirmReceiptUploadResponseSchema = z.object({
  receiptUploadId: z.string().uuid(),
});

// Public — same exposure as the request that precedes it.
export const confirmReceiptUploadRoute = RouteBuilder.post("/receipt-uploads/:receiptUploadId/confirm")
  .docs({
    tags: ["Enrollments"],
    summary: "Confirm the checkout's direct-to-bucket upload landed",
    description:
      "A metadata-only HEAD against the bucket — never the file's bytes. Retryable: called again before the object exists, it fails with a 422 the checkout can retry once its own PUT finishes.",
  })
  .public()
  .rateLimit(RATE_LIMITS.receiptUpload, perSeatHold("receipt-upload", 20, "seatHoldId"))
  .params(ConfirmReceiptUploadParamsSchema)
  .body(ConfirmReceiptUploadBodySchema)
  .response(200, ConfirmReceiptUploadResponseSchema)
  .response(404, ErrorResponseSchema)
  .response(422, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const result = await container.useCases.enrollment.confirmReceiptUpload.run({
      receiptUploadId: request.params.receiptUploadId,
      seatHoldId: request.body.seatHoldId,
    });

    reply.status(200).send(result);
  });
