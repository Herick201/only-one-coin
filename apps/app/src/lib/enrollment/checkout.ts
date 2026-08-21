import { z } from 'zod'
import { ageFrom } from '@/lib/format'
import type {
  CatalogClassGroup,
  CatalogCourse,
  CheckoutDraft,
  EnrollmentSource,
  GuardianDraft,
  PaymentDraft,
  PublicCatalog,
  StudentDraft,
} from './types'

/* -------------------------------------------------------------------------- */
/* Arrival — source, campaign and prefill                                     */
/* -------------------------------------------------------------------------- */

/** Query keys the link may carry. Prefill and attribution only — never a token. */
export const QUERY_KEYS = {
  source: 'src',
  course: 'course',
  classGroup: 'group',
} as const

const CAMPAIGN_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const

/** Longest campaign value we keep; anything past this is somebody probing. */
const MAX_CAMPAIGN_LENGTH = 120

/**
 * Which channel this visit came from (`CLAUDE.md` §5). Closed union, resolved
 * once on arrival: an unrecognised `src` is `web`, never the raw string. The
 * value ends up on an enrollment row, so it can never be free text the visitor
 * chose.
 */
export function resolveSource(raw: string | undefined): EnrollmentSource {
  return raw === 'whatsapp' ? 'whatsapp' : 'web'
}

/**
 * Campaign parameters ride along in their own field, apart from the business
 * one: `source` answers "which channel sells", `utm_*` answers "which post".
 * Mixing them makes the first question unanswerable the day marketing invents
 * a sixth tag.
 */
export function resolveCampaign(
  params: Record<string, string | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const key of CAMPAIGN_KEYS) {
    const value = params[key]
    if (value) out[key] = value.slice(0, MAX_CAMPAIGN_LENGTH)
  }
  return out
}

/**
 * What the seller's link already decided. Validated against the catalog, not
 * trusted: an id that names nothing, or a class group that does not belong to
 * the course, resolves to nothing and the person picks for themselves. The link
 * can preselect; it can never assert.
 */
export function resolvePrefill(
  catalog: PublicCatalog,
  params: Record<string, string | undefined>,
): { languageId: string | null; courseId: string | null; classGroupId: string | null } {
  const course =
    catalog.courses.find((item) => item.id === params[QUERY_KEYS.course]) ?? null
  if (!course) {
    return { languageId: null, courseId: null, classGroupId: null }
  }
  const group =
    catalog.classGroups.find(
      (item) =>
        item.id === params[QUERY_KEYS.classGroup] &&
        item.courseId === course.id &&
        hasSeat(item),
    ) ?? null
  return {
    languageId: course.languageId,
    courseId: course.id,
    classGroupId: group?.id ?? null,
  }
}

/* -------------------------------------------------------------------------- */
/* Catalog reads                                                              */
/* -------------------------------------------------------------------------- */

export function hasSeat(group: CatalogClassGroup): boolean {
  return group.seatsTaken < group.capacity
}

export function seatsLeft(group: CatalogClassGroup): number {
  return Math.max(0, group.capacity - group.seatsTaken)
}

export function coursesOfLanguage(
  catalog: PublicCatalog,
  languageId: string | null,
): CatalogCourse[] {
  if (!languageId) return []
  return catalog.courses.filter((course) => course.languageId === languageId)
}

export function groupsOfCourse(
  catalog: PublicCatalog,
  courseId: string | null,
): CatalogClassGroup[] {
  if (!courseId) return []
  return catalog.classGroups.filter((group) => group.courseId === courseId)
}

export function planOfCourse(catalog: PublicCatalog, courseId: string | null) {
  if (!courseId) return null
  return catalog.plans.find((plan) => plan.courseId === courseId) ?? null
}

export function courseById(catalog: PublicCatalog, courseId: string | null) {
  if (!courseId) return null
  return catalog.courses.find((course) => course.id === courseId) ?? null
}

