import { HttpError, type HttpErrorParams } from "./HttpError.js";

/**
 * The request collides with what is already there — a second run of something
 * that must happen once, a state that already moved on. Distinct from 422: the
 * request was valid, the world changed under it.
 */
export class ConflictError extends HttpError {
  constructor(params: Omit<HttpErrorParams, "status">) {
    super({ ...params, status: 409 });
  }
}
