import type {
  ClassGroupDetail,
  ClassGroupRow,
  ClassGroupStudent,
  ProcedureAction,
  ProcedureBlockReason,
} from './types'

/**
 * Administrative procedures over one enrollment: move to another class group,
 * freeze, withdraw (`docs/REGRAS-NEGOCIO.md` §5).
 *
 * Two things shape this file.
 *
 * The first is that every procedure in §5 is **paid** and arranged outside the
 * platform — the student pays the fee, sends the receipt, and only then does
 * coordination act. So the backoffice never *performs* a procedure: it records
 * one that already happened, and the screen says so. Wiring it to a fee payment
 * is the same "solicitação com pagamento associado" shape as the constancia
 * (`docs/DOCUMENTOS-E-CERTIFICADOS.md` §2), still to be confirmed.
 *
 * The second is that the restrictions are **catalog config**, never inferred
 * from the course name: `allowsFreeze` is off for Inglés Intermedio/Avanzado
 * (§2 and §5) and `allowsTransfer` only exists for Inglés Básico Regular (§5).
 * Reading either out of a string would put a language inside the code, which
 * CLAUDE.md §1 rules out.
 *
 * UI-side derivation for the mockup. The real decision is a usecase in
 * `packages/domain` — the browser is never the authority (CLAUDE.md §8).
 */

/** Fee in cents, or null where the rules do not name one. */
export const PROCEDURE_FEE_CENTS: Record<ProcedureAction, number | null> = {
  // S/10, "cambio de horário" (§5). The free "traspaso" of the same table may
  // be the same procedure under another name — the requirements flag the
  // overlap themselves (`docs/REQUISITOS.md` RF11), so this stays to confirm.
  transfer: 1000,
  // S/10, "congelamento (trancamento)" (§5).
  freeze: 1000,
  // Nothing in the rules covers withdrawing: there is no cancellation or
  // refund policy on record. Null means "undefined", not "free".
  withdraw: null,
}

/**
 * First blocking reason wins, ordered from the state of the enrollment to the
 * catalog rule — a coordinator should read "the student already froze" before
 * "this course does not offer it".
 */
export function procedureBlockReason(
  action: ProcedureAction,
  student: ClassGroupStudent,
  group: ClassGroupRow,
  seatsElsewhere: number,
): ProcedureBlockReason | null {
  if (student.procedure) return 'already_applied'
  if (group.status === 'finished' || group.status === 'closed') {
    return 'group_not_running'
  }
  if (student.enrollmentStatus !== 'active') return 'enrollment_not_active'
  if (student.paymentStatus !== 'approved') return 'payment_not_approved'

  if (action === 'freeze' && !group.allowsFreeze) return 'not_offered'
  if (action === 'transfer') {
    if (!group.allowsTransfer) return 'not_offered'
    if (seatsElsewhere === 0) return 'no_seats_elsewhere'
  }
  return null
}

/**
 * Where a student could be moved to: another class group of the same course,
 * still enrolling or running, with a seat free.
 *
 * The seat count here is only what the screen shows. Taking the seat is the
 * single atomic UPDATE of CLAUDE.md §5 — checking availability in the
 * application and then writing is exactly the race that rule exists to stop.
 */
export function transferTargets(
  group: ClassGroupDetail | ClassGroupRow,
  all: ClassGroupRow[],
): ClassGroupRow[] {
  return all.filter(
    (row) =>
      row.id !== group.id &&
      row.courseName === group.courseName &&
      (row.status === 'enrolling' || row.status === 'in_progress') &&
      row.seatsTaken < row.capacity,
  )
}
