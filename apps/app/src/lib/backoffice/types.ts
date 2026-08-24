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
  PaymentRail,
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
  PaymentRail,
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
  /**
   * The teacher record behind the account, when the role is `teacher`. This is
   * what scopes the panel to their own class groups — read from the
   * authenticated user's row on every sensitive request, never from anything
   * the client sends (CLAUDE.md §8).
   */
  teacherId: string | null
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
  /**
   * Free text naming the method when it is `other` — what the operator wrote,
   * and the only label that row has. Null on every rail.
   */
  paymentMethodDetail: string | null
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
  /** Null when the extraction could not read it — an illegible receipt. */
  operationNumber: string | null
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

/* -------------------------------------------------------------------------- */
/* Teachers — who runs the class groups                                        */
/* -------------------------------------------------------------------------- */

/**
 * Out of the roster does not delete anything: a teacher who stopped teaching
 * still signed the grades of every class group they ran, and those class groups
 * keep pointing at them. Same treatment as `CourseRow.active`.
 */
export type TeacherStatus = 'active' | 'inactive'

/**
 * One window a teacher is free to take a class group in, on a weekday, in
 * America/Lima. `HH:mm`, end exclusive — the same shape as
 * `ClassGroupRow.startTime`, so a class group can be laid over the window it
 * was allocated into (`docs/REQUISITOS.md` RF03).
 */
export interface AvailabilitySlot {
  weekday: Weekday
  startTime: string
  endTime: string
}

/**
 * The signed contract behind a teacher: a file and the window it covers. The
 * file is what the Asociación can produce if anybody asks; the window is what
 * the panel watches, because a teacher running a class group on an expired
 * contract is the institution's problem, not the teacher's.
 *
 * Kept as a record of a document rather than as a document: the bytes live in
 * the bucket behind a signed URL, exactly like a receipt (CLAUDE.md §8), and
 * the row keeps only what a list has to be able to show.
 */
export interface TeacherContract {
  /** What was filed, as the file was named. */
  fileName: string
  fileSizeBytes: number
  uploadedAt: string
  /** The window it covers — ISO date, rendered in America/Lima. */
  startsAt: string
  endsAt: string
}

/** One row of the teacher directory. */
export interface TeacherRow {
  id: string
  firstName: string
  lastName: string
  /**
   * The document, same shape as a student's. A teacher signs a contract, and a
   * contract is signed by somebody the institution can name on paper.
   */
  nationalIdType: NationalIdType
  nationalId: string
  email: string
  phone: string
  status: TeacherStatus
  /**
   * Languages the teacher is cleared to run a class group in — catalogue rows,
   * never a translated enum: the Asociación runs ~10 languages and opens new
   * ones, and nothing language-specific belongs in the code (CLAUDE.md §1).
   */
  languages: CourseLanguage[]
  /**
   * ISO 3166-1 alpha-2, resolved to a country name by the reader's locale.
   * Carried because origin is a selling point in the catalog — the Italian
   * class group is advertised with a "docente ítalo-peruano"
   * (`docs/REGRAS-NEGOCIO.md` §3, `docs/REQUISITOS.md` RF03) — not only
   * because it is personal data.
   */
  nationality: string
  /**
   * Where they live — not the same question as `nationality`, which is where
   * they are from. The contract needs an address; the catalog needs an origin.
   */
  country: string
  /** First-level division — `departamento` in Peru. Null outside it. */
  region: string | null
  city: string
  /** Street line: what is missing from country/region/city to post a letter. */
  addressLine: string
  /** Null while nobody has filed one — which is itself worth flagging. */
  contract: TeacherContract | null
  /**
   * Whole days to `contract.endsAt`, negative once the date has passed, null
   * with no contract on file. Computed on the server clock and handed down like
   * the reservation countdown: computing it inside the component would hydrate
   * a different number than it rendered.
   */
  contractDaysLeft: number | null
  /** Class groups still enrolling or running. */
  activeClassGroups: number
  /** Seats taken across those class groups — the teaching load, in people. */
  studentCount: number
  /** Final grades still open across the class groups they run. */
  pendingGrades: number
  /** Finished class groups of theirs still owing a certificate. */
  pendingCertificates: number
  joinedAt: string
}

/**
 * Full teacher file. The class groups are the ones already allocated to them;
 * the availability is what the next allocation is drawn from — the two are read
 * together, which is why the file carries both.
 */
export interface TeacherDetail extends TeacherRow {
  availability: AvailabilitySlot[]
  classGroups: ClassGroupRow[]
}

/** What the creation form fills in. The rest is derived from the class groups. */
export type NewTeacher = Pick<
  TeacherRow,
  | 'firstName'
  | 'lastName'
  | 'nationalIdType'
  | 'nationalId'
  | 'email'
  | 'phone'
  | 'nationality'
  | 'country'
  | 'region'
  | 'city'
  | 'addressLine'
  | 'languages'
  | 'contract'
