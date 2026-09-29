import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import type { ISeatHoldRepository } from "./SeatHoldRepository.js";

/**
 * The checkout gave the seat back before its clock ran out — the person went
 * back and picked another class group. Without this the abandoned seat stays
 * locked for the full hold, and in a class group down to its last seats that
 * is somebody else turned away for nothing.
 *
 * Silent whatever the hold's state: releasing a hold that already expired,
 * was consumed or never existed changes nothing and tells the caller nothing.
 */
export class ReleaseSeatHoldUseCase extends BaseUseCase<{ holdId: string }, void> {
  constructor(private readonly seatHolds: ISeatHoldRepository) {
    super();
  }

  async run(input: { holdId: string }): Promise<void> {
    await this.seatHolds.release(input.holdId);
  }
}
