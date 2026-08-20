import { z } from "zod";

export const ErrorResponseSchema = z.object({
  status: z.number(),
  reason: z.string(),
  path: z.string().optional(),
  errorId: z.string().optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
