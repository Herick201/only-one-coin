import type { FastifyBaseLogger } from "fastify";
import pino from "pino";
import type { Config } from "@/config.js";

export function createLogger(config: Config): FastifyBaseLogger {
  return pino({
    level: config.NODE_ENV === "production" ? "info" : "debug",
  });
}
