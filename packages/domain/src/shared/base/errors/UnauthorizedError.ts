import { HttpError, type HttpErrorParams } from "./HttpError.js";

export class UnauthorizedError extends HttpError {
  constructor(params: Omit<HttpErrorParams, "status">) {
    super({ ...params, status: 401 });
  }
}