> & { availability: AvailabilitySlot[] }

/* -------------------------------------------------------------------------- */
/* Payments — the ledger, the human decision and the validation parameters     */
/* -------------------------------------------------------------------------- */

/**
 * What a payment is for. `payments` is agnostic of origin (CLAUDE.md §5): an
 * enrollment and a paid procedure (the constancia, `docs/REGRAS-NEGOCIO.md`
 * §5) travel the same states and the same OCR ladder. A discriminated union
 * instead of a loose string so the document type reaches the screen as a code
 * the locale resolves, never as text (CLAUDE.md §4).
 */
export type PaymentConcept =
  | { kind: 'course'; courseName: string }
  | { kind: 'document'; type: DocumentType }

/** One line of the payment ledger. */
export interface PaymentRow {
  id: string
  studentId: string
  studentName: string
  concept: PaymentConcept
  status: PaymentStatus
  /** Null while the student has not uploaded a receipt yet. */
  method: PaymentMethod | null
  /** What the receipt says — equals the expected value once approved. */
  amountCents: number
  /** The frozen plan price / procedure fee it is checked against. */
  expectedAmountCents: number
  currency: 'PEN'
  operationNumber: string | null
  submittedAt: string
  /** When a human or the ladder settled it. Null while it is still open. */
  decidedAt: string | null
  decidedByName: string | null
  /** Only while under review — why the ladder handed it to a human. */
  flag: ReviewFlag | null
}

/**
 * Headline numbers of the payments section. Scoped to the academic period, not
 * to "today": the period is what the treasury closes against, and a daily
 * figure on a screen nobody opens on a Sunday reads as zero collection.
 */
export interface PaymentMetrics {
  inReview: number
  oldestPendingHours: number
  approved: number
  collectedCents: number
  rejected: number
  periodName: string
}

/** A field the extraction reads off the receipt. */
export type ExtractionField =
  | 'operation_number'
  | 'amount'
  | 'paid_at'
  | 'payer_name'
  | 'method'

/**
 * What the model read, kept as domain data rather than as a formatted string:
 * money is cents, an instant is ISO, the rail is a code. The sheet renders it
 * in the reader's locale (CLAUDE.md §4) — a mock that stores "S/ 69,90" would
 * print the same in the three languages.
 */
export type ExtractedValue =
  | { kind: 'text'; text: string }
  | { kind: 'money'; amountCents: number; currency: 'PEN' }
  | { kind: 'timestamp'; iso: string }
  | { kind: 'method'; method: PaymentMethod }
  /** The model could not read the field — that is a value, not a missing one. */
  | { kind: 'unreadable' }

export interface ExtractedField {
  field: ExtractionField
  value: ExtractedValue
  /** Per-field confidence, 0–1 — recorded on every extraction (CLAUDE.md §5). */
  confidence: number
}

/**
 * Everything a human needs to settle one receipt: the image, what the model
 * read off it, and what the system expected. Deciding is the one action that
 * cannot be taken from the student file — it is a usecase of its own with its
 * own audit entry (CLAUDE.md §8).
 */
export interface ReceiptExtraction {
  paymentId: string
  studentId: string
  studentName: string
  concept: PaymentConcept
  flag: ReviewFlag
  /** OCR ladder tier that produced this extraction, 0–3. */
  tier: number
  /** Brand name of the model — a proper noun, like the payment rails. */
  modelName: string
  modelVersion: string
  /**
   * Processed image (downscaled, grayscale, EXIF stripped — CLAUDE.md §5) held
   * for 5 years. In production a signed URL of 5 minutes, scoped to the
   * student (CLAUDE.md §8); null here because no storage is wired yet.
   */
  imageUrl: string | null
  fields: ExtractedField[]
  amountCents: number
  expectedAmountCents: number
  /** Tolerance in force when the receipt was validated — a backoffice setting. */
  toleranceCents: number
  method: PaymentMethod
  submittedAt: string
  /** Tier 0: the pHash matched a receipt already approved. */
  duplicateOf: {
    studentName: string
    operationNumber: string | null
    approvedAt: string
  } | null
  /**
   * Tier 2 reading from a model of another family. Agreement is the criterion,
   * never the more expensive model (CLAUDE.md §5) — so both readings are shown
   * side by side and the vendor is not what settles it.
   */
  secondOpinion: {
    operationNumber: string | null
    amountCents: number
    confidence: number
  } | null
}

/** Why a human turned a receipt down — recorded with the rejection. */
export type RejectionReason =
  | 'amount_mismatch'
  | 'illegible'
  | 'duplicate'
  | 'not_a_receipt'
  | 'other'

/** The human decision over a receipt. Approving carries no reason: the tier
 *  ladder already said why it was here, and the audit entry records who. */
