/**
 * Domain shapes for the public enrollment checkout (mockup phase).
 *
 * Same treatment as the portal and backoffice type files: these mirror the
 * future database rows named in `CLAUDE.md` §4, so swapping the mock source for
 * real queries later touches the data layer and not a single component.
 *
 * Money is integer cents, always (`CLAUDE.md` §5). Nothing here carries UI
 * copy — every label is resolved from the `enrollment` i18n namespace.
 */

import type { NationalIdType, PaymentMethod } from '@/lib/portal/types'

export type { NationalIdType, PaymentMethod }

/**
 * Weekday code, resolved to a label by the locale. Declared here rather than
 * imported from the backoffice: this is a public route, and a page anyone can
 * open should not reach into the staff panel's module for a seven-value union.
 * Same codes as `lib/backoffice/types.ts` on purpose — they name the same days.
 */
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export type GuardianRelationship = 'mother' | 'father' | 'legal_guardian'

/**
 * Where the enrollment came from (`CLAUDE.md` §5, "Origem da matrícula").
 *
 * A closed union, never free text off the query string: anything we do not
 * recognise is `web`. It is a domain field on the enrollment — not an analytics
 * event — because coordination has to answer "how much of this cycle came from
 * WhatsApp" inside the backoffice, and edge analytics dies to an ad blocker.
 */
export type EnrollmentSource = 'whatsapp' | 'web'

/* -------------------------------------------------------------------------- */
/* Public catalog — what the first step can offer                             */
/* -------------------------------------------------------------------------- */

/**
 * A language the Asociación teaches. Catalog data, never a translated enum:
 * they run ~10 languages and open new ones (quechua workshops included), and
 * `CLAUDE.md` §1 is explicit that nothing language-specific belongs in code.
 */
export interface CatalogLanguage {
  id: string
  name: string
}

export interface CatalogCourse {
  id: string
  languageId: string
  name: string
  /** Catalog label ("Básico", "A1", "Kids") — data, not an enum. */
  level: string
  /** Minimum age (`docs/REGRAS-NEGOCIO.md` §2). A hard gate on step 2. */
  minAge: number
  modules: number
  totalHours: number
}

/**
 * The package being bought. Price is versioned and never edited: the enrollment
 * freezes `planPriceId` (`CLAUDE.md` §5), so the checkout shows the version in
 * force and carries its id, rather than carrying a number it could re-derive.
 */
export interface CatalogPlan {
  id: string
  courseId: string
  name: string
  planPriceId: string
  amountCents: number
  currency: 'PEN'
}

/** A turma. Never `class` — reserved word (`CLAUDE.md` §4 glossary). */
export interface CatalogClassGroup {
  id: string
  courseId: string
  /** The code the institution prints on paperwork — catalog data, not an id. */
  code: string
  teacherName: string
  weekdays: Weekday[]
  /** "HH:mm" in America/Lima. */
  startTime: string
  endTime: string
  startDate: string
  endDate: string
  capacity: number
  seatsTaken: number
}

/**
 * Where to send the money. There is no payment gateway in the platform
 * (`CLAUDE.md` §2) — the checkout shows the account and receives the proof.
 */
export interface PaymentAccount {
  method: PaymentMethod
  /** Legal holder of the account, as it appears in the banking app. */
  holder: string
  /** The number the payer types or copies: phone for Yape, account for a bank. */
  number: string
  /** Interbank transfer code, when the rail has one. */
  interbankCode: string | null
}

/**
 * The two clocks of a seat (`CLAUDE.md` §5). Both are backoffice parameters,
 * never constants in code — same reasoning as the amount tolerance.
 */
export interface CheckoutSettings {
  /** Minutes a seat is held while the person goes off to pay. */
  holdMinutes: number
  /** Days a submitted enrollment keeps its seat waiting for approval. */
  reservationDays: number
  /** Ceiling for the receipt upload, enforced again server-side. */
  maxReceiptBytes: number
  /** Version of the consent text in force (Ley 29733, `CLAUDE.md` §8). */
  consentVersion: string
}

