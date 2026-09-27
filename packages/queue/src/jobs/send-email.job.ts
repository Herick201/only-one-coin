import { z } from "zod";

export const SEND_EMAIL_QUEUE = "send-email";

/**
 * Only a pointer to the `outbox` row, never the message itself: the row is the
 * source of truth for what to send and whether it already went, and keeping
 * recipient and vars out of Redis keeps PII out of one more store
 * (CLAUDE.md §6).
 */
export const SendEmailPayloadSchema = z.object({
  outboxId: z.string().uuid(),
});

export type SendEmailPayload = z.infer<typeof SendEmailPayloadSchema>;