export type ReviewDecision =
  | { kind: 'approve' }
  | { kind: 'reject'; reason: RejectionReason; note: string }

/**
 * The parameters the payment pipeline reads instead of constants in the code.
 * Tolerance is required to live here (CLAUDE.md §5); the other two are the
 * numbers `CLAUDE.md` already fixes (the 5-day reservation, the confidence
 * that escalates) and still to be confirmed as editable.
 */
export interface PaymentSettings {
  /** How far a receipt may fall from the frozen price and still pass. */
  toleranceCents: number
  /** Below this per-field confidence the ladder escalates, 0–1. */
  escalationConfidence: number
  /** Days a reserved seat survives without an approved payment. */
  reservationDays: number
  /**
   * Minutes the public checkout holds a seat while the person goes off to pay
   * (`CLAUDE.md` §5, "Dois relógios"). The short clock of the pair: it runs
   * from the class group being chosen to the receipt arriving, and `reservationDays`
   * takes over from there.
   */
  checkoutHoldMinutes: number
}

/* -------------------------------------------------------------------------- */
/* Enrollments — who holds a seat, across every class group                    */
/* -------------------------------------------------------------------------- */

/**
 * One line of the enrollment ledger. Deliberately not the same shape as
 * `EnrollmentHistoryItem`: that one is read from inside a student's file, where
 * the person is already known, and this one is read across the institution,
 * where the person is the first thing the row has to say.
 */
export interface EnrollmentRow {
  id: string
  /**
   * The tracking code printed on the checkout's confirmation screen — what the
   * student quotes on the phone. Not `id`: an internal row id is not something
   * anybody should be reading out loud, and a code that only exists on the
   * student's side is a code nobody here can look up (`CLAUDE.md` §4).
   */
  code: string
  studentId: string
  studentName: string
  courseName: string
  /** Null when no class group roster claims this enrollment (mock gap only). */
  classGroupId: string | null
  classGroupName: string
  teacherName: string
  /** Null for a course no longer in the catalog — history keeps its own name. */
  language: CourseLanguage | null
  modality: ClassModality
  academicPeriodName: string
  status: EnrollmentStatus
  seatStatus: SeatStatus
  planName: string
  /** Frozen price version at enrollment time (CLAUDE.md §5). */
  planPriceId: string
  amountCents: number
  currency: 'PEN'
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  /**
   * Free text naming the method when it is `other` — what the operator wrote,
   * and the only label that row has. Null on every rail.
   */
  paymentMethodDetail: string | null
  operationNumber: string | null
  createdAt: string
  paidAt: string | null
  progressPct: number | null
}

/**
 * Headline numbers of the section, scoped to the academic period for the same
 * reason the payment ones are (`PaymentMetrics`): the ciclo is what the
 * institution closes against, and a daily count reads as zero on a Sunday.
 */
export interface EnrollmentMetrics {
  periodName: string
  total: number
  active: number
  /** Seats held by an enrollment whose payment is not settled yet. */
  reserved: number
  /** Of those, the ones the cron releases within a day. */
  expiringSoon: number
  /** Seats already handed back — a rejected payment or an expired reservation. */
  released: number
}

/**
 * A seat held while the money is still open. The reservation expires after
 * `PaymentSettings.reservationDays` and a cron hands the seat back
 * (CLAUDE.md §5) — which is why this is a screen and not a filter: nobody
 * chases a deadline they have to remember to filter for.
 */
export interface SeatReservation {
  enrollmentId: string
  studentId: string
  studentName: string
  courseName: string
  classGroupName: string
  classGroupId: string | null
  paymentStatus: PaymentStatus
  /** Why the receipt is sitting with a human, when it is. */
  flag: ReviewFlag | null
  /**
   * The queued receipt holding this seat up, when there is one. It is what
   * lets the row open that receipt instead of dropping the reader into the
   * whole queue to find it again. Null while nobody has uploaded anything.
   */
  reviewId: string | null
  amountCents: number
  currency: 'PEN'
  reservedAt: string
  /** When the cron releases the seat if nothing settles the payment. */
  expiresAt: string
  /** Whole hours to `expiresAt`; negative once the deadline has passed. */
  hoursLeft: number
}

/** A plan as the enrollment form reads it: the price in force, never editable. */
export interface PlanPrice {
  courseName: string
  planName: string
  planPriceId: string
  amountCents: number
  currency: 'PEN'
}

/** What the backoffice form needs to open an enrollment over an existing student. */
export interface NewEnrollmentInput {
  studentId: string
  classGroupId: string
  method: PaymentMethod
  /** Only when `method` is `other`: what the operator wrote it was. */
  methodDetail: string | null
  operationNumber: string
  /** Whether the staff member attached the receipt image while filling this in. */
  receiptAttached: boolean
}
