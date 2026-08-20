import { HttpError, type HttpErrorParams } from "./HttpError.js";

export class NotFoundError extends HttpError {
  constructor(params: Omit<HttpErrorParams, "status">) {
    super({ ...params, status: 404 });
  }
}
