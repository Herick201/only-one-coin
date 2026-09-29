export const SEAT_HOLD_SWEEP_QUEUE = "seat-hold-sweep";

/**
 * How often expired checkout holds are handed back to their class groups. A
 * seat can stay locked this long past its deadline — negligible against a hold
 * measured in minutes, and the submit never accepts an expired hold anyway:
 * it compares against the database clock itself, not against this sweep.
 */
export const SEAT_HOLD_SWEEP_EVERY_MS = 30_000;
