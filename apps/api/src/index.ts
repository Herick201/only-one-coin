import { buildApp } from "./app.js";
import { container } from "./container.js";

const app = await buildApp();

const {
  config: { PORT, HOST },
} = container;

app.listen({ port: PORT, host: HOST }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Server listening at ${address}`);
});
