export const OUTBOX_RELAY_QUEUE = "outbox-relay";

/** How often the relay looks for pending outbox rows. Latency of a
 * transactional e-mail is this plus the send itself. */
export const OUTBOX_RELAY_EVERY_MS = 5_000;
