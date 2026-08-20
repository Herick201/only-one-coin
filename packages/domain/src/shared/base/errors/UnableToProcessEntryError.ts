import { HttpError, type HttpErrorParams } from "./HttpError.js";

/**
 * Requisição bem formada, mas a regra de negócio recusa (ex.: turma
 * cheia, amount_mismatch). Slot genérico reaproveitável por qualquer
 * bounded context futuro, não só identity.
 */
export class UnableToProcessEntryError extends HttpError {
  constructor(params: Omit<HttpErrorParams, "status">) {
    super({ ...params, status: 422 });
  }
}
