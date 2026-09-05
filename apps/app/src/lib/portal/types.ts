/**
 * Domain shapes for the student portal UI (mockup phase).
 *
 * These mirror the future database rows described in CLAUDE.md §4 glossary and
 * §5 architecture — same names, same enums — so the UI can later swap the mock
 * source for real queries without touching a single component.
 *
 * Money is always integer cents (CLAUDE.md §5: `amount_cents INTEGER`, never
 * float). Timestamps are ISO 8601 UTC strings; the UI renders them in
 * America/Lima. Human-facing copy (labels, statuses) is NOT stored here — it is
 * resolved from the `portal` i18n namespace via enum keys.
 *
 * Everything is online (CLAUDE.md §1): there is no modality field anywhere —
 * a class is a Google Meet link, and offering anything else on screen is a
 * content bug, not a feature.
 */

export type Locale = 'es' | 'en' | 'pt'

export type NationalIdType = 'DNI' | 'CE' | 'passport'

/** Payment state machine — CLAUDE.md §5: pending → under_review → approved | rejected. */
export type PaymentStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'

/**
 * The rails the institution is paid through — lowercase codes, never translated
 * (CLAUDE.md §4 glossary).
 */
export type PaymentRail = 'yape' | 'plin' | 'bcp' | 'interbank'

/**
 * A rail, or anything else the money arrived by. `other` is not a fifth brand:
 * it is the escape hatch for the deposit that came through a bank nobody
 * listed, and it carries no label of its own — whoever records it writes what
 * it was, and that text is the label (see `formatPaymentMethod`).
 */
export type PaymentMethod = PaymentRail | 'other'

/** Seat lifecycle — CLAUDE.md §5: reserved → confirmed → released. */
export type SeatStatus = 'reserved' | 'confirmed' | 'released'

/**
 * Enrollment status shown to the student. `frozen` is the paid congelamento
 * (decision 02/09/2026): the student pauses and later returns at the exact
 * module where they stopped — never a debt, never an expiry.
 */
export type EnrollmentStatus =
  | 'under_review'
  | 'active'
  | 'frozen'
  | 'completed'
  | 'rejected'

/**
 * How this enrollment is paid (decision 02/09/2026). Every course sells the
 * package as a single payment; only English also offers `monthly` — a prepaid
 * purchase of one module at a time. Monthly is NOT an installment plan of the
 * package: no interest, no late fee, no debt. An unpaid month simply locks
 * class access in the portal (see `ClassAccessLock`).
 */
export type BillingMode = 'package' | 'monthly'

export type ModuleStatus = 'completed' | 'current' | 'upcoming'

/**
 * Why the "join class" option is locked in the portal. The lock IS the portal
 * option, never a Google Classroom integration (out of scope, CLAUDE.md §2):
 * `monthly_payment_due` — the current module's prepaid month wasn't paid;
 * `module_failed` — the student didn't pass and doesn't move on with the batch
 * (module progression decision, 02/09/2026).
 */
export type ClassAccessLock = 'monthly_payment_due' | 'module_failed' | null

export type DocumentType = 'enrollment_certificate' | 'certificate'

export type DocumentStatus = 'available' | 'pending' | 'locked'

/**
 * Paid procedures the student starts from the portal (docs/REGRAS-NEGOCIO.md
 * §5). The free certificate is NOT here — it is issued per class group by the
 * coordination and lands in documents on its own.
 */
export type RequestType =
  | 'enrollment_certificate'
  | 'certification_exam'
  | 'makeup_exam'
  | 'enrollment_freeze'

/**
 * A request is born with its receipt (same ladder as enrollment: OCR → human
 * queue) — so it never sits waiting for a payment to be attached:
 * `under_review` — receipt being validated; `in_progress` — payment approved,
 * coordination is working on it; `completed` — document delivered / freeze
 * applied; `rejected` — payment or request refused.
 */
