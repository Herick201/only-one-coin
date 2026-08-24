import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";

export const rootRoute = RouteBuilder.get("/")
  .docs({
    tags: ["Common"],
    summary: "Root route",
    description: "Root endpoint for the application",
  })
  .response(200, z.object({ message: z.string() }))
  .public()
  .handler(async (_request, reply) => {
    reply.send({ message: "Only One Coin API" });
  });
