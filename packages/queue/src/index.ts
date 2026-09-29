export { createRedisConnection } from "./connection.js";

export { SEND_EMAIL_QUEUE, SendEmailPayloadSchema } from "./jobs/send-email.job.js";
export type { SendEmailPayload } from "./jobs/send-email.job.js";
export { OUTBOX_RELAY_QUEUE, OUTBOX_RELAY_EVERY_MS } from "./jobs/outbox-relay.job.js";

export { SEND_EMAIL_ATTEMPTS, createSendEmailQueue, enqueueSendEmail } from "./producers/send-email.producer.js";
export { createOutboxRelayQueue, scheduleOutboxRelay } from "./producers/outbox-relay.producer.js";