export type RequestStatus =
  | 'under_review'
  | 'in_progress'
  | 'completed'
  | 'rejected'

export type NotificationKind =
  | 'monthly_payment_due'
  | 'document_ready'
  | 'next_level_invite'

export interface Guardian {
  id: string
  firstName: string
  lastName: string
  nationalIdType: NationalIdType
  nationalId: string
  relationship: 'mother' | 'father' | 'legal_guardian'
  email: string
  phone: string
  /** Ley 29733 consent record — CLAUDE.md §8. */
  consent: {
    version: string
    acceptedAt: string
    ip: string
  } | null
}

export interface Student {
  id: string
  firstName: string
  lastName: string
  nationalIdType: NationalIdType
  nationalId: string
  /**
   * The Gmail that receives class access (CLAUDE.md §1) — locked on the
   * profile screen; changing it is a coordination flow, never self-service.
   */
  email: string
  /** Self-service on the profile screen. */
  phone: string
  /** Optional extra contacts the student adds themself. */
  secondaryEmail: string | null
  secondaryPhone: string | null
  birthDate: string
  /** Derived from birthDate; drives the guardian-consent flow (CLAUDE.md §1). */
  isMinor: boolean
  guardian: Guardian | null
}

/** A sellable package / plan. Price is versioned and frozen at enrollment. */
export interface Plan {
  id: string
  /** Data, not UI copy — this is a catalog row, like a DB value. */
  name: string
  priceCents: number
  currency: 'PEN'
}

export interface AcademicPeriod {
  id: string
  name: string
  startDate: string
  endDate: string
}

export interface WeeklySlot {
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number
  /** "HH:mm" in America/Lima. */
  startTime: string
  endTime: string
}

/** A turma. Never `class` — reserved word (CLAUDE.md §4 glossary). */
export interface ClassGroup {
  id: string
  courseId: string
  name: string
  teacherName: string
  schedule: WeeklySlot[]
  startDate: string
  endDate: string
  capacity: number
  seatsTaken: number
  /** External Google Meet link only — no video hosting in-platform (CLAUDE.md §2). */
  meetingUrl: string | null
}

export interface CourseMaterial {
  id: string
  title: string
  /** External link only. */
  url: string
  kind: 'doc' | 'video' | 'audio' | 'link'
}

/** One teachable block of a course. Catalog data, like the course name. */
export interface CourseModule {
  id: string
  name: string
  /** 1-based order within the course. */
  sequence: number
  startDate: string
  endDate: string
  status: ModuleStatus
}

export interface Course {
  id: string
  name: string
  /** Short blurb — catalog data. */
  summary: string
  minAge: number
  level: string
  /**
   * Inglés Básico's certificate also demands the separately-requested
   * certification exam (CLAUDE.md §1). Documents copy reads this flag.
   */
  requiresCertificationExam: boolean
  materials: CourseMaterial[]
}

export interface Payment {
  id: string
  amountCents: number
  currency: 'PEN'
  method: PaymentMethod
  status: PaymentStatus
  /** Provider operation number read from the receipt. */
  operationNumber: string | null
  /** Date on the receipt — when the student says they paid. */
  paidAt: string | null
}

/**
 * One prepaid month of a monthly (English) enrollment. `payment` is null until
 * the student uploads the receipt from the portal — that null is exactly what
 * the reminder e-mail and the portal notice point at, and what locks class
 * access once `dueDate` passes. Never a debt (CLAUDE.md §1).
 */
export interface ModulePayment {
  moduleId: string
  dueDate: string
  payment: Payment | null
}

export interface MonthlyBilling {
  /**
   * Current price of one module — the amount the next receipt must match.
   * Read-only on every screen: there are no discounts, ever (CLAUDE.md §1).
   */
  modulePriceCents: number
  currency: 'PEN'
  payments: ModulePayment[]
}

