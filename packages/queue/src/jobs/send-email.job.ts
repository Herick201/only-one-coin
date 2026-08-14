import { z } from "zod";

export const SEND_EMAIL_QUEUE = "send-email";

export const SendEmailPayloadSchema = z.object({
  to: z.string().email(),
  templateKey: z.string().min(1),
  vars: z.record(z.string(), z.unknown()).default({}),
});

export type SendEmailPayload = z.infer<typeof SendEmailPayloadSchema>;
