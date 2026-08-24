import type {
  CatalogClassGroup,
  CatalogCourse,
  CatalogLanguage,
  CatalogPlan,
  PaymentAccount,
  PublicCatalog,
} from './types'

/**
 * Mock catalog for the public checkout. Shaped like the query that will replace
 * it, so the screens never learn where the data came from.
 *
 * The names, ages and prices trace to `docs/REGRAS-NEGOCIO.md` §1, §2 and §4 —
 * the survey of how the Asociación sells today. They are catalog rows, not UI
 * copy, which is why they are literals here and not locale keys: a course is
 * called "Inglés Básico" in every language, the same way `Yape` is.
 *
 * Teachers, class group codes and seat counts ARE invented — placeholders until
 * the real academic period is loaded. Never seeded anywhere but a mock.
 */

const languages: CatalogLanguage[] = [
  { id: 'lang_en', name: 'Inglés' },
  { id: 'lang_fr', name: 'Francés' },
  { id: 'lang_pt', name: 'Portugués' },
  { id: 'lang_it', name: 'Italiano' },
  { id: 'lang_de', name: 'Alemán' },
  { id: 'lang_zh', name: 'Chino Mandarín' },
  { id: 'lang_ko', name: 'Coreano' },
]

/**
 * English is the only language with a kids track and with levels; every other
 * language sells one complete package (`docs/REGRAS-NEGOCIO.md` §1). The age
 * floors come from §2 — 6 for kids, 13 for everything else.
 */
const courses: CatalogCourse[] = [
  {
    id: 'crs_en_kids',
    languageId: 'lang_en',
    name: 'Inglés Kids',
    level: 'Kids',
    minAge: 6,
    modules: 4,
    totalHours: 80,
  },
  {
    id: 'crs_en_basic',
    languageId: 'lang_en',
    name: 'Inglés Básico',
    level: 'Básico',
    minAge: 13,
    modules: 4,
    totalHours: 80,
  },
  {
    id: 'crs_en_upper',
    languageId: 'lang_en',
    name: 'Inglés Intermedio y Avanzado',
    level: 'Intermedio · Avanzado',
    minAge: 13,
    modules: 2,
    totalHours: 80,
  },
  {
    id: 'crs_fr_full',
    languageId: 'lang_fr',
    name: 'Francés Completo',
    level: 'Básico a Avanzado',
    minAge: 13,
    modules: 3,
    totalHours: 200,
  },
  {
    id: 'crs_pt_full',
    languageId: 'lang_pt',
    name: 'Portugués Completo',
    level: 'Básico a Avanzado',
    minAge: 13,
    modules: 4,
    totalHours: 80,
  },
  {
    id: 'crs_it_basic',
    languageId: 'lang_it',
    name: 'Italiano Básico',
    level: 'Básico',
    minAge: 13,
    modules: 3,
    totalHours: 80,
  },
  {
    id: 'crs_de_basic',
    languageId: 'lang_de',
    name: 'Alemán Básico',
    level: 'Básico',
    minAge: 13,
    modules: 3,
    totalHours: 80,
  },
  {
    id: 'crs_zh_basic',
    languageId: 'lang_zh',
    name: 'Chino Mandarín Básico Intensivo',
    level: 'Básico intensivo',
    minAge: 13,
    modules: 2,
    totalHours: 80,
  },
  {
    id: 'crs_ko_full',
    languageId: 'lang_ko',
    name: 'Coreano Completo',
    level: 'Básico a Avanzado',
    minAge: 13,
    modules: 4,
    totalHours: 80,
  },
]

/**
 * One plan per course: quantity is always one course per person, and there is
 * no à-la-carte module (`docs/REGRAS-NEGOCIO.md` §1 and §5). Prices are §4;
 * `planPriceId` is what the enrollment freezes, so correcting the table later
 * cannot revalidate history (`CLAUDE.md` §5).
 */
