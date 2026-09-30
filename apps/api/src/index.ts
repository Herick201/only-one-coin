import {
  createOutboxRelayQueue,
  createReceiptNormalizeQueue,
  createReceiptUploadRelayQueue,
  createRedisConnection,
  createSeatHoldSweepQueue,
  createSendEmailQueue,
  scheduleOutboxRelay,
  scheduleReceiptUploadRelay,
  scheduleSeatHoldSweep,
} from "@ooc/queue";
import { buildApp } from "./app.js";
import { container } from "./container.js";
import { startOutboxRelayWorker } from "./workers/outbox-relay.worker.js";
import { startReceiptNormalizeWorker } from "./workers/receipt-normalize.worker.js";
import { startReceiptUploadRelayWorker } from "./workers/receipt-upload-relay.worker.js";
import { startSeatHoldSweepWorker } from "./workers/seat-hold-sweep.worker.js";
import { startSendEmailWorker } from "./workers/send-email.worker.js";

const {
  config: { PORT, HOST, REDIS_URL, NODE_ENV, BREVO_API_KEY },
  logger,
  notifications,
  storage,
  repositories,
  useCases,
} = container;

const app = await buildApp();

const connection = createRedisConnection(REDIS_URL);

// Outbox → queue → provider (apps/api/CLAUDE.md, "Notificações"). The relay
// sweeps pending outbox rows onto the send-email queue; the send-email worker
// delivers them through the guarded provider.
const sendEmailQueue = createSendEmailQueue(connection);
const outboxRelayQueue = createOutboxRelayQueue(connection);
await scheduleOutboxRelay(outboxRelayQueue);

const sendEmailWorker = startSendEmailWorker(connection, logger, {
  store: notifications.outbox,
  provider: notifications.provider,
});
const outboxRelayWorker = startOutboxRelayWorker(connection, logger, {
  store: notifications.outbox,
  sendEmailQueue,
});
// Checkout holds (apps/api/CLAUDE.md, "Dois relógios"): expired holds give
// their seat back to the class group, on the database clock.
const seatHoldSweepQueue = createSeatHoldSweepQueue(connection);
await scheduleSeatHoldSweep(seatHoldSweepQueue);
const seatHoldSweepWorker = startSeatHoldSweepWorker(connection, logger, {
  expireSeatHolds: useCases.enrollment.expireSeatHolds,
});

// Receipt uploads (OOC-19): confirm flips a row to `uploaded`, the relay
// offers it to the normalize queue, the worker downscales/greyscales/strips
// EXIF/converts HEIC and writes back `processed` or `rejected`.
const receiptNormalizeQueue = createReceiptNormalizeQueue(connection);
const receiptUploadRelayQueue = createReceiptUploadRelayQueue(connection);
await scheduleReceiptUploadRelay(receiptUploadRelayQueue);
const receiptNormalizeWorker = startReceiptNormalizeWorker(connection, logger, {
  store: repositories.receiptUpload,
  objects: storage.objectStore,
});
const receiptUploadRelayWorker = startReceiptUploadRelayWorker(connection, logger, {
  store: repositories.receiptUpload,
  normalizeQueue: receiptNormalizeQueue,
});

logger.info(
  { emailProvider: BREVO_API_KEY ? "brevo" : "log", allowlistEnforced: NODE_ENV !== "production" },
  "Workers started: outbox-relay, send-email, seat-hold-sweep, receipt-upload-relay, receipt-normalize",
);
if (NODE_ENV === "production" && !BREVO_API_KEY) {
  logger.warn("BREVO_API_KEY is not set: transactional e-mails are logged, not sent");
}

app.listen({ port: PORT, host: HOST }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Server listening at ${address}`);
});

async function shutdown() {
  await app.close();
  await outboxRelayWorker.close();
  await sendEmailWorker.close();
  await seatHoldSweepWorker.close();
  await receiptUploadRelayWorker.close();
  await receiptNormalizeWorker.close();
  await outboxRelayQueue.close();
  await sendEmailQueue.close();
  await seatHoldSweepQueue.close();
  await receiptUploadRelayQueue.close();
  await receiptNormalizeQueue.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
