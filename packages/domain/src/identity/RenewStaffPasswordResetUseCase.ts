import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import { NotFoundError } from "../shared/base/errors/NotFoundError.js";
import { UnableToProcessEntryError } from "../shared/base/errors/UnableToProcessEntryError.js";
import type { IStaffPasswordResetRepository, StaffPasswordReset } from "./ports/IStaffPasswordResetRepository.js";

const RESET_TTL_HOURS = 24;

export interface RenewStaffPasswordResetInput {
  resetId: string;
}

export interface RenewStaffPasswordResetOutput {
  reset: StaffPasswordReset;
}

export class RenewStaffPasswordResetUseCase extends BaseUseCase<
  RenewStaffPasswordResetInput,
  RenewStaffPasswordResetOutput
> {
  constructor(private readonly staffPasswordResetRepository: IStaffPasswordResetRepository) {
    super();
  }

  async run(input: RenewStaffPasswordResetInput): Promise<RenewStaffPasswordResetOutput> {
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

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + RESET_TTL_HOURS);

    await this.staffPasswordResetRepository.renew(reset.id, expiresAt);

    return { reset: { ...reset, expiresAt } };
  }
}
