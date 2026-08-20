import type { StaffRole } from './types'

/**
 * Screen-level gates. These decide what a staff member *sees*, never what they
 * are allowed to do: the real check is deny-by-default in `apps/api`, where
 * every route declares its role (CLAUDE.md §8). Hiding a button is defense in
 * depth, not the defense.
 */

/** Only management opens a class group; a teacher runs one, does not create it. */
export function canCreateClassGroup(role: StaffRole): boolean {
  return role === 'admin' || role === 'coordinator'
}

/**
 * Who may issue a document or fire the batch. A teacher can, but only for their
 * own class groups — that scope check lives in the usecase, comparing the
 * authenticated `teacher_id` against the class group's (CLAUDE.md §8).
 */
export function canIssueCertificates(role: StaffRole): boolean {
  return role === 'admin' || role === 'coordinator' || role === 'teacher'
}

/**
 * Who may record an administrative procedure over an enrollment — moving,
 * freezing, withdrawing (`docs/REGRAS-NEGOCIO.md` §5). They all carry a fee and
 * touch a seat, so they belong to management: a teacher runs the class group,
 * they do not move a student out of it.
 */
export function canManageEnrollment(role: StaffRole): boolean {
  return role === 'admin' || role === 'coordinator'
}

/**
 * Opening a course is an admin call: it is what the whole catalog, the price
 * table and every future class group hang off. Coordination configures what
 * already exists.
 */
export function canCreateCourse(role: StaffRole): boolean {
  return role === 'admin'
}

/** Who may change a course's options — not the same as who may create one. */
export function canConfigureCourse(role: StaffRole): boolean {
  return role === 'admin' || role === 'coordinator'
}

/**
 * Who may settle a receipt the ladder could not. Tesorería and aprobación
 * masiva exist for exactly this; a teacher runs a class group and never touches
 * money. The enforcing check is the role declared on the `apps/api` usecase —
 * this only decides whether the button is drawn (CLAUDE.md §8).
 */
export function canReviewPayments(role: StaffRole): boolean {
  return role !== 'teacher'
}

/**
 * Who may change the validation parameters. Admin only: the tolerance and the
 * minimum confidence decide what the platform approves with nobody looking, so
 * moving them is worth more than any single approval — including tesorería's,
 * which settles receipts one by one under exactly these numbers.
 */
export function canConfigurePayments(role: StaffRole): boolean {
  return role === 'admin'
}
