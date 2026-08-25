import { z } from 'zod'
import { ageFrom } from '@/lib/format'
import { splitPhone } from '@/lib/geo'
import type {
  CatalogClassGroup,
  CatalogCourse,
  CheckoutDraft,
  CourseDraft,
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
): CourseDraft {
  const course =
    catalog.courses.find((item) => item.id === params[QUERY_KEYS.course]) ?? null
  if (!course) {
    return { languageId: null, courseId: null, startDate: null, classGroupId: null }
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
    startDate: group?.startDate ?? null,
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

/** One entry per date the course opens on, with what is still available on it. */
export interface StartDateOption {
  startDate: string
  /** Schedules on this date that still have a seat. */
  openGroups: number
  /** Seats left across the whole date — what "almost gone" is measured on. */
  seatsLeft: number
}

/**
 * The dates a course opens on, soonest first.
 *
 * Coordination opens class groups in the panel, and the same course routinely
 * runs "starts this week" next to "starts at the end of the month", each with
 * its own three or four schedules. Reading them as one flat list of twelve
 * options is how somebody picks a convenient hour on a date they cannot make.
 *
 * A date with no seat left on any of its schedules is dropped rather than
 * shown greyed: unlike a single full class group — where seeing that the 07:00
 * exists is worth something — a dead date teaches the reader nothing.
 */
export function startDatesOfCourse(
  catalog: PublicCatalog,
  courseId: string | null,
): StartDateOption[] {
  const byDate = new Map<string, StartDateOption>()
  for (const group of groupsOfCourse(catalog, courseId)) {
    const entry = byDate.get(group.startDate) ?? {
      startDate: group.startDate,
      openGroups: 0,
      seatsLeft: 0,
    }
    if (hasSeat(group)) {
      entry.openGroups += 1
      entry.seatsLeft += seatsLeft(group)
    }
    byDate.set(group.startDate, entry)
  }
  return [...byDate.values()]
    .filter((entry) => entry.openGroups > 0)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
}

export function groupsOnStartDate(
  catalog: PublicCatalog,
  courseId: string | null,
  startDate: string | null,
): CatalogClassGroup[] {
  if (!startDate) return []
  return groupsOfCourse(catalog, courseId).filter(
    (group) => group.startDate === startDate,
  )
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
 * The student's address has to be a personal Gmail account, and that is a
 * gate rather than advice: class access arrives through Google Classroom, and
 * the enrollment form says it in capitals — institutional and corporate
 * addresses are refused. A colegio address that stops working in December is
 * a student who loses the course they paid for.
 *
 * The guardian's address is not held to this: Classroom belongs to the student.
 */
export function isGmail(email: string): boolean {
  return /@gmail\.com$/.test(email.trim().toLowerCase())
}

/**
 * Mobile number — the sheet's CELULAR column, stored as one string with the
 * dial code (`joinPhone`), the same as the backoffice.
 *
 * Emptiness is `splitPhone`, never `phone === ''`: the field starts life
 * holding `"+51"`, which is a dial code and not a phone. The digit floor is
 * deliberately low — the Asociación does enroll students abroad, and a rule
 * that only knows Lima turns a paying student away at the last step.
 */
const MIN_DIGITS = 6

export function phoneNumberOf(phone: string): string {
  return splitPhone(phone).number.trim()
}

export function validateStudent(
  draft: StudentDraft,
  course: CatalogCourse | null,
  now = new Date(),
): FieldErrors<StudentField> {
  const errors: FieldErrors<StudentField> = {}

  if (draft.firstName.trim() === '') errors.firstName = 'required'
  if (draft.lastName.trim() === '') errors.lastName = 'required'

  const id = draft.nationalId.trim()
  if (id === '') errors.nationalId = 'required'
  else if (!NATIONAL_ID_RULES[draft.nationalIdType].test(id))
    errors.nationalId = 'national_id_format'

  const phone = phoneNumberOf(draft.phone)
  if (phone === '') errors.phone = 'required'
  else if (phone.replace(/\D/g, '').length < MIN_DIGITS) errors.phone = 'phone_format'

  if (draft.email.trim() === '') errors.email = 'required'
  else if (!emailSchema.safeParse(draft.email).success) errors.email = 'email_format'
  else if (!isGmail(draft.email)) errors.email = 'email_must_be_gmail'

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

  if (!draft.region) errors.region = 'required'
  if (draft.city.trim() === '') errors.city = 'required'

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

  if (draft.firstName.trim() === '') errors.firstName = 'required'
  if (draft.lastName.trim() === '') errors.lastName = 'required'

  const id = draft.nationalId.trim()
  if (id === '') errors.nationalId = 'required'
  else if (!NATIONAL_ID_RULES[draft.nationalIdType].test(id))
    errors.nationalId = 'national_id_format'

  const phone = phoneNumberOf(draft.phone)
  if (phone === '') errors.phone = 'required'
  else if (phone.replace(/\D/g, '').length < MIN_DIGITS) errors.phone = 'phone_format'

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
    course: {
      languageId: null,
      courseId: null,
      startDate: null,
      classGroupId: null,
    },
    student: {
      firstName: '',
      lastName: '',
      nationalIdType: 'DNI',
      nationalId: '',
      phone: '',
      email: '',
      birthDate: '',
      region: null,
      city: '',
    },
    guardian: {
      firstName: '',
      lastName: '',
      nationalIdType: 'DNI',
      nationalId: '',
      relationship: 'mother',
      phone: '',
      email: '',
      consentAccepted: false,
    },
    payment: { method: null, operationNumber: '', receipt: null },
    source,
    campaign: {},
  }
}
