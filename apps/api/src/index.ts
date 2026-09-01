import { createRedisConnection } from "@ooc/queue";
import { buildApp } from "./app.js";
import { container } from "./container.js";
import { startSendEmailWorker } from "./workers/send-email.worker.js";

const {
  config: { PORT, HOST, REDIS_URL },
  logger,
} = container;

const app = await buildApp();

const connection = createRedisConnection(REDIS_URL);
const sendEmailWorker = startSendEmailWorker(connection, logger);
logger.info("Workers started: send-email");

app.listen({ port: PORT, host: HOST }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Server listening at ${address}`);
});

async function shutdown() {
  await app.close();
  await sendEmailWorker.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
