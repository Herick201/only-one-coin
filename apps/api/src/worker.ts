import pino from "pino";
import { createRedisConnection } from "@ooc/queue";
import { loadConfig } from "./config.js";
import { startSendEmailWorker } from "./workers/send-email.worker.js";

const config = loadConfig();
const logger = pino();
const connection = createRedisConnection(config.REDIS_URL);

const sendEmailWorker = startSendEmailWorker(connection, logger);

logger.info("Workers started: send-email");

async function shutdown() {
  await sendEmailWorker.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