export interface PublicCatalog {
  languages: CatalogLanguage[]
  courses: CatalogCourse[]
  plans: CatalogPlan[]
  classGroups: CatalogClassGroup[]
  accounts: PaymentAccount[]
  settings: CheckoutSettings
}

/* -------------------------------------------------------------------------- */
/* Wizard state — what the four steps collect                                 */
/* -------------------------------------------------------------------------- */

export type StepId = 'course' | 'student' | 'payment' | 'review'

export const STEP_ORDER: readonly StepId[] = [
  'course',
  'student',
  'payment',
  'review',
]

export interface CourseDraft {
  languageId: string | null
  courseId: string | null
  /**
   * Chosen before the schedule, and separately from it. The same course opens
   * on several dates — start today or with the class group at the end of the
   * month — and each date carries its own three or four schedules
   * (`docs/MATRICULA-CHECKOUT.md` §2). Collapsing the two into one long list
   * is how somebody picks a good time on the wrong date.
   */
  startDate: string | null
  classGroupId: string | null
}

/**
 * The student, in the shape the Asociación already collects
 * (`docs/MATRICULA-CHECKOUT.md` §2 carries the column list of the sheet this
 * replaces). Two of these are not obvious:
 *
 * - `fullName` is ONE field, not a nombres/apellidos pair. It is what the
 *   current form asks for, and re-splitting a Peruvian name (two surnames,
 *   compound given names) after the fact is guesswork.
 * - `phone` IS asked here. The "never ask for a phone number" rule
 *   (`docs/REGRAS-NEGOCIO.md` §5) governs the WhatsApp sales conversation,
 *   where the number is already known — not the enrollment form, which has
 *   always had a CELULAR column.
 */
export interface StudentDraft {
  fullName: string
  nationalIdType: NationalIdType
  nationalId: string
  /** Mobile number, as the sheet's CELULAR column. */
  phone: string
  /**
   * Must be a personal Gmail account belonging to the student: class access
   * arrives through Google Classroom, and the form is explicit that
   * institutional and corporate addresses are refused.
   */
  email: string
  birthDate: string
}

/**
 * Filled only when the student is under age. Most of the public is
 * (`CLAUDE.md` §1), so this is the normal path, not the exception — and the
 * consent it carries is a legal record, not a checkbox.
 */
export interface GuardianDraft {
  fullName: string
  nationalIdType: NationalIdType
  nationalId: string
  relationship: GuardianRelationship
  phone: string
  /** No Gmail constraint here: Classroom access belongs to the student. */
  email: string
  consentAccepted: boolean
}

/**
 * The receipt as the browser knows it. The file itself never travels through
 * our function — it goes straight to storage on a signed URL (`CLAUDE.md` §5),
 * so what the wizard state keeps is the description, not the bytes.
 */
export interface ReceiptDraft {
  fileName: string
  sizeBytes: number
  /** Object URL for the local preview; not persisted across a reload. */
  previewUrl: string | null
}

export interface PaymentDraft {
  method: PaymentMethod | null
  operationNumber: string
  receipt: ReceiptDraft | null
}

export interface CheckoutDraft {
  course: CourseDraft
  student: StudentDraft
  guardian: GuardianDraft
  payment: PaymentDraft
  /** Resolved once, on first arrival, and carried to submit. */
  source: EnrollmentSource
  /** Campaign parameters, kept apart from the business field, for reporting. */
  campaign: Record<string, string>
}

/**
 * The seat hold, as the server issued it. The countdown on screen reads this;
 * it does not own it — a client-side clock is comfort, never authority
 * (`docs/MATRICULA-CHECKOUT.md` §3).
 */
export interface SeatHold {
  classGroupId: string
  /** ISO 8601 UTC instant at which the seat goes back to the class group. */
  expiresAt: string
}
