import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import { NotFoundError } from "../shared/base/errors/NotFoundError.js";
import { UnableToProcessEntryError } from "../shared/base/errors/UnableToProcessEntryError.js";
import type { IStaffPasswordResetRepository } from "./ports/IStaffPasswordResetRepository.js";

export interface CancelStaffPasswordResetInput {
  resetId: string;
}

export class CancelStaffPasswordResetUseCase extends BaseUseCase<CancelStaffPasswordResetInput, void> {
  constructor(private readonly staffPasswordResetRepository: IStaffPasswordResetRepository) {
    super();
  }

  async run(input: CancelStaffPasswordResetInput): Promise<void> {
    const reset = await this.staffPasswordResetRepository.findById(input.resetId);
    if (!reset) {
      throw new NotFoundError({
        reason: "staff_password_reset.not_found",
        message: `No password reset with id ${input.resetId}`,
      });
    }
    if (reset.status !== "pending") {
      throw new UnableToProcessEntryError({
        reason: "staff_password_reset.not_pending",
        message: `Password reset ${input.resetId} is ${reset.status}, not pending.`,
      });
    }

    await this.staffPasswordResetRepository.markCancelled(reset.id);
  }
}
