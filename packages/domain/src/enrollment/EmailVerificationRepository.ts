import type { EmailNotification } from "../notification/EmailNotification.js";

export type IssueEmailVerificationOutcome = "issued" | "hold_expired" | "cooldown" | "too_many_sends";

export interface IssueEmailVerificationRequest {
  /** Minted by the use case: the hash is salted with it. */
  id: string;
  seatHoldId: string;
  /** Normalized. */
  email: string;
  codeHash: string;
  ttlMinutes: number;
  cooldownSeconds: number;
  maxSends: number;
  /** Written to the outbox in the same transaction as the row. */
  notifications: EmailNotification[];
}

/** The newest not-yet-consumed row for a hold and an address. `expired` is
 * decided on the database clock. */
export interface LatestEmailVerification {
  id: string;
  codeHash: string;
  attempts: number;
  expired: boolean;
  verified: boolean;
}

export interface IEmailVerificationRepository {
  /**
   * One transaction, locking the seat hold row:
   * - the hold is not `active` or already expired → `hold_expired`;
   * - a code went out for this hold less than `cooldownSeconds` ago → `cooldown`;
   * - `maxSends` codes already went out for this hold → `too_many_sends`;
   * - otherwise: pending (unverified, unexpired) rows of the hold expire now,
   *   the new row is written expiring `ttlMinutes` from now, and the outbox
   *   rows of `notifications` with it → `issued`.
   */
  issue(request: IssueEmailVerificationRequest): Promise<IssueEmailVerificationOutcome>;
  findLatest(params: { seatHoldId: string; email: string }): Promise<LatestEmailVerification | null>;
  /** Counts one attempt before the code is compared: +1 only while the row is
   * unverified, unexpired and under the limit; returns the count after it, or
   * null when the row could not take another attempt (burned, expired or
   * already verified — a race). */
  claimAttempt(id: string): Promise<number | null>;
  /** Sets `verified_at` only if still unverified and unexpired (no attempts
   * condition — the attempt was already counted, and the 5th attempt may
   * succeed); `false` when it was not (a race with expiry). */
  markVerified(id: string): Promise<boolean>;
}
