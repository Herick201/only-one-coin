import { createRedisConnection } from "@ooc/queue";
import { container } from "./container.js";
import { startSendEmailWorker } from "./workers/send-email.worker.js";

const {
  config: { REDIS_URL },
  logger,
} = container;
const connection = createRedisConnection(REDIS_URL);

const sendEmailWorker = startSendEmailWorker(connection, logger);

logger.info("Workers started: send-email");

async function shutdown() {
  await sendEmailWorker.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