export function groupById(catalog: PublicCatalog, groupId: string | null) {
  if (!groupId) return null
  return catalog.classGroups.find((group) => group.id === groupId) ?? null
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Field-level problems, keyed by field name. The value is an i18n key inside
 * `enrollment.error`, never a sentence: error copy is UI text like any other
 * and lives in the locale files (`CLAUDE.md` §4).
 */
export type FieldErrors<T extends string> = Partial<Record<T, string>>

export type StudentField = keyof StudentDraft | 'minAge'
export type GuardianField = keyof GuardianDraft
export type PaymentField = keyof PaymentDraft

/** DNI is 8 digits; CE and passport are alphanumeric and vary by country. */
const NATIONAL_ID_RULES = {
  DNI: /^\d{8}$/,
  CE: /^[A-Za-z0-9]{9,12}$/,
  passport: /^[A-Za-z0-9]{6,12}$/,
} as const

const emailSchema = z.string().trim().email()

/**
 * Access to the class arrives through Google Classroom
 * (`docs/REGRAS-NEGOCIO.md` §7), so a non-Google address is worth a word to the
 * reader — but only a word. Blocking it would turn a delivery preference into a
 * rejected enrollment, and that is the client's call to make, not ours.
 */
export function looksNonGoogle(email: string): boolean {
  const trimmed = email.trim().toLowerCase()
  if (!emailSchema.safeParse(trimmed).success) return false
  return !/@(gmail\.com|googlemail\.com)$/.test(trimmed)
}

export function validateStudent(
  draft: StudentDraft,
  course: CatalogCourse | null,
  now = new Date(),
): FieldErrors<StudentField> {
  const errors: FieldErrors<StudentField> = {}

  if (draft.firstName.trim().length < 2) errors.firstName = 'required'
  if (draft.lastName.trim().length < 2) errors.lastName = 'required'

  const id = draft.nationalId.trim()
  if (id === '') errors.nationalId = 'required'
  else if (!NATIONAL_ID_RULES[draft.nationalIdType].test(id))
    errors.nationalId = 'national_id_format'

  if (draft.email.trim() === '') errors.email = 'required'
  else if (!emailSchema.safeParse(draft.email).success) errors.email = 'email_format'

  if (draft.birthDate === '') {
    errors.birthDate = 'required'
  } else {
    const age = ageFrom(draft.birthDate, now)
    if (age < 0 || age > 120) errors.birthDate = 'birth_date_range'
    // Minimum age is a gate, not a warning: a course with a floor of 13 does
    // not enroll a 10-year-old and sort it out later
    // (`docs/REGRAS-NEGOCIO.md` §2).
    else if (course && age < course.minAge) errors.minAge = 'min_age'
  }

  return errors
}

export function isMinor(birthDate: string, now = new Date()): boolean {
  if (birthDate === '') return false
  const age = ageFrom(birthDate, now)
  return age >= 0 && age < 18
}

/**
 * Guardian block, filled only for a minor. The consent is the point of it: Ley
 * 29733 wants the text version, the instant and the IP (`CLAUDE.md` §8), and
 * the last two are stamped by the server at submit — the browser records only
 * that the box was ticked.
 */
export function validateGuardian(draft: GuardianDraft): FieldErrors<GuardianField> {
  const errors: FieldErrors<GuardianField> = {}

  if (draft.firstName.trim().length < 2) errors.firstName = 'required'
  if (draft.lastName.trim().length < 2) errors.lastName = 'required'

  const id = draft.nationalId.trim()
  if (id === '') errors.nationalId = 'required'
  else if (!NATIONAL_ID_RULES[draft.nationalIdType].test(id))
    errors.nationalId = 'national_id_format'

  if (draft.email.trim() === '') errors.email = 'required'
  else if (!emailSchema.safeParse(draft.email).success) errors.email = 'email_format'

  if (!draft.consentAccepted) errors.consentAccepted = 'consent_required'

  return errors
}

/** Operation numbers run 6–20 characters across Yape and the banks. */
const OPERATION_NUMBER = /^[A-Za-z0-9-]{6,20}$/

export function validatePayment(draft: PaymentDraft): FieldErrors<PaymentField> {
  const errors: FieldErrors<PaymentField> = {}

  if (draft.method === null) errors.method = 'required'

  const operation = draft.operationNumber.trim()
  if (operation === '') errors.operationNumber = 'required'
  else if (!OPERATION_NUMBER.test(operation)) errors.operationNumber = 'operation_format'

  // The hard one. Without the image there is nothing for the OCR ladder to
  // read (`CLAUDE.md` §5) and the enrollment is a line nobody can ever settle,
  // so it blocks the step rather than warning about it.
  if (draft.receipt === null) errors.receipt = 'receipt_required'

  return errors
}

export function hasErrors(errors: Record<string, string | undefined>): boolean {
  return Object.keys(errors).length > 0
}

/* -------------------------------------------------------------------------- */
/* Empty draft                                                                */
/* -------------------------------------------------------------------------- */

export function emptyDraft(source: EnrollmentSource = 'web'): CheckoutDraft {
  return {
    course: { languageId: null, courseId: null, classGroupId: null },
    student: {
      firstName: '',
      lastName: '',
      nationalIdType: 'DNI',
      nationalId: '',
      email: '',
      birthDate: '',
    },
    guardian: {
      firstName: '',
      lastName: '',
      nationalIdType: 'DNI',
      nationalId: '',
      relationship: 'mother',
      email: '',
      consentAccepted: false,
    },
    payment: { method: null, operationNumber: '', receipt: null },
    source,
    campaign: {},
  }
}
