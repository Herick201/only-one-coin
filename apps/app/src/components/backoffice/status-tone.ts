import type { Tone } from './ui'
import type {
  AuditAction,
  CertificationExamStatus,
  ClassGroupStatus,
  DocumentStatus,
  EmailDeliveryStatus,
  GradeStatus,
  EnrollmentStatus,
  PaymentStatus,
  ReviewFlag,
  SeatStatus,
  StudentStatus,
  TeacherStatus,
} from '@/lib/backoffice/types'

/** Maps domain enums to a visual tone. No UI copy here — labels come from i18n. */

export const studentTone: Record<StudentStatus, Tone> = {
  active: 'success',
  under_review: 'warning',
  inactive: 'neutral',
}

/** Off the roster is not an alarm — it is a record kept on purpose. */
export const teacherTone: Record<TeacherStatus, Tone> = {
  active: 'success',
  inactive: 'neutral',
}

export const enrollmentTone: Record<EnrollmentStatus, Tone> = {
  under_review: 'warning',
  active: 'success',
  completed: 'neutral',
  rejected: 'danger',
}

export const paymentTone: Record<PaymentStatus, Tone> = {
  pending: 'neutral',
  under_review: 'warning',
  approved: 'success',
  rejected: 'danger',
}

export const seatTone: Record<SeatStatus, Tone> = {
  reserved: 'warning',
  confirmed: 'success',
  released: 'neutral',
}

export const documentTone: Record<DocumentStatus, Tone> = {
  available: 'success',
  pending: 'warning',
  locked: 'neutral',
}

/** Duplicate receipt (tier 0) is a hard block; the rest are review signals. */
export const reviewFlagTone: Record<ReviewFlag, Tone> = {
  amount_mismatch: 'danger',
  low_confidence: 'warning',
  illegible: 'warning',
  duplicate_phash: 'danger',
  model_divergence: 'warning',
}

export const auditTone: Record<AuditAction, Tone> = {
  student_created: 'info',
  student_updated: 'info',
  enrollment_created: 'info',
  payment_approved: 'success',
  payment_rejected: 'danger',
  payment_flagged: 'warning',
  document_issued: 'success',
  document_requested: 'info',
  certificates_batch_issued: 'success',
  attachment_uploaded: 'info',
  email_sent: 'neutral',
  credentials_sent: 'neutral',
}

/** Outbox state of the e-mail that carries a document (CLAUDE.md §5). */
export const deliveryTone: Record<EmailDeliveryStatus, Tone> = {
  not_sent: 'neutral',
  queued: 'info',
  sent: 'success',
  failed: 'danger',
}

export const classGroupTone: Record<ClassGroupStatus, Tone> = {
  enrolling: 'info',
  in_progress: 'success',
  // Finished still owes certificates — it must not read as "done".
  finished: 'warning',
  closed: 'neutral',
}

/** `auto_failed` is the DA — a missed final exam, not a low grade. */
export const gradeTone: Record<GradeStatus, Tone> = {
  approved: 'success',
  failed: 'danger',
  auto_failed: 'danger',
  pending: 'neutral',
}

export const examTone: Record<CertificationExamStatus, Tone> = {
  approved: 'success',
  failed: 'danger',
  pending: 'warning',
  not_requested: 'neutral',
}

/** Seat pressure: full → danger, ≥85% → warning. */
export function seatPressureTone(taken: number, capacity: number): Tone {
  if (capacity === 0) return 'neutral'
  const pct = (taken / capacity) * 100
  if (pct >= 100) return 'danger'
  if (pct >= 85) return 'warning'
  return 'info'
}