const plans: CatalogPlan[] = [
  { id: 'pln_en_kids', courseId: 'crs_en_kids', name: 'Paquete completo', planPriceId: 'pp_en_kids_v1', amountCents: 6990, currency: 'PEN' },
  { id: 'pln_en_basic', courseId: 'crs_en_basic', name: 'Paquete completo', planPriceId: 'pp_en_basic_v3', amountCents: 6990, currency: 'PEN' },
  { id: 'pln_en_upper', courseId: 'crs_en_upper', name: 'Paquete completo', planPriceId: 'pp_en_upper_v2', amountCents: 7990, currency: 'PEN' },
  { id: 'pln_fr_full', courseId: 'crs_fr_full', name: 'Paquete completo', planPriceId: 'pp_fr_full_v1', amountCents: 8000, currency: 'PEN' },
  { id: 'pln_pt_full', courseId: 'crs_pt_full', name: 'Paquete completo', planPriceId: 'pp_pt_full_v1', amountCents: 8000, currency: 'PEN' },
  { id: 'pln_it_basic', courseId: 'crs_it_basic', name: 'Paquete completo', planPriceId: 'pp_it_basic_v1', amountCents: 8000, currency: 'PEN' },
  { id: 'pln_de_basic', courseId: 'crs_de_basic', name: 'Paquete completo', planPriceId: 'pp_de_basic_v1', amountCents: 3000, currency: 'PEN' },
  { id: 'pln_zh_basic', courseId: 'crs_zh_basic', name: 'Paquete completo', planPriceId: 'pp_zh_basic_v1', amountCents: 9500, currency: 'PEN' },
  { id: 'pln_ko_full', courseId: 'crs_ko_full', name: 'Paquete completo', planPriceId: 'pp_ko_full_v1', amountCents: 6000, currency: 'PEN' },
]

/**
 * Class groups, as coordination opens them in the panel.
 *
 * The shape that matters here is that **a course opens on more than one date**,
 * and each date carries its own handful of schedules: start with the group that
 * begins this week, or with the one at the end of the month, and either way
 * pick from three or four hours. That is why step 1 asks for the date before
 * the schedule — twelve rows in one list is where somebody picks a convenient
 * hour on a date they cannot make.
 *
 * One full class group is included on purpose (`cg_en_basic_c`): the step has
 * to show what a full one looks like, because the seat is claimed by one atomic
 * instruction on the server (`CLAUDE.md` §5) and a form that offers a full
 * class group is a form whose submit fails after the reader filled everything
 * in.
 */