export interface Enrollment {
  id: string
  /**
   * Human-readable enrollment code the student quotes for support — course
   * short code + sequence (`IN-1122`). Generated server-side and immutable;
   * the internal `id` never reaches the screen (CLAUDE.md §4).
   */
  code: string
  status: EnrollmentStatus
  seatStatus: SeatStatus
  createdAt: string
  course: Course
  classGroup: ClassGroup
  plan: Plan
  /** Price version frozen at enrollment time (CLAUDE.md §5). */
  planPriceId: string
  academicPeriod: AcademicPeriod
  billingMode: BillingMode
  /** Present only when billingMode === 'monthly' (English, CLAUDE.md §1). */
  monthly: MonthlyBilling | null
  modules: CourseModule[]
  /**
   * The enrollment payment: the whole package, or — for monthly — the first
   * module (the one that opened the enrollment). Later months live in
   * `monthly.payments`.
   */
  payment: Payment
  /** The portal cadeado on the "join class" option (CLAUDE.md §1). */
  classAccessLock: ClassAccessLock
  /**
   * Final grade once the class group closes. ≥ 14 earns the free certificate;
   * `did_not_attempt` (DA — skipped the final exam) never does
   * (docs/DOCUMENTOS-E-CERTIFICADOS.md). Null while the course runs.
   */
  finalGrade: number | 'did_not_attempt' | null
  /** Progress 0–100 for active/completed enrollments; null while under review. */
  progressPct: number | null
}

export interface PortalDocument {
  id: string
  type: DocumentType
  status: DocumentStatus
  enrollmentId: string
  /** Present only when status === 'available'. */
  fileUrl: string | null
  issuedAt: string | null
}

/** One row of the paid-procedures price table (docs/REGRAS-NEGOCIO.md §5). */
export interface ProcedureCatalogItem {
  type: RequestType
  priceCents: number
  currency: 'PEN'
}

export interface StudentRequest {
  id: string
  type: RequestType
  status: RequestStatus
  enrollmentId: string
  /** Procedure price frozen when the request was made (CLAUDE.md §5). */
  priceCents: number
  currency: 'PEN'
  createdAt: string
  payment: Payment
  /** The delivered document, once completed — null before that. */
  resultUrl: string | null
}

export interface PortalNotification {
  id: string
  kind: NotificationKind
  createdAt: string
  /** Real course name to interpolate into the message — student data, not copy. */
  courseName: string | null
}

/**
 * A date-and-schedule choice inside a continuation offer. Start date and
 * schedule are separate choices (CLAUDE.md §1): the same course opens on
 * several dates, each with its own time slots.
 */
export interface OfferGroup {
  id: string
  name: string
  teacherName: string
  schedule: WeeklySlot[]
  startDate: string
  seatsLeft: number
}

/**
 * A next step offered inside the portal (decision 02/09/2026): whoever is
 * already a student never re-enters through the public site — next level,
 * repeat module and re-enrollment all start here, on the existing record.
 */
export interface ContinuationOffer {
  id: string
  kind: 'next_level' | 'repeat_module' | 're_enroll'
  /** Target course — catalog data. */
  courseName: string
  /** The completed course that unlocked this offer. */
  basedOnCourseName: string
  priceCents: number
  currency: 'PEN'
  groups: OfferGroup[]
}

/** Everything the portal needs for one signed-in student. */
export interface PortalSession {
  student: Student
  enrollments: Enrollment[]
  documents: PortalDocument[]
  requests: StudentRequest[]
  procedures: ProcedureCatalogItem[]
  offers: ContinuationOffer[]
  notifications: PortalNotification[]
  nextClass: NextClassOccurrence | null
}

export interface NextClassOccurrence {
  enrollmentId: string
  courseName: string
  classGroupName: string
  teacherName: string
  /** ISO UTC of the next session start. */
  startsAt: string
  meetingUrl: string | null
  /** The same cadeado the enrollment carries, so the hero card can honor it. */
  classAccessLock: ClassAccessLock
}
