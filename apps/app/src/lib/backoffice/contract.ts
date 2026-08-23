/**
 * When a teacher's contract stops being somebody's problem for next quarter and
 * starts being one for this week.
 *
 * The threshold is a single number on purpose: whoever renews a contract needs
 * enough runway to get it signed, and a warning that arrives the week it lapses
 * is a warning that arrives too late. Six weeks is a coordination cycle — long
 * enough to chase, short enough that the list does not go permanently amber.
 */
export const CONTRACT_ALERT_DAYS = 45

/**
 * What the panel says about a contract. `missing` is a state of its own, not a
 * quiet dash: a teacher running a class group with no contract on file is the
 * same exposure as one whose contract lapsed, and hiding it behind an empty
 * cell is how it stays hidden.
 */
export type ContractAlert = 'missing' | 'expired' | 'expiring' | 'valid'

export function contractAlert(daysLeft: number | null): ContractAlert {
  if (daysLeft === null) return 'missing'
  if (daysLeft < 0) return 'expired'
  return daysLeft <= CONTRACT_ALERT_DAYS ? 'expiring' : 'valid'
}

/** Whole days from `now` to an ISO date, negative once it has passed. */
export function daysUntil(isoDate: string, now: Date): number {
  const DAY_MS = 24 * 60 * 60 * 1000
  const end = new Date(`${isoDate.slice(0, 10)}T23:59:59Z`).getTime()
  return Math.floor((end - now.getTime()) / DAY_MS)
}
