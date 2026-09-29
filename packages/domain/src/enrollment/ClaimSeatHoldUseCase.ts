import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import type { IPlatformSettingsRepository } from "../platform/ports/IPlatformSettingsRepository.js";
import type { EnrollmentOrigin } from "./EnrollmentOrigin.js";
import { ClassGroupFullError, ClassGroupNotFoundError } from "./errors.js";
import type { SeatHold } from "./SeatHold.js";
import type { ISeatHoldRepository } from "./SeatHoldRepository.js";

export interface ClaimSeatHoldInput {
  classGroupId: string;
  origin: EnrollmentOrigin;
}

/**
 * The public checkout settled on a class group: take the seat now, before the
 * money (docs/MATRICULA-CHECKOUT.md §3). How long it is held is read from the
 * backoffice settings on every claim — changing the minutes applies to the
 * next hold, never to one already running.
 */
export class ClaimSeatHoldUseCase extends BaseUseCase<ClaimSeatHoldInput, SeatHold> {
  constructor(
    private readonly seatHolds: ISeatHoldRepository,
    private readonly settings: IPlatformSettingsRepository,
  ) {
    super();
  }

  async run(input: ClaimSeatHoldInput): Promise<SeatHold> {
    const { checkoutHoldMinutes } = await this.settings.get();

    const result = await this.seatHolds.claim({
      classGroupId: input.classGroupId,
      origin: input.origin,
      holdMinutes: checkoutHoldMinutes,
    });

    switch (result.kind) {
      case "held":
        return result.hold;
      case "full":
        throw new ClassGroupFullError();
      case "not_found":
        throw new ClassGroupNotFoundError();
    }
  }
}
