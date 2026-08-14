import type { FastifyReply, FastifyRequest, RouteOptions } from "fastify";
import type { z, ZodType } from "zod";

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
      handler: fn as RouteOptions["handler"],
    };
  }
}
