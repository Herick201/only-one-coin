import type { Role } from "@ooc/domain";
import type { FastifyReply, FastifyRequest, RouteOptions } from "fastify";
import type { z, ZodType } from "zod";
import type { RouteAuth } from "@/infra/plugins/authorization.js";

interface RouteSchema {
  tags?: string[];
  summary?: string;
  description?: string;
  body?: ZodType;
  params?: ZodType;
  querystring?: ZodType;
  response?: Record<number, ZodType>;
}

export class RouteBuilder<
  TBody extends ZodType = ZodType,
  TParams extends ZodType = ZodType,
  TQuery extends ZodType = ZodType,
> {
  private readonly method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  private readonly url: string;
  private schema: RouteSchema = {};
  // No default — deny-by-default (CLAUDE.md §6) is enforced by requiring
  // every route to call .roles(...) or .public() explicitly. A route built
  // without either fails at registration time (authorization plugin's
  // onRoute hook), not silently open.
  private auth?: RouteAuth;

  private constructor(method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH", url: string) {
    this.method = method;
    this.url = url;
  }

  static post(url: string) {
    return new RouteBuilder("POST", url);
  }

  static get(url: string) {
    return new RouteBuilder("GET", url);
  }

  static put(url: string) {
    return new RouteBuilder("PUT", url);
  }

  static patch(url: string) {
    return new RouteBuilder("PATCH", url);
  }

  static delete(url: string) {
    return new RouteBuilder("DELETE", url);
  }

  docs(info: { tags?: string[]; summary?: string; description?: string }) {
    this.schema = { ...this.schema, ...info };
    return this;
  }

  body<T extends ZodType>(schema: T): RouteBuilder<T, TParams, TQuery> {
    this.schema.body = schema;
    return this as unknown as RouteBuilder<T, TParams, TQuery>;
  }

  params<T extends ZodType>(schema: T): RouteBuilder<TBody, T, TQuery> {
    this.schema.params = schema;
    return this as unknown as RouteBuilder<TBody, T, TQuery>;
  }

  query<T extends ZodType>(schema: T): RouteBuilder<TBody, TParams, T> {
    this.schema.querystring = schema;
    return this as unknown as RouteBuilder<TBody, TParams, T>;
  }

  response(statusCode: number, schema: ZodType) {
    this.schema.response = { ...this.schema.response, [statusCode]: schema };
    return this;
  }

  /** Restricts the route to the given roles — checked against the caller's
   * `user.role` on every request (CLAUDE.md §8). */
  roles(...roles: [Role, ...Role[]]) {
    this.auth = { public: false, roles };
    return this;
  }

  /** Explicitly marks the route as open to unauthenticated callers — the
   * only other way to satisfy the deny-by-default requirement. */
  public() {
    this.auth = { public: true };
    return this;
  }

  handler(
    fn: (
      request: FastifyRequest<{
        Body: z.infer<TBody>;
        Params: z.infer<TParams>;
        Querystring: z.infer<TQuery>;
      }>,
      reply: FastifyReply,
    ) => Promise<unknown> | void,
  ): RouteOptions {
    return {
      method: this.method,
      url: this.url,
      schema: this.schema,
      config: { auth: this.auth },
      handler: fn as RouteOptions["handler"],
    };
  }
}
