import type { EnrollmentOrigin } from "./EnrollmentOrigin.js";

/**
 * A seat taken from a class group while the public checkout is still being
 * filled in — the short clock of apps/api/CLAUDE.md "Dois relógios". It exists
 * because the payment happens outside the platform: the person leaves for
 * their banking app, and coming back to a full class group has no remedy.
 *
 * A read shape, not an entity with behaviour: `expiresAt` is stamped by the
 * database clock when the seat is claimed, and every later decision about it
 * (consume, expire) is taken against that same clock inside the repository's
 * atomic statements. Nothing in memory gets to decide a hold is still alive.
 */
export interface SeatHold {
  /** The only thing the anonymous checkout holds to consume or release it. */
  id: string;
  classGroupId: string;
  /** Captured at first access; copied onto the enrollment the hold becomes. */
  origin: EnrollmentOrigin;
  expiresAt: Date;
}