const classGroups: CatalogClassGroup[] = [
  // Inglés Kids — starts 05 Sep and 03 Oct
  { id: 'cg_en_kids_a', courseId: 'crs_en_kids', code: 'ENK-2601-A', teacherName: 'Rosa Quispe', slots: [{ weekday: 'sat', startTime: '09:00', endTime: '12:00' }], startDate: '2026-09-05', endDate: '2027-01-30', capacity: 45, seatsTaken: 31 },
  { id: 'cg_en_kids_b', courseId: 'crs_en_kids', code: 'ENK-2601-B', teacherName: 'Diego Salas', slots: [{ weekday: 'tue', startTime: '17:00', endTime: '18:30' }, { weekday: 'thu', startTime: '17:00', endTime: '18:30' }], startDate: '2026-09-05', endDate: '2027-01-28', capacity: 45, seatsTaken: 12 },
  { id: 'cg_en_kids_c', courseId: 'crs_en_kids', code: 'ENK-2602-A', teacherName: 'Rosa Quispe', slots: [{ weekday: 'sat', startTime: '15:00', endTime: '18:00' }], startDate: '2026-10-03', endDate: '2027-02-27', capacity: 45, seatsTaken: 4 },
  { id: 'cg_en_kids_d', courseId: 'crs_en_kids', code: 'ENK-2602-B', teacherName: 'Diego Salas', slots: [{ weekday: 'mon', startTime: '17:00', endTime: '18:30' }, { weekday: 'wed', startTime: '17:00', endTime: '18:30' }], startDate: '2026-10-03', endDate: '2027-02-24', capacity: 45, seatsTaken: 9 },

  // Inglés Básico — starts 07 Sep (four schedules, one already full) and 28 Sep
  { id: 'cg_en_basic_a', courseId: 'crs_en_basic', code: 'ENB-2601-A', teacherName: 'Milagros Fernández', slots: [{ weekday: 'mon', startTime: '19:00', endTime: '20:30' }, { weekday: 'wed', startTime: '19:00', endTime: '20:30' }], startDate: '2026-09-07', endDate: '2027-02-19', capacity: 50, seatsTaken: 38 },
  { id: 'cg_en_basic_b', courseId: 'crs_en_basic', code: 'ENB-2601-B', teacherName: 'Carlos Ramírez', slots: [{ weekday: 'sat', startTime: '15:00', endTime: '18:00' }], startDate: '2026-09-07', endDate: '2027-02-20', capacity: 50, seatsTaken: 47 },
  { id: 'cg_en_basic_c', courseId: 'crs_en_basic', code: 'ENB-2601-C', teacherName: 'Milagros Fernández', slots: [{ weekday: 'tue', startTime: '07:00', endTime: '08:30' }, { weekday: 'thu', startTime: '07:00', endTime: '08:30' }], startDate: '2026-09-07', endDate: '2027-02-18', capacity: 50, seatsTaken: 50 },
  { id: 'cg_en_basic_d', courseId: 'crs_en_basic', code: 'ENB-2601-D', teacherName: 'Carlos Ramírez', slots: [{ weekday: 'mon', startTime: '20:30', endTime: '21:30' }, { weekday: 'wed', startTime: '20:30', endTime: '21:30' }, { weekday: 'fri', startTime: '19:00', endTime: '21:00' }], startDate: '2026-09-07', endDate: '2027-02-19', capacity: 50, seatsTaken: 21 },
  { id: 'cg_en_basic_e', courseId: 'crs_en_basic', code: 'ENB-2602-A', teacherName: 'Lucero Ávalos', slots: [{ weekday: 'tue', startTime: '19:00', endTime: '20:30' }, { weekday: 'thu', startTime: '19:00', endTime: '20:30' }], startDate: '2026-09-28', endDate: '2027-03-11', capacity: 50, seatsTaken: 6 },
  { id: 'cg_en_basic_f', courseId: 'crs_en_basic', code: 'ENB-2602-B', teacherName: 'Lucero Ávalos', slots: [{ weekday: 'sat', startTime: '09:00', endTime: '12:00' }], startDate: '2026-09-28', endDate: '2027-03-13', capacity: 50, seatsTaken: 14 },

  // Inglés Intermedio y Avanzado — intensive, starts 07 Sep and 05 Oct
  { id: 'cg_en_upper_a', courseId: 'crs_en_upper', code: 'ENA-2601-A', teacherName: 'Andrea Villanueva', slots: [{ weekday: 'mon', startTime: '20:00', endTime: '21:30' }, { weekday: 'wed', startTime: '20:00', endTime: '21:30' }, { weekday: 'fri', startTime: '20:00', endTime: '21:30' }], startDate: '2026-09-07', endDate: '2026-11-13', capacity: 45, seatsTaken: 19 },
  { id: 'cg_en_upper_b', courseId: 'crs_en_upper', code: 'ENA-2601-B', teacherName: 'Andrea Villanueva', slots: [{ weekday: 'tue', startTime: '09:00', endTime: '13:00' }, { weekday: 'thu', startTime: '06:30', endTime: '08:30' }], startDate: '2026-09-07', endDate: '2026-11-12', capacity: 45, seatsTaken: 33 },
  { id: 'cg_en_upper_c', courseId: 'crs_en_upper', code: 'ENA-2602-A', teacherName: 'Andrea Villanueva', slots: [{ weekday: 'sat', startTime: '08:00', endTime: '12:00' }], startDate: '2026-10-05', endDate: '2026-12-12', capacity: 45, seatsTaken: 7 },

  // Other languages — two dates each, fewer schedules
  { id: 'cg_fr_full_a', courseId: 'crs_fr_full', code: 'FRC-2601-A', teacherName: 'Pierre Delacroix', slots: [{ weekday: 'tue', startTime: '19:00', endTime: '21:00' }, { weekday: 'thu', startTime: '19:00', endTime: '21:00' }], startDate: '2026-09-08', endDate: '2027-02-04', capacity: 40, seatsTaken: 22 },
  { id: 'cg_fr_full_b', courseId: 'crs_fr_full', code: 'FRC-2601-B', teacherName: 'Pierre Delacroix', slots: [{ weekday: 'sat', startTime: '14:00', endTime: '18:00' }], startDate: '2026-09-08', endDate: '2027-02-06', capacity: 40, seatsTaken: 37 },
  { id: 'cg_fr_full_c', courseId: 'crs_fr_full', code: 'FRC-2602-A', teacherName: 'Camille Roux', slots: [{ weekday: 'mon', startTime: '18:30', endTime: '20:30' }, { weekday: 'wed', startTime: '18:30', endTime: '20:30' }], startDate: '2026-10-05', endDate: '2027-03-03', capacity: 40, seatsTaken: 5 },
  { id: 'cg_pt_full_a', courseId: 'crs_pt_full', code: 'PTC-2601-A', teacherName: 'Beatriz Nunes', slots: [{ weekday: 'mon', startTime: '18:00', endTime: '19:30' }, { weekday: 'wed', startTime: '18:00', endTime: '19:30' }], startDate: '2026-09-07', endDate: '2027-01-27', capacity: 40, seatsTaken: 8 },
  { id: 'cg_pt_full_b', courseId: 'crs_pt_full', code: 'PTC-2602-A', teacherName: 'Beatriz Nunes', slots: [{ weekday: 'sat', startTime: '10:00', endTime: '13:00' }], startDate: '2026-10-03', endDate: '2027-02-27', capacity: 40, seatsTaken: 3 },
  { id: 'cg_it_basic_a', courseId: 'crs_it_basic', code: 'ITB-2601-A', teacherName: 'Marco Bianchi', slots: [{ weekday: 'sat', startTime: '10:00', endTime: '13:00' }], startDate: '2026-09-05', endDate: '2026-12-05', capacity: 35, seatsTaken: 27 },
  { id: 'cg_it_basic_b', courseId: 'crs_it_basic', code: 'ITB-2602-A', teacherName: 'Marco Bianchi', slots: [{ weekday: 'tue', startTime: '19:30', endTime: '21:00' }, { weekday: 'thu', startTime: '19:30', endTime: '21:00' }], startDate: '2026-10-06', endDate: '2027-01-07', capacity: 35, seatsTaken: 2 },
  { id: 'cg_de_basic_a', courseId: 'crs_de_basic', code: 'DEB-2601-A', teacherName: 'Katrin Hoffmann', slots: [{ weekday: 'tue', startTime: '20:00', endTime: '21:30' }, { weekday: 'thu', startTime: '20:00', endTime: '21:30' }], startDate: '2026-09-08', endDate: '2026-12-10', capacity: 35, seatsTaken: 15 },
  { id: 'cg_de_basic_b', courseId: 'crs_de_basic', code: 'DEB-2602-A', teacherName: 'Katrin Hoffmann', slots: [{ weekday: 'sat', startTime: '09:00', endTime: '12:00' }], startDate: '2026-10-10', endDate: '2027-01-16', capacity: 35, seatsTaken: 1 },
  { id: 'cg_zh_basic_a', courseId: 'crs_zh_basic', code: 'ZHB-2601-A', teacherName: 'Li Wei', slots: [{ weekday: 'mon', startTime: '19:30', endTime: '21:00' }, { weekday: 'wed', startTime: '19:30', endTime: '21:00' }, { weekday: 'fri', startTime: '19:30', endTime: '21:00' }], startDate: '2026-09-07', endDate: '2026-11-06', capacity: 30, seatsTaken: 11 },
  { id: 'cg_zh_basic_b', courseId: 'crs_zh_basic', code: 'ZHB-2602-A', teacherName: 'Li Wei', slots: [{ weekday: 'sat', startTime: '15:00', endTime: '18:00' }], startDate: '2026-10-03', endDate: '2026-12-12', capacity: 30, seatsTaken: 6 },
  { id: 'cg_ko_full_a', courseId: 'crs_ko_full', code: 'KOC-2601-A', teacherName: 'Ji-woo Park', slots: [{ weekday: 'sat', startTime: '09:00', endTime: '12:00' }], startDate: '2026-09-05', endDate: '2027-01-30', capacity: 35, seatsTaken: 20 },
  { id: 'cg_ko_full_b', courseId: 'crs_ko_full', code: 'KOC-2601-B', teacherName: 'Ji-woo Park', slots: [{ weekday: 'mon', startTime: '20:00', endTime: '21:30' }, { weekday: 'wed', startTime: '20:00', endTime: '21:30' }], startDate: '2026-09-05', endDate: '2027-01-27', capacity: 35, seatsTaken: 29 },
  { id: 'cg_ko_full_c', courseId: 'crs_ko_full', code: 'KOC-2602-A', teacherName: 'Ji-woo Park', slots: [{ weekday: 'tue', startTime: '18:00', endTime: '19:30' }, { weekday: 'thu', startTime: '18:00', endTime: '19:30' }], startDate: '2026-10-06', endDate: '2027-03-04', capacity: 35, seatsTaken: 2 },
]

