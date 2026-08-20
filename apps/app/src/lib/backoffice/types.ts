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
  /** ISO 3166-1 alpha-2 country, as declared at enrollment. */
  country: string
  /** First-level division — `departamento` in Peru. Null where we don't map one. */
  region: string | null
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
  /** When the payment was credited — null until it is approved. */
  paidAt: string | null
  progressPct: number | null
}

/** Where the e-mail carrying a document currently is (outbox, CLAUDE.md §5). */
export type EmailDeliveryStatus = 'not_sent' | 'queued' | 'sent' | 'failed'

/**
 * The e-mail is a consequence of issuing the document — one outbox row per
 * emission, never a separate "send" button. A resend is an audited exception.
 */
export interface DocumentDelivery {
  status: EmailDeliveryStatus
  lastSentAt: string | null
  attempts: number
}

export interface DocumentItem {
  id: string
  type: DocumentType
  status: DocumentStatus
  enrollmentId: string
  issuedAt: string | null
  /** Printed on the PDF and checked by the public validation page. Set only
   *  once the document actually exists. */
  verificationCode: string | null
  /** Null when the batch issued it — the actor is then the system. */
  issuedByName: string | null
  delivery: DocumentDelivery
}

/**
 * A paid administrative procedure that ends in a document. The constancia de
 * matrícula costs S/25 (`docs/REGRAS-NEGOCIO.md` §5) and is paid outside the
 * platform exactly like an enrollment: the student uploads the receipt and the
 * same OCR ladder validates it. No payment gateway is involved (CLAUDE.md §2).
 */
export interface DocumentRequest {
  id: string
  type: DocumentType
  enrollmentId: string
  requestedAt: string
  /** Fee frozen at request time, integer cents (CLAUDE.md §5). */
  feeCents: number
  currency: 'PEN'
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod | null
  operationNumber: string | null
}

/** What an uploaded file is. Never a document the platform issues. */
export type AttachmentKind =
  | 'national_id'
  | 'guardian_consent'
  | 'receipt'
  | 'other'

export type AttachmentSource = 'student' | 'staff'

/**
 * A file attached to the student, uploaded by the student from the portal or by
 * staff here. Deliberately NOT a `DocumentItem`: an uploaded PDF carries no
 * verification code, so it must never reach the public validation page.
 */
