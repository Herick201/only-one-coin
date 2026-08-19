/**
 * Domain shapes for the backoffice UI (mockup phase).
 *
 * Same naming as the future database rows (CLAUDE.md §4 glossary, §5
 * architecture), so swapping the mock source for real API calls should not
 * touch a component. Money is integer cents; timestamps are ISO 8601 UTC and
 * rendered in America/Lima. No human-facing copy lives here — every enum is
 * resolved to text through the `bo` i18n namespace.
 */

import type {
  ClassModality,
  DocumentStatus,
  DocumentType,
  EnrollmentStatus,
  NationalIdType,
  PaymentMethod,
  PaymentStatus,
  SeatStatus,
} from '@/lib/portal/types'

export type {
  ClassModality,
  DocumentStatus,
  DocumentType,
  EnrollmentStatus,
  NationalIdType,
  PaymentMethod,
  PaymentStatus,
  SeatStatus,
}

/** Staff + student-side roles (CLAUDE.md §8). */
export type StaffRole =
  | 'admin'
  | 'coordinator'
  | 'teacher'
  | 'treasury'
  | 'mass_approver'

export interface StaffUser {
  id: string
  firstName: string
  lastName: string
  email: string
  role: StaffRole
}

/**
 * Derived, not a stored column: `active` = has at least one active enrollment,
 * `under_review` = has an enrollment/payment waiting on review, `inactive` =
 * neither. Kept as a UI concept until the rule is confirmed.
 */
export type StudentStatus = 'active' | 'under_review' | 'inactive'

export type GuardianRelationship = 'mother' | 'father' | 'legal_guardian'

export interface GuardianSummary {
  firstName: string
  lastName: string
  relationship: GuardianRelationship
  nationalIdType: NationalIdType
  nationalId: string
  email: string
  phone: string
  /** Ley 29733 consent record — CLAUDE.md §8. Null = consent still missing. */
  consent: { version: string; acceptedAt: string; ip: string } | null
}

/** One row of the student list. */
export interface StudentRow {
  id: string
  firstName: string
  lastName: string
  nationalIdType: NationalIdType
  nationalId: string
  email: string
  phone: string
  birthDate: string
  isMinor: boolean
  status: StudentStatus
  /** City / region, as declared at enrollment. */
  city: string
  activeCourses: number
  totalEnrollments: number
  createdAt: string
  lastActivityAt: string
}

/** An enrollment as the backoffice sees it — course + money + seat, in one row. */
export interface EnrollmentHistoryItem {
  id: string
  status: EnrollmentStatus
  seatStatus: SeatStatus
  createdAt: string
  courseName: string
  classGroupName: string
  teacherName: string
  modality: ClassModality
  academicPeriodName: string
  planName: string
  /** Frozen price version at enrollment time (CLAUDE.md §5). */
  planPriceId: string
  amountCents: number
  currency: 'PEN'
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  operationNumber: string | null
  paidAt: string | null
  progressPct: number | null
}

export interface DocumentItem {
  id: string
  type: DocumentType
  status: DocumentStatus
  enrollmentId: string
  issuedAt: string | null
}

/** Append-only audit trail (CLAUDE.md §8) — one entry per staff action. */
export type AuditAction =
  | 'student_created'
  | 'student_updated'
  | 'enrollment_created'
  | 'payment_approved'
  | 'payment_rejected'
  | 'payment_flagged'
  | 'document_issued'
  | 'email_sent'
  | 'credentials_sent'

export interface AuditEntry {
  id: string
  at: string
  action: AuditAction
  actorName: string
  actorRole: StaffRole
  /** Free-form data (course name, operation number…), never UI copy. */
  reference: string | null
}

/** Full student file. */
export interface StudentDetail extends StudentRow {
  guardian: GuardianSummary | null
  enrollments: EnrollmentHistoryItem[]
  documents: DocumentItem[]
  activity: AuditEntry[]
}

/** Why a receipt landed in the human queue (CLAUDE.md §5 tier ladder). */
export type ReviewFlag =
  | 'amount_mismatch'
  | 'low_confidence'
  | 'illegible'
  | 'duplicate_phash'
  | 'model_divergence'

export interface ReviewQueueItem {
  id: string
  studentId: string
  studentName: string
  courseName: string
  method: PaymentMethod
  /** What the receipt says vs. what the frozen plan price says. */
  amountCents: number
  expectedAmountCents: number
  flag: ReviewFlag
  /** OCR ladder tier that produced the extraction (0–3). */
  tier: number
  /** Lowest per-field confidence, 0–1. */
  confidence: number
  submittedAt: string
}

/** Headline numbers on the backoffice home. */
export interface DashboardMetrics {
  enrollmentsToday: number
  enrollmentsTodayDelta: number
  pendingReview: number
  oldestPendingHours: number
  activeStudents: number
  activeStudentsDelta: number
  seatsTaken: number
  seatsCapacity: number
}

/** Seat pressure per class group — the "vagas" watchlist. */
export interface SeatWatchItem {
  id: string
  courseName: string
  classGroupName: string
  startDate: string
  seatsTaken: number
  capacity: number
}
