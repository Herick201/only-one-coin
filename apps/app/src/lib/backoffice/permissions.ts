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

/**
 * Who opens the teacher roster. A teacher is on it, they do not run it: hiring,
 * allocation and availability are coordination's, and treasury has no business
 * in the academic side at all.
 */
export function canManageTeachers(role: StaffRole): boolean {
  return role === 'admin' || role === 'coordinator'
}

/**
 * Who registers a new teacher. Admin only, for the same reason as a course: a
 * teacher record is an account that will read student grades, and creating one
 * is one step away from creating staff — which `CLAUDE.md` §8 puts behind a
 * dedicated usecase with fresh re-authentication, admin only.
 */
export function canCreateTeacher(role: StaffRole): boolean {
  return role === 'admin'
}

/**
 * Who may browse the whole student directory. A teacher sees the students of
 * their own class groups, reached through the class group — never a roster of
 * every student in the institution.
 */
export function canBrowseStudents(role: StaffRole): boolean {
  return role !== 'teacher'
}

/**
 * Whether the panel must be narrowed to the signed-in teacher's own class
 * groups (`docs/ARCHITECTURE.md` §3). The screen honours it so the reader is
 * not shown doors that would fail; the enforcing check compares the
 * authenticated `teacher_id` against the class group inside the usecase, and it
 * is the only one that counts (CLAUDE.md §8).
 */
export function isRestrictedToOwnClassGroups(role: StaffRole): boolean {
  return role === 'teacher'
}

/**
 * Who may read the enrollment ledger. Administration and coordination —
 * `docs/ARCHITECTURE.md` §3 gives coordination the class groups, the periods
 * and the enrollments, and keeps tesorería out of academic data that is not
 * financial: the ledger carries the course, the class group, the teacher and
 * the student's progress, and tesorería settles money in the payments section.
 * A teacher sees the students of their own class groups, through the class
 * group, never a roster of the whole institution (CLAUDE.md §8).
 */
export function canBrowseEnrollments(role: StaffRole): boolean {
  return role === 'admin' || role === 'coordinator'
}

/**
 * Who may open an enrollment from the panel. The documented way in is the
 * student filling `/matricula` themselves (CLAUDE.md §1); this is the exception
 * for the sale that closed on WhatsApp and never reached the form, so it stays
 * with the two roles that already answer for a seat. Tesorería settles money
 * and must not also be the one who creates what it settles, and a teacher runs
 * a class group without filling it.
 */
export function canCreateEnrollment(role: StaffRole): boolean {
  return role === 'admin' || role === 'coordinator'
}
