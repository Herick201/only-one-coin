import type { EnrollmentOrigin } from "./EnrollmentOrigin.js";
import type { SeatHold } from "./SeatHold.js";

export type ClaimSeatHoldResult =
  | { kind: "held"; hold: SeatHold }
  /** No open, non-retired class group with that id. */
  | { kind: "not_found" }
  /** It exists, but `seats_taken` already reached `capacity`. */
  | { kind: "full" };

/**
 * Every write here is one atomic statement against the class group's seat
 * counter (apps/api/CLAUDE.md, "Vagas — condição de corrida"): the seat is
 * never validated in application code, only in the WHERE clause of the
 * instruction that takes or returns it.
 */
export interface ISeatHoldRepository {
  /**
   * Takes one seat (`seats_taken + 1 WHERE seats_taken < capacity`) and
   * records the hold, expiring `holdMinutes` from now on the database clock.
   */
  claim(params: { classGroupId: string; origin: EnrollmentOrigin; holdMinutes: number }): Promise<ClaimSeatHoldResult>;

  /**
   * The hold as recorded, whatever its status — the submit reads the origin
   * from it. Whether it can still be consumed is decided by the submit's own
   * transaction, not by this read.
   */
  find(id: string): Promise<SeatHold | null>;

  /**
   * The checkout let go of the seat before the clock ran out (it picked
   * another class group). Returns the seat. A hold that is no longer active
   * is left alone — releasing twice is a no-op, never a second seat back.
   */
  release(id: string): Promise<boolean>;

  /**
   * Every active hold whose clock ran out becomes `expired` and gives its seat
   * back, in one statement. At most `limit` per call; returns how many.
   */
  expireDue(limit: number): Promise<number>;
}
