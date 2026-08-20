import { HttpError, type HttpErrorParams } from "./HttpError.js";

export class ForbiddenError extends HttpError {
  constructor(params: Omit<HttpErrorParams, "status">) {
    super({ ...params, status: 403 });
  }
}
