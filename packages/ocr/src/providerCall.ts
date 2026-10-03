/** A single receipt is one small image and a short JSON answer; anything
 * slower than this is a stuck call, and the worker's retry (level 1r) is the
 * better use of the time. Shared by every provider adapter. */
export const RECEIPT_REQUEST_TIMEOUT_MS = 30_000;

/** A failure on the way to or from the provider — timeout, abort, network —
 * as opposed to a bug on our side. */
export function isTransportError(error: unknown): boolean {
  return error instanceof Error && /timeout|abort|fetch failed|ECONN|ETIMEDOUT|socket/i.test(`${error.name} ${error.message}`);
}
