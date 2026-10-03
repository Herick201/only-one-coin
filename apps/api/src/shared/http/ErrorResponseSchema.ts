import { FieldErrorCodeSchema } from "@ooc/domain";
import { z } from "zod";

export const ErrorResponseSchema = z.object({
  status: z.number(),
  reason: z.string(),
  path: z.string().optional(),
  errorId: z.string().optional(),
  // Only on `validation_error`: which body field, and a code the client
  // translates (FIELD_ERROR_CODES in @ooc/domain) — never a sentence.
  fields: z.array(z.object({ path: z.string(), code: FieldErrorCodeSchema })).optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
