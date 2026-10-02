import {
  createOutboxRelayQueue,
  createReceiptExtractQueue,
  createReceiptNormalizeQueue,
  createReceiptScreenQueue,
  createReceiptUploadRelayQueue,
  createRedisConnection,
  createSeatHoldSweepQueue,
  createSendEmailQueue,
  scheduleOutboxRelay,
  scheduleReceiptUploadRelay,
  scheduleSeatHoldSweep,
} from "@ooc/queue";
import { ExtractReceiptUseCase } from "@ooc/domain";
import { buildApp } from "./app.js";
import { container } from "./container.js";
import { createReceiptExtractor, missingReceiptOcrKey } from "./infra/ocr/createReceiptExtractor.js";
import { startOutboxRelayWorker } from "./workers/outbox-relay.worker.js";
import { startReceiptExtractWorker } from "./workers/receipt-extract.worker.js";
import { startReceiptNormalizeWorker } from "./workers/receipt-normalize.worker.js";
import { startReceiptScreenWorker } from "./workers/receipt-screen.worker.js";
import { startReceiptUploadRelayWorker } from "./workers/receipt-upload-relay.worker.js";
import { startSeatHoldSweepWorker } from "./workers/seat-hold-sweep.worker.js";
import { startSendEmailWorker } from "./workers/send-email.worker.js";

const {
  config,
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
// EXIF/converts HEIC and writes back `processed` or `rejected`. Once a
// processed receipt is attached to a payment, the same relay offers it to the
// screen queue (OOC-22, antifraud level 0).
//
// OCR level 1 (OOC-20) rides the same relay: once a receipt is processed and
// attached to a payment it is offered to the extract queue too. The model
// client is built here, never in the container — routes load the container,
// and the submit route must not import the AI module (apps/api/CLAUDE.md).
// RECEIPT_OCR_PROVIDER picks Gemini direct or OpenRouter; without that
// provider's key the queue is not created, nothing is offered, and receipts
// wait unread.
const receiptExtractor = createReceiptExtractor(config);
const receiptNormalizeQueue = createReceiptNormalizeQueue(connection);
const receiptScreenQueue = createReceiptScreenQueue(connection);
const receiptExtractQueue = receiptExtractor ? createReceiptExtractQueue(connection) : null;
const receiptUploadRelayQueue = createReceiptUploadRelayQueue(connection);
await scheduleReceiptUploadRelay(receiptUploadRelayQueue);
const receiptNormalizeWorker = startReceiptNormalizeWorker(connection, logger, {
  store: repositories.receiptUpload,
  objects: storage.objectStore,
});
const receiptUploadRelayWorker = startReceiptUploadRelayWorker(connection, logger, {
  store: repositories.receiptUpload,
  normalizeQueue: receiptNormalizeQueue,
  screenQueue: receiptScreenQueue,
  extractQueue: receiptExtractQueue,
});
const receiptScreenWorker = startReceiptScreenWorker(connection, logger, {
  screenReceiptUpload: useCases.enrollment.screenReceiptUpload,
});
const receiptExtractWorker = receiptExtractor
  ? startReceiptExtractWorker(connection, logger, {
      extractReceipt: new ExtractReceiptUseCase(
        repositories.receiptExtraction,
        { read: (objectKey) => storage.objectStore.getObject(objectKey) },
        receiptExtractor,
      ),
    })
  : null;

logger.info(
  {
    emailProvider: BREVO_API_KEY ? "brevo" : "log",
    allowlistEnforced: NODE_ENV !== "production",
    receiptExtraction: receiptExtractor
      ? { provider: config.RECEIPT_OCR_PROVIDER, model: receiptExtractor.modelName }
      : "off",
  },
  "Workers started: outbox-relay, send-email, seat-hold-sweep, receipt-upload-relay, receipt-normalize, receipt-screen, receipt-extract",
);
if (NODE_ENV === "production" && !BREVO_API_KEY) {
  logger.warn("BREVO_API_KEY is not set: transactional e-mails are logged, not sent");
}
if (NODE_ENV === "production" && !receiptExtractor) {
  logger.warn(
    `${missingReceiptOcrKey(config)} is not set (RECEIPT_OCR_PROVIDER=${config.RECEIPT_OCR_PROVIDER}): receipts are screened but never read by OCR`,
  );
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
  await receiptScreenWorker.close();
  await receiptExtractWorker?.close();
  await outboxRelayQueue.close();
  await sendEmailQueue.close();
  await seatHoldSweepQueue.close();
  await receiptUploadRelayQueue.close();
  await receiptNormalizeQueue.close();
  await receiptScreenQueue.close();
  await receiptExtractQueue?.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
