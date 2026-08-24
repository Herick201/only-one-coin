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
 * Who registers a student by hand. The documented way in is the student filling
 * `/enrollment` themselves (CLAUDE.md §1); this covers the person who closed the
 * sale on WhatsApp and never reached the form. It stays with the two roles that
 * answer for the academic side, because a registration carries the guardian
 * record and the consent behind it (Ley 29733, CLAUDE.md §8) — tesorería
 * settles money, and a teacher reaches a student through their class group.
 */
export function canCreateStudent(role: StaffRole): boolean {
  return role === 'admin' || role === 'coordinator'
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
 * Who may read the reports. Administration and coordination — the same pair
 * that reads the enrollment ledger, because the report is that ledger summed
 * up: it carries the courses, the class groups and the seats, which
 * `docs/ARCHITECTURE.md` §3 puts with coordination and keeps away from
 * tesorería ("sem acesso a dado acadêmico não financeiro"). Tesorería's own
 * figure — what came in this ciclo — is on the payments section, next to the
 * receipts it settles. A teacher reads their own class groups, one at a time.
 */
export function canBrowseReports(role: StaffRole): boolean {
  return role === 'admin' || role === 'coordinator'
}

/**
 * Who may open an enrollment from the panel. The documented way in is the
 * student filling `/enrollment` themselves (CLAUDE.md §1); this is the exception
 * for the sale that closed on WhatsApp and never reached the form, so it stays
 * with the two roles that already answer for a seat. Tesorería settles money
 * and must not also be the one who creates what it settles, and a teacher runs
 * a class group without filling it.
 */
export function canCreateEnrollment(role: StaffRole): boolean {
  return role === 'admin' || role === 'coordinator'
}

/**
 * Who opens the e-mail module. Administration and coordination: the catalog
 * decides what every student receives at the moment their enrollment moves, so
 * it belongs to the two roles that answer for the funnel. Tesorería settles
 * money — the payment e-mails are a consequence of that, not a lever it pulls —
 * and a teacher runs a class group. As everywhere else, this only decides
 * whether the screen is drawn; the enforcing check is the role declared on the
 * route in `apps/api` (CLAUDE.md §8).
 */
export function canManageEmail(role: StaffRole): boolean {
  return role === 'admin' || role === 'coordinator'
}

/**
 * Who opens the platform settings. Admin only: that screen holds the grade that
 * decides who is certified and the tolerance the platform approves a receipt
 * with when nobody is looking. Coordination works inside those numbers and does
 * not set them, and tesorería settles receipts one by one under exactly them —
 * so neither moves them. As everywhere else, this only decides whether the
 * screen draws the form; the enforcing check is the role on the route in
 * `apps/api` (CLAUDE.md §8).
 */
export function canConfigureSettings(role: StaffRole): boolean {
  return role === 'admin'
}

/**
 * Whose second factor is not optional (CLAUDE.md §8). These three roles move
 * money, approve in bulk or hand out roles, so the panel never offers them a
 * switch to turn it off — the screen says the factor is part of the job. The
 * enforcing check is the session policy in `apps/api`; this only decides
 * whether a control is drawn.
 */
export function isMfaMandatory(role: StaffRole): boolean {
  return role === 'admin' || role === 'treasury' || role === 'mass_approver'
}
