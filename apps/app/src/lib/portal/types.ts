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

/** Enrollment status shown to the student. */
export type EnrollmentStatus =
  | 'under_review'
  | 'active'
  | 'completed'
  | 'rejected'

export type ClassModality = 'online' | 'in_person' | 'hybrid'

export type DocumentType = 'enrollment_certificate' | 'certificate'

export type DocumentStatus = 'available' | 'pending' | 'locked'

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
  email: string
  phone: string
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
  modality: ClassModality
  schedule: WeeklySlot[]
  startDate: string
  endDate: string
  capacity: number
  seatsTaken: number
  /** External meeting link only — no video hosting in-platform (CLAUDE.md §2). */
  meetingUrl: string | null
}

export interface CourseMaterial {
  id: string
  title: string
  /** External link only. */
  url: string
  kind: 'doc' | 'video' | 'audio' | 'link'
}

export interface Course {
  id: string
  name: string
  /** Short blurb — catalog data. */
  summary: string
  minAge: number
  level: string
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
  /** When the payment was credited — null until it is approved. */
  paidAt: string | null
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
  payment: Payment
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

export interface NextClassOccurrence {
  enrollmentId: string
  courseName: string
  classGroupName: string
  teacherName: string
  /** ISO UTC of the next session start. */
  startsAt: string
  modality: ClassModality
  meetingUrl: string | null
}

/** Everything the portal needs for one signed-in student. */
export interface PortalSession {
  student: Student
  enrollments: Enrollment[]
  documents: PortalDocument[]
  nextClass: NextClassOccurrence | null
}
