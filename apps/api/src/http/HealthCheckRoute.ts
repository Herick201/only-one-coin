import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";

export const healthCheckRoute = RouteBuilder.get("/health")
  .docs({
    tags: ["Common"],
    summary: "Health check",
    description: "Check the health of the application",
  })
  .response(200, z.object({ status: z.string() }))
  .handler(async (_request, reply) => {
    reply.send({ status: "ok" });
  });
