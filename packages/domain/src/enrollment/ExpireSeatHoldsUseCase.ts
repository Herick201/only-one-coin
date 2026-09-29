import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import type { ISeatHoldRepository } from "./SeatHoldRepository.js";

/** Holds expired per sweep. A tick that fills the batch leaves the rest for the next. */
export const EXPIRE_SEAT_HOLDS_BATCH = 500;

/**
 * The sweep behind the short clock: every hold whose minutes ran out without
 * a receipt goes back to its class group (apps/api/CLAUDE.md, "Dois
 * relógios"). Run on a schedule by the API's own worker — the checkout's
 * countdown reaching zero on somebody's screen decides nothing.
 */
export class ExpireSeatHoldsUseCase extends BaseUseCase<void, { expired: number }> {
  constructor(private readonly seatHolds: ISeatHoldRepository) {
    super();
  }

  async run(): Promise<{ expired: number }> {
    const expired = await this.seatHolds.expireDue(EXPIRE_SEAT_HOLDS_BATCH);
    return { expired };
  }
}
