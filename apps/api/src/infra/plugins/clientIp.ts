import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { resolveClientIp } from "@/infra/edge/clientIp.js";

declare module "fastify" {
  interface FastifyRequest {
    /** The caller's IP as far as this API can tell (infra/edge/clientIp.ts).
     * Use this, never `request.ip`: behind the Vercel proxy that is Vercel's. */
    clientIp: string;
  }
}

export interface ClientIpPluginOptions {
  proxySecret: string | undefined;
}

async function clientIpPlugin(app: FastifyInstance, options: ClientIpPluginOptions) {
  app.decorateRequest("clientIp", "");
  app.addHook("onRequest", async (request) => {
    request.clientIp = resolveClientIp(request.headers, request.socket.remoteAddress, options.proxySecret);
  });
}

export default fp(clientIpPlugin);
