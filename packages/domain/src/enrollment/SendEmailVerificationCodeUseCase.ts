import { v7 as uuid } from "uuid";
import type { Locale } from "../notification/EmailNotification.js";
import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import {
  EMAIL_VERIFICATION_CODE_TTL_MINUTES,
  EMAIL_VERIFICATION_MAX_SENDS_PER_HOLD,
  EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
  emailVerificationCodeEmail,
  hashVerificationCode,
  newVerificationCode,
} from "./EmailVerification.js";
import type { IEmailVerificationRepository } from "./EmailVerificationRepository.js";
import { EmailVerificationCooldownError, EmailVerificationTooManySendsError, SeatHoldExpiredError } from "./errors.js";

export interface SendEmailVerificationCodeInput {
  seatHoldId: string;
  /** Normalized and already held to the checkout's student rules by the route. */
  email: string;
  recipientName: string;
  locale: Locale;
}

/**
 * Mails a fresh 6-digit code to the address the checkout's student typed
 * (spec 2026-10-07). The code leaves this method only inside the outbox row;
 * the database keeps its hash.
 */
export class SendEmailVerificationCodeUseCase extends BaseUseCase<
  SendEmailVerificationCodeInput,
  { resendAfterSeconds: number }
> {
  constructor(private readonly repository: IEmailVerificationRepository) {
    super();
  }

  async run(input: SendEmailVerificationCodeInput): Promise<{ resendAfterSeconds: number }> {
    const id = uuid();
    const code = newVerificationCode();
    const outcome = await this.repository.issue({
      id,
      seatHoldId: input.seatHoldId,
      email: input.email,
      codeHash: hashVerificationCode(id, code),
      ttlMinutes: EMAIL_VERIFICATION_CODE_TTL_MINUTES,
      cooldownSeconds: EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
      maxSends: EMAIL_VERIFICATION_MAX_SENDS_PER_HOLD,
      notifications: [
        emailVerificationCodeEmail({
          verificationId: id,
          to: input.email,
          recipientName: input.recipientName,
          code,
          locale: input.locale,
        }),
      ],
    });

    if (outcome === "hold_expired") throw new SeatHoldExpiredError();
    if (outcome === "cooldown") throw new EmailVerificationCooldownError();
    if (outcome === "too_many_sends") throw new EmailVerificationTooManySendsError();
    return { resendAfterSeconds: EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS };
  }
}
