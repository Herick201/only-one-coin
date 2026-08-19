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
