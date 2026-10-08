import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import { EMAIL_VERIFICATION_MAX_ATTEMPTS, verificationCodeMatches } from "./EmailVerification.js";
import type { IEmailVerificationRepository } from "./EmailVerificationRepository.js";
import {
  EmailVerificationAttemptsExhaustedError,
  EmailVerificationCodeExpiredError,
  EmailVerificationCodeInvalidError,
  EmailVerificationNotFoundError,
} from "./errors.js";

export interface ConfirmEmailVerificationInput {
  seatHoldId: string;
  /** Normalized by the route. */
  email: string;
  code: string;
}

/** Checks the typed code against the newest code sent to this address on this
 * checkout. A second confirm of a verified row is a no-op, not an error. */
export class ConfirmEmailVerificationUseCase extends BaseUseCase<ConfirmEmailVerificationInput, void> {
  constructor(private readonly repository: IEmailVerificationRepository) {
    super();
  }

  async run(input: ConfirmEmailVerificationInput): Promise<void> {
    const row = await this.repository.findLatest({ seatHoldId: input.seatHoldId, email: input.email });
    if (!row) throw new EmailVerificationNotFoundError();
    if (row.verified) return;
    if (row.attempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS) throw new EmailVerificationAttemptsExhaustedError();
    if (row.expired) throw new EmailVerificationCodeExpiredError();

    // Count the attempt before comparing, atomically, so concurrent confirms
    // cannot all test a code against an attempts count read earlier.
    const attempts = await this.repository.claimAttempt(row.id);
    if (attempts === null) throw new EmailVerificationCodeExpiredError();

    if (!verificationCodeMatches(row.id, input.code, row.codeHash)) {
      if (attempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS) throw new EmailVerificationAttemptsExhaustedError();
      throw new EmailVerificationCodeInvalidError();
    }

    if (!(await this.repository.markVerified(row.id))) throw new EmailVerificationCodeExpiredError();
  }
}