export interface StudentAttachment {
  id: string
  kind: AttachmentKind
  /** Real file name as uploaded — student data, shown as is (CLAUDE.md §4). */
  fileName: string
  sizeBytes: number
  uploadedAt: string
  uploadedBy: AttachmentSource
  uploadedByName: string
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
  | 'document_requested'
  | 'certificates_batch_issued'
  | 'attachment_uploaded'
  | 'email_sent'
  | 'credentials_sent'

/** Student data fields, as shown in the file — used by the audit trail. */
export type StudentField =
  | 'first_name'
  | 'last_name'
  | 'id_type'
  | 'id_number'
  | 'email'
  | 'phone'
  | 'country'
  | 'region'
  | 'city'
  | 'birth_date'

/** Versioned e-mail templates (CLAUDE.md §5, outbox). */
export type EmailTemplate =
  | 'guardian_consent_reminder'
  | 'enrollment_certificate_issued'
  | 'certificate_issued'

/**
 * What an audit entry points at. Either real data (a course name, an operation
 * number) or a domain code the UI translates — a code never reaches the screen.
 */
export type AuditReference =
  | { kind: 'course'; name: string }
  | { kind: 'operation'; number: string }
  | { kind: 'review_flag'; flag: ReviewFlag }
  | { kind: 'student_field'; field: StudentField }
  | { kind: 'email_template'; template: EmailTemplate }

export interface AuditEntry {
  id: string
  at: string
  action: AuditAction
  actorName: string
  actorRole: StaffRole
  reference: AuditReference | null
}

/** Full student file. */
export interface StudentDetail extends StudentRow {
  guardian: GuardianSummary | null
  enrollments: EnrollmentHistoryItem[]
  documents: DocumentItem[]
  /** Paid procedures still on their way to becoming a document. */
  documentRequests: DocumentRequest[]
  attachments: StudentAttachment[]
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

/* -------------------------------------------------------------------------- */
/* Class groups — where certificates are issued in batch                       */
/* -------------------------------------------------------------------------- */

/**
 * `finished` = classes are over but certificates are still owed. `closed` =
 * everyone who qualified already got theirs. A failed student never gets one,
 * so "all certificates issued" can never be the gate — it would leave any class
 * group with a failure open forever.
 */
export type ClassGroupStatus =
  | 'enrolling'
  | 'in_progress'
  | 'finished'
  | 'closed'

/**
 * How the certificate is earned (`docs/REGRAS-NEGOCIO.md` §6). Most courses
 * certify on grades alone; Inglés Básico additionally requires a certification
 * exam the student has to request, so it never goes out in a blind batch.
 */
export type CertificateRule = 'automatic' | 'exam_required'

/** Final grade outcome. `auto_failed` is the DA — a missed final exam. */
export type GradeStatus = 'approved' | 'failed' | 'auto_failed' | 'pending'

export type CertificationExamStatus =
  | 'approved'
  | 'failed'
  | 'pending'
  | 'not_requested'

/** Weekday code — the screen resolves it to a short label via the locale. */
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

/**
 * The language a course belongs to. Carried as catalogue data, not as a
 * translated enum: the Asociación runs ~10 languages and opens new ones
 * (quechua workshops included), and `CLAUDE.md` §1 is explicit that nothing
 * language-specific belongs in the code. Same treatment as `courseName`.
 */
export interface CourseLanguage {
  id: string
  name: string
}

export interface ClassGroupRow {
  id: string
  courseName: string
  /**
   * The code the institution prints on paperwork and uses on the phone —
   * catalog data, not a technical id, which is why it is allowed on screen
   * (CLAUDE.md §4). Format still to be confirmed with the Asociación.
   */
  code: string
  language: CourseLanguage
  /** Weekly schedule — the days plus the start time, in America/Lima. */
  weekdays: Weekday[]
  startTime: string
  teacherId: string
  teacherName: string
  modality: ClassModality
  academicPeriodName: string
  startDate: string
  endDate: string
  seatsTaken: number
  capacity: number
  status: ClassGroupStatus
  certificateRule: CertificateRule
  /**
   * Which administrative procedures the catalog offers for this class group
   * (`docs/REGRAS-NEGOCIO.md` §5). Config, not code: freezing is off for
   * Inglés Intermedio/Avanzado and the schedule change only exists for Inglés
   * Básico Regular, and neither rule may be inferred from the course name —
   * nothing language-specific lives in the code (CLAUDE.md §1).
   */
  allowsFreeze: boolean
  allowsTransfer: boolean
  /** Students who finished and are still waiting for their certificate. */
  pendingCertificates: number
}

/**
 * A course as the catalog holds it. The class group is an instance of a course
 * with a schedule, a teacher and seats (`docs/REQUISITOS.md` RF09) — what lives
 * here is what every one of its class groups inherits.
 *
 * Price is deliberately absent: it is versioned and never edited, and the
 * enrollment freezes the `plan_price_id` in force (CLAUDE.md §5). Editing a
 * price from a course screen is how history gets revalidated.
 */
export interface CourseRow {
  id: string
  name: string
  language: CourseLanguage
  /** Catalog label ("A1", "Inicial", "B1") — data, not an enum. */
  level: string
  /** Minimum age, per course (`docs/REGRAS-NEGOCIO.md` §2). */
  minAge: number
  modules: number
  totalHours: number
  certificateRule: CertificateRule
  /** Administrative procedures the course offers (`docs/REGRAS-NEGOCIO.md` §5). */
  allowsFreeze: boolean
  allowsTransfer: boolean
  /** Out of the catalog does not delete anything — running class groups stay. */
  active: boolean
  /** Class groups already opened from this course. */
  classGroupCount: number
}

/** The subset of a course that coordination may change. */
export type CourseOptions = Pick<
  CourseRow,
  | 'minAge'
  | 'modules'
  | 'totalHours'
  | 'certificateRule'
  | 'allowsFreeze'
  | 'allowsTransfer'
  | 'active'
>

/** One student as seen from the class group — grade first, money second. */
export interface ClassGroupStudent {
  studentId: string
  fullName: string
  enrollmentId: string
  enrollmentStatus: EnrollmentStatus
  paymentStatus: PaymentStatus
  /** 0–20, the Peruvian scale. Null while the teacher has not closed it. */
  finalGrade: number | null
  gradeStatus: GradeStatus
  /** Null unless the course certifies through an exam. */
  certificationExam: CertificationExamStatus | null
  certificateIssuedAt: string | null
  delivery: DocumentDelivery | null
  /** Administrative procedure already applied, if any. */
  procedure: EnrollmentProcedure | null
}

/**
 * What an administrative procedure did to an enrollment
 * (`docs/REGRAS-NEGOCIO.md` §5). Every one of them is paid and coordinated
 * outside the platform today, which is why the backoffice records the outcome
 * instead of triggering it.
 */
export type EnrollmentProcedure = 'frozen' | 'transferred' | 'withdrawn'

export type ProcedureAction = 'transfer' | 'freeze' | 'withdraw'

/** Why a procedure is not on the table — a code the locale turns into text. */
export type ProcedureBlockReason =
  | 'already_applied'
  | 'group_not_running'
  | 'enrollment_not_active'
  | 'payment_not_approved'
  | 'not_offered'
  | 'no_seats_elsewhere'

export interface ClassGroupDetail extends ClassGroupRow {
  students: ClassGroupStudent[]
}

/** Why a student is out of the batch — a code the locale turns into text. */
export type CertificateBlockReason =
  | 'grade_pending'
  | 'grade_below_minimum'
  | 'auto_failed'
  | 'payment_not_approved'
  | 'enrollment_not_completed'
  | 'exam_not_approved'
  | 'already_issued'