/**
 * The rails actually in use today (`docs/REGRAS-NEGOCIO.md` §4). Plin and
 * PagoEfectivo exist in the `PaymentMethod` union as future options but are not
 * offered: a checkout that shows an account nobody watches produces a payment
 * nobody can settle.
 *
 * PayPal is deliberately absent too — it is a live rail for students abroad,
 * with its own conversion table, and extending the domain type for it is an
 * open question with the client (`docs/MATRICULA-CHECKOUT.md` §5).
 */
const accounts: PaymentAccount[] = [
  {
    method: 'yape',
    holder: 'INGLÉS POR UN SOL SAC',
    number: '951 153 323',
    interbankCode: null,
    hasQr: true,
  },
  {
    method: 'bcp',
    holder: 'INGLÉS POR UN SOL SAC',
    number: '1947124724007',
    interbankCode: '00219400712472400791',
    hasQr: false,
  },
]

export function getPublicCatalog(): PublicCatalog {
  return {
    languages,
    courses,
    plans,
    classGroups,
    accounts,
    settings: {
      // The short clock: long enough to open the banking app and pay, short
      // enough that an abandoned checkout gives the seat back the same hour.
      holdMinutes: 10,
      reservationDays: 5,
      maxReceiptBytes: 8_000_000,
      consentVersion: '2026-08-v1',
    },
  }
}
