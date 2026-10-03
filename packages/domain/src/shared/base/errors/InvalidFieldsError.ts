import type { FieldError } from "../../../student/fields.js";
import { HttpError, type HttpErrorParams } from "./HttpError.js";

/**
 * The request named fields whose values break a field rule
 * (`student/fields.ts`). Same answer the HTTP layer gives when the body schema
 * refuses — 400, `validation_error` — but raised from the domain, so an entity
 * created by a path that skipped the route schema still refuses the same way.
 *
 * `fields` carries a code per field, never a sentence: the client translates
 * it (CLAUDE.md §4).
 */
export class InvalidFieldsError extends HttpError {
  public readonly fields: FieldError[];

  constructor(fields: FieldError[], params?: Omit<HttpErrorParams, "status" | "reason" | "message">) {
    super({
      reason: "validation_error",
      message: `Invalid fields: ${fields.map((field) => `${field.path} (${field.code})`).join(", ")}`,
      ...params,
      status: 400,
    });
    this.fields = fields;
  }
}
