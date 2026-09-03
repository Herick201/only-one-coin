import type {
  AccountOverview,
  AuditEntry,
  AvailabilitySlot,
  ClassGroupDetail,
  ClassGroupRow,
  CourseLanguage,
  CourseRow,
  DashboardMetrics,
  EnrollmentMetrics,
  EnrollmentRow,
  DocumentDelivery,
  DocumentItem,
  EmailDeliveryIssue,
  EmailFlow,
  EmailMetrics,
  EmailSegment,
  EnrollmentHistoryItem,
  ExtractionField,
  PaymentMethod,
  PaymentMetrics,
  PaymentRow,
  PaymentSettings,
  PlanPrice,
  ReceiptExtraction,
  ReviewFlag,
  ReviewQueueItem,
  SeatReservation,
  SeatWatchItem,
  StaffMemberRow,
  StaffRoleChange,
  StaffUser,
  StudentDetail,
  StudentRow,
  TeacherContract,
  TeacherDetail,
  TeacherRow,
} from './types'
import { daysUntil } from './contract'

/**
 * Mock backoffice dataset for the UI/UX phase. Every value is shaped like the
 * database row it will replace (CLAUDE.md §5); swapping this module for real
 * API calls should not require touching a component.
 *
 * Prices are the honest per-course prices (e.g. Inglés S/69.90) — never a
 * discount, never the S/1 landing hook. Dates are UTC, rendered in
 * America/Lima. Names are fictional.
 */

/**
 * The signed-in staff member's own account — access, never identity. Shaped
 * like the rows behind it: the protected `user` row (CLAUDE.md §8), the
 * password/second-factor state beside it, and the open sessions the auth
 * library keeps. Swapping this for real queries should not touch a component.
 *
 * The sessions are deliberately more than one, and one of them is a phone in a
 * different city: the screen only earns its place if there is something to
 * recognise — or not recognise — on it.
 */
export function getAccountOverview(): AccountOverview {
  return {
    // Only the identity half is real elsewhere now (`lib/backoffice/session`,
    // used by the panel shell) — the rest of this account screen (password,
    // MFA, open sessions) is still mock, so this stays a literal rather than
    // reaching for the real session and making every caller async for a
    // field the rest of the object doesn't back yet.
    user: {
      id: 'staff_01',
      firstName: 'Lucía',
      lastName: 'Ramírez',
      email: 'lucia.ramirez@onlyonecoin.edu.pe',
      role: 'admin',
      teacherId: null,
    },
    security: {
      passwordUpdatedAt: '2026-05-14T13:40:00Z',
      mfa: {
        enabled: true,
        method: 'totp',
        enrolledAt: '2026-02-03T15:12:00Z',
        recoveryCodesLeft: 8,
      },
      lastSignInAt: '2026-08-21T13:02:00Z',
    },
    sessions: [
      {
        id: 'sess_01',
        browser: 'Chrome 141',
        os: 'Windows 11',
        ip: '190.235.14.72',
        city: 'Lima',
        country: 'PE',
        lastActiveAt: '2026-08-21T13:02:00Z',
        current: true,
      },
      {
        id: 'sess_02',
        browser: 'Safari 18',
        os: 'iOS 19',
        ip: '181.65.202.9',
        city: 'Arequipa',
        country: 'PE',
        lastActiveAt: '2026-08-19T22:41:00Z',
        current: false,
      },
      {
        id: 'sess_03',
        browser: 'Firefox 132',
        os: 'Ubuntu 24.04',
        ip: '200.48.90.116',
        city: 'Lima',
        country: 'PE',
        lastActiveAt: '2026-08-12T09:18:00Z',
        current: false,
      },
    ],
  }
}

const PERIOD = 'Ciclo 2026-II'

function enrollment(
  partial: Partial<EnrollmentHistoryItem> & Pick<EnrollmentHistoryItem, 'id'>,
): EnrollmentHistoryItem {
  return {
    status: 'active',
    seatStatus: 'confirmed',
    createdAt: '2026-07-02T14:20:00Z',
    courseName: 'Inglés Básico A1',
    classGroupName: 'A1 — Lun/Mié 18:00',
    teacherName: 'Carlos Meza',
    modality: 'online',
    academicPeriodName: PERIOD,
    planName: 'Paquete completo',
    planPriceId: 'pp_en_a1_v3',
    amountCents: 6990,
    currency: 'PEN',
    paymentStatus: 'approved',
    paymentMethod: 'yape',
    paymentMethodDetail: null,
    operationNumber: '00871245',
    paidAt: '2026-07-02T14:12:00Z',
    progressPct: 45,
    ...partial,
  }
}

function audit(
  partial: Partial<AuditEntry> & Pick<AuditEntry, 'id' | 'action' | 'at'>,
): AuditEntry {
  return {
    actorName: 'Lucía Ramírez',
    actorRole: 'admin',
    reference: null,
    ...partial,
  }
}

/**
 * Fee for the constancia de matrícula (`docs/REGRAS-NEGOCIO.md` §5: S/25).
 * A backoffice setting in the real system, never a constant in the code — the
 * same rule the payment tolerance follows (CLAUDE.md §5).
 */
export const CONSTANCIA_FEE_CENTS = 2500

/**
 * Minimum passing grade, 0–20 scale (`docs/REGRAS-NEGOCIO.md` §3: 14). Also a
 * backoffice setting later; it lives here so the batch preview has one source.
 */
export const PASSING_GRADE = 14

function noEmail(): DocumentDelivery {
  return { status: 'not_sent', lastSentAt: null, attempts: 0 }
}

function doc(
  partial: Partial<DocumentItem> &
    Pick<DocumentItem, 'id' | 'type' | 'enrollmentId'>,
): DocumentItem {
  return {
    status: 'available',
    issuedAt: null,
    verificationCode: null,
    issuedByName: null,
    delivery: noEmail(),
    ...partial,
  }
}

/**
 * The tail of the human review queue. One entry describes a person, the seat
 * they reserved and the receipt still waiting on a human — the student file
 * and the queue row are both derived from it, so the two screens can never
 * disagree about the same receipt.
 */
interface PendingReceipt {
  id: string
  studentId: string
  firstName: string
  lastName: string
  nationalId: string
  email: string
  phone: string
  region: string
  city: string
  birthDate: string
  courseName: string
  classGroupName: string
  teacherName: string
  method: PaymentMethod
  /** What the extraction read on the receipt. */
  amountCents: number
  /** The frozen plan price it is checked against (CLAUDE.md §5). */
  expectedAmountCents: number
  operationNumber: string | null
  flag: ReviewFlag
  tier: number
  confidence: number
  submittedAt: string
}

/** Price version each course was selling under this period. */
const PLAN_PRICE_ID: Record<string, string> = {
  'Inglés Básico A1': 'pp_en_a1_v3',
  'Inglés Intermedio B1': 'pp_en_b1_v2',
  'Francés Inicial': 'pp_fr_i_v2',
  'Alemán Inicial': 'pp_de_i_v1',
  'Italiano Inicial': 'pp_it_i_v1',
  'Portugués Inicial': 'pp_pt_i_v2',
  'Quechua Conversacional': 'pp_qu_i_v1',
}

const pendingReceipts: PendingReceipt[] = [
  {
    id: 'rev_06',
    studentId: 'stu_0009',
    firstName: 'Rosa Elena',
    lastName: 'Ccahuana Mamani',
    nationalId: '72880145',
    email: 'rosa.ccahuana@gmail.com',
    phone: '+51 984 220 118',
    region: 'Cusco',
    city: 'Cusco',
    birthDate: '2003-02-11',
    courseName: 'Quechua Conversacional',
    classGroupName: 'QU-I — Sáb 11:00',
    teacherName: 'Rosa Ccahuana',
    method: 'yape',
    amountCents: 5490,
    expectedAmountCents: 5490,
    operationNumber: '77310021',
    flag: 'low_confidence',
    tier: 2,
    confidence: 0.58,
    submittedAt: '2026-08-17T14:20:00Z',
  },
  {
    id: 'rev_07',
    studentId: 'stu_0010',
    firstName: 'Luis Enrique',
    lastName: 'Vargas Ríos',
    nationalId: '70114892',
    email: 'luis.vargas@outlook.com',
    phone: '+51 958 771 204',
    region: 'Arequipa',
    city: 'Arequipa',
    birthDate: '2001-07-23',
    courseName: 'Inglés Intermedio B1',
    classGroupName: 'B1 — Mar/Jue 19:00',
    teacherName: 'Carlos Meza',
    method: 'plin',
    amountCents: 7990,
    expectedAmountCents: 7990,
    operationNumber: null,
    flag: 'illegible',
    tier: 3,
    confidence: 0.29,
    submittedAt: '2026-08-17T16:05:00Z',
  },
  {
    id: 'rev_08',
    studentId: 'stu_0011',
    firstName: 'Fiorella',
    lastName: 'Ramos Aguilar',
    nationalId: '75620338',
    email: 'fiorella.ramos@gmail.com',
    phone: '+51 987 445 019',
    region: 'Lima',
    city: 'Lima',
    birthDate: '2005-05-09',
    courseName: 'Italiano Inicial',
    classGroupName: 'IT-I — Lun/Mié 20:00',
    teacherName: 'Paola Benítez',
    method: 'bcp',
    amountCents: 6390,
    expectedAmountCents: 6490,
    operationNumber: '00845127',
    flag: 'amount_mismatch',
    tier: 2,
    confidence: 0.74,
    submittedAt: '2026-08-17T18:40:00Z',
  },
  {
    id: 'rev_09',
    studentId: 'stu_0012',
    firstName: 'Álvaro',
    lastName: 'Quispe Huanca',
    nationalId: '71903255',
    email: 'alvaro.quispe@gmail.com',
    phone: '+51 951 660 782',
    region: 'Puno',
    city: 'Juliaca',
    birthDate: '2004-09-17',
    courseName: 'Inglés Básico A1',
    classGroupName: 'A1 — Sáb 09:00',
    teacherName: 'Carlos Meza',
    method: 'yape',
    amountCents: 6990,
    expectedAmountCents: 6990,
    operationNumber: '00993588',
    flag: 'model_divergence',
    tier: 2,
    confidence: 0.52,
    submittedAt: '2026-08-17T21:10:00Z',
  },
  {
    id: 'rev_10',
    studentId: 'stu_0013',
    firstName: 'Milagros',
    lastName: 'Paredes Chávez',
    nationalId: '74558012',
    email: 'milagros.paredes@gmail.com',
    phone: '+51 944 302 551',
    region: 'La Libertad',
    city: 'Trujillo',
    birthDate: '2002-12-01',
    courseName: 'Francés Inicial',
    classGroupName: 'FR-I — Sáb 15:00',
    teacherName: 'Marion Lefèvre',
    method: 'interbank',
    amountCents: 6490,
    expectedAmountCents: 6490,
    operationNumber: '31220745',
    flag: 'low_confidence',
    tier: 2,
    confidence: 0.63,
    submittedAt: '2026-08-18T00:35:00Z',
  },
  {
    id: 'rev_11',
    studentId: 'stu_0014',
    firstName: 'Kevin Anthony',
    lastName: 'Salazar Loayza',
    nationalId: '73104778',
    email: 'kevin.salazar@outlook.com',
    phone: '+51 964 118 330',
    region: 'Junín',
    city: 'Huancayo',
    birthDate: '2000-03-28',
    courseName: 'Portugués Inicial',
    classGroupName: 'PT-I — Mar/Jue 18:00',
    teacherName: 'Bruno Antunes',
    method: 'yape',
    amountCents: 5990,
    expectedAmountCents: 5990,
    operationNumber: '00611233',
    flag: 'duplicate_phash',
    tier: 0,
    confidence: 0.97,
    submittedAt: '2026-08-18T02:15:00Z',
  },
  {
    id: 'rev_12',
    studentId: 'stu_0015',
    firstName: 'Andrea Sofía',
    lastName: 'Ticona Flores',
    nationalId: '76220901',
    email: 'andrea.ticona@gmail.com',
    phone: '+51 952 887 140',
    region: 'Tacna',
    city: 'Tacna',
    birthDate: '2006-08-14',
    courseName: 'Alemán Inicial',
    classGroupName: 'DE-I — Lun/Mié 19:00',
    teacherName: 'Klaus Brenner',
    method: 'plin',
    amountCents: 6890,
    expectedAmountCents: 6990,
    operationNumber: '61330427',
    flag: 'amount_mismatch',
    tier: 2,
    confidence: 0.69,
    submittedAt: '2026-08-18T11:48:00Z',
  },
  {
    id: 'rev_13',
    studentId: 'stu_0016',
    firstName: 'Jorge Luis',
    lastName: 'Ñahui Bautista',
    nationalId: '70882134',
    email: 'jorge.nahui@gmail.com',
    phone: '+51 966 220 517',
    region: 'Ayacucho',
    city: 'Huamanga',
    birthDate: '1999-11-05',
    courseName: 'Quechua Conversacional',
    classGroupName: 'QU-I — Sáb 11:00',
    teacherName: 'Rosa Ccahuana',
    method: 'bcp',
    amountCents: 5490,
    expectedAmountCents: 5490,
    operationNumber: null,
    flag: 'illegible',
    tier: 3,
    confidence: 0.31,
    submittedAt: '2026-08-18T13:05:00Z',
  },
  {
    id: 'rev_14',
    studentId: 'stu_0017',
    firstName: 'Nayeli',
    lastName: 'Condori Apaza',
    nationalId: '75440672',
    email: 'nayeli.condori@gmail.com',
    phone: '+51 951 003 224',
    region: 'Puno',
    city: 'Juliaca',
    birthDate: '2005-01-19',
    courseName: 'Inglés Básico A1',
    classGroupName: 'A1 — Lun/Mié 18:00',
    teacherName: 'Carlos Meza',
    method: 'yape',
    amountCents: 6990,
    expectedAmountCents: 6990,
    operationNumber: '00994102',
    flag: 'low_confidence',
    tier: 2,
    confidence: 0.66,
    submittedAt: '2026-08-18T14:30:00Z',
  },
  {
    id: 'rev_15',
    studentId: 'stu_0018',
    firstName: 'Piero Alessandro',
    lastName: 'Gutiérrez Nieto',
    nationalId: '72015883',
    email: 'piero.gutierrez@outlook.com',
    phone: '+51 987 660 471',
    region: 'Callao',
    city: 'Callao',
    birthDate: '2003-06-30',
    courseName: 'Italiano Inicial',
    classGroupName: 'IT-I — Mar/Jue 19:00',
    teacherName: 'Paolo Grimaldi',
    method: 'plin',
    amountCents: 6490,
    expectedAmountCents: 6490,
    operationNumber: '61441209',
    flag: 'model_divergence',
    tier: 2,
    confidence: 0.49,
    submittedAt: '2026-08-18T15:22:00Z',
  },
  {
    id: 'rev_16',
    studentId: 'stu_0019',
    firstName: 'Brenda Yaneth',
    lastName: 'Castillo Rojas',
    nationalId: '74772360',
    email: 'brenda.castillo@gmail.com',
    phone: '+51 969 114 802',
    region: 'Piura',
    city: 'Piura',
    birthDate: '2001-04-08',
    courseName: 'Inglés Intermedio B1',
    classGroupName: 'B1 — Lun/Mié 20:00',
    teacherName: 'Andrea Solís',
    method: 'yape',
    amountCents: 7890,
    expectedAmountCents: 7990,
    operationNumber: '00995771',
    flag: 'amount_mismatch',
    tier: 2,
    confidence: 0.72,
    submittedAt: '2026-08-18T17:44:00Z',
  },
  {
    id: 'rev_17',
    studentId: 'stu_0020',
    firstName: 'Marco Antonio',
    lastName: 'Zeballos Pinto',
    nationalId: '70338914',
    email: 'marco.zeballos@gmail.com',
    phone: '+51 958 220 660',
    region: 'Arequipa',
    city: 'Arequipa',
    birthDate: '1998-10-22',
    courseName: 'Alemán Inicial',
    classGroupName: 'DE-I — Sáb 10:00',
    teacherName: 'Katrin Wolf',
    method: 'interbank',
    amountCents: 6990,
    expectedAmountCents: 6990,
    operationNumber: '31441088',
    flag: 'duplicate_phash',
    tier: 0,
    confidence: 0.99,
    submittedAt: '2026-08-18T19:10:00Z',
  },
  {
    id: 'rev_18',
    studentId: 'stu_0021',
    firstName: 'Lucero',
    lastName: 'Huamaní Quispe',
    nationalId: '76110458',
    email: 'lucero.huamani@gmail.com',
    phone: '+51 984 771 336',
    region: 'Cusco',
    city: 'Cusco',
    birthDate: '2004-02-27',
    courseName: 'Francés Inicial',
    classGroupName: 'FR-I — Mar/Jue 18:00',
    teacherName: 'Claire Dubois',
    method: 'yape',
    amountCents: 6490,
    expectedAmountCents: 6490,
    operationNumber: '00996314',
    flag: 'low_confidence',
    tier: 2,
    confidence: 0.61,
    submittedAt: '2026-08-18T20:05:00Z',
  },
  {
    id: 'rev_19',
    studentId: 'stu_0022',
    firstName: 'Christian Paolo',
    lastName: 'Mendoza Vela',
    nationalId: '71660207',
    email: 'christian.mendoza@outlook.com',
    phone: '+51 965 447 128',
    region: 'Loreto',
    city: 'Iquitos',
    birthDate: '2000-07-16',
    courseName: 'Portugués Inicial',
    classGroupName: 'PT-I — Sáb 09:00',
    teacherName: 'Ana Beltrán',
    method: 'plin',
    amountCents: 5890,
    expectedAmountCents: 5990,
    operationNumber: '61552044',
    flag: 'amount_mismatch',
    tier: 2,
    confidence: 0.7,
    submittedAt: '2026-08-18T22:31:00Z',
  },
  {
    id: 'rev_20',
    studentId: 'stu_0023',
    firstName: 'Ariana Belén',
    lastName: 'Ramírez Soto',
    nationalId: '75908341',
    email: 'ariana.ramirez@gmail.com',
    phone: '+51 987 220 905',
    region: 'Lima',
    city: 'Lima',
    birthDate: '2006-11-11',
    courseName: 'Inglés Básico A1',
    classGroupName: 'A1 — Mar/Jue 20:00',
    teacherName: 'Carlos Meza',
    method: 'bcp',
    amountCents: 6990,
    expectedAmountCents: 6990,
    operationNumber: null,
    flag: 'illegible',
    tier: 3,
    confidence: 0.27,
    submittedAt: '2026-08-19T01:12:00Z',
  },
  {
    id: 'rev_21',
    studentId: 'stu_0024',
    firstName: 'Renato',
    lastName: 'Aliaga Espinoza',
    nationalId: '73220617',
    email: 'renato.aliaga@gmail.com',
    phone: '+51 943 118 770',
    region: 'Áncash',
    city: 'Huaraz',
    birthDate: '2002-05-03',
    courseName: 'Quechua Conversacional',
    classGroupName: 'QU-I — Mar/Jue 19:00',
    teacherName: 'Nilda Puma',
    method: 'yape',
    amountCents: 5490,
    expectedAmountCents: 5490,
    operationNumber: '00997220',
    flag: 'model_divergence',
    tier: 2,
    confidence: 0.54,
    submittedAt: '2026-08-19T03:40:00Z',
  },
  {
    id: 'rev_22',
    studentId: 'stu_0025',
    firstName: 'Diana Carolina',
    lastName: 'Peralta Ruiz',
    nationalId: '74003185',
    email: 'diana.peralta@gmail.com',
    phone: '+51 976 550 214',
    region: 'Cajamarca',
    city: 'Cajamarca',
    birthDate: '2005-09-21',
    courseName: 'Inglés Básico A1',
    classGroupName: 'A1 — Sáb 09:00',
    teacherName: 'Carlos Meza',
    method: 'yape',
    amountCents: 6990,
    expectedAmountCents: 6990,
    operationNumber: '00997845',
    flag: 'low_confidence',
    tier: 2,
    confidence: 0.64,
    submittedAt: '2026-08-19T04:55:00Z',
  },
  {
    id: 'rev_23',
    studentId: 'stu_0026',
    firstName: 'Gabriel Ismael',
    lastName: 'Torres Ancajima',
    nationalId: '72447039',
    email: 'gabriel.torres@outlook.com',
    phone: '+51 969 880 143',
    region: 'Piura',
    city: 'Sullana',
    birthDate: '1997-12-09',
    courseName: 'Italiano Inicial',
    classGroupName: 'IT-I — Lun/Mié 20:00',
    teacherName: 'Paola Benítez',
    method: 'plin',
    amountCents: 6490,
    expectedAmountCents: 6490,
    operationNumber: '61663902',
    flag: 'duplicate_phash',
    tier: 0,
    confidence: 0.96,
    submittedAt: '2026-08-19T06:20:00Z',
  },
]

/**
 * A student the panel only knows because a receipt of theirs is waiting: seat
 * reserved, payment under review, nothing issued yet.
 */
function pendingStudent(receipt: PendingReceipt): StudentDetail {
  return {
    id: receipt.studentId,
    firstName: receipt.firstName,
    lastName: receipt.lastName,
    nationalIdType: 'DNI',
    nationalId: receipt.nationalId,
    email: receipt.email,
    phone: receipt.phone,
    birthDate: receipt.birthDate,
    isMinor: false,
    status: 'under_review',
    country: 'PE',
    region: receipt.region,
    city: receipt.city,
    activeCourses: 0,
    totalEnrollments: 1,
    createdAt: receipt.submittedAt,
    lastActivityAt: receipt.submittedAt,
    guardian: null,
    enrollments: [
      enrollment({
        id: receipt.id.replace('rev_', 'enr_19'),
        status: 'under_review',
        seatStatus: 'reserved',
        paymentStatus: 'under_review',
        courseName: receipt.courseName,
        classGroupName: receipt.classGroupName,
        teacherName: receipt.teacherName,
        planPriceId: PLAN_PRICE_ID[receipt.courseName] ?? 'pp_en_a1_v3',
        // The enrollment carries the frozen plan price; what the receipt reads
        // is the extraction's problem, not the enrollment's (CLAUDE.md §5).
        amountCents: receipt.expectedAmountCents,
        paymentMethod: receipt.method,
        paymentMethodDetail: null,
        operationNumber: receipt.operationNumber,
        createdAt: receipt.submittedAt,
        paidAt: null,
        progressPct: null,
      }),
    ],
    documents: [],
    documentRequests: [],
    attachments: [],
    activity: [
      audit({
        id: `aud_${receipt.id}_flagged`,
        action: 'payment_flagged',
        at: receipt.submittedAt,
        actorName: 'Sistema',
        actorRole: 'mass_approver',
        reference: { kind: 'review_flag', flag: receipt.flag },
      }),
      audit({
        id: `aud_${receipt.id}_created`,
        action: 'enrollment_created',
        at: receipt.submittedAt,
        actorName: 'Sistema',
        actorRole: 'coordinator',
        reference: { kind: 'course', name: receipt.courseName },
      }),
    ],
  }
}

const students: StudentDetail[] = [
  {
    id: 'stu_0001',
    firstName: 'María Fernanda',
    lastName: 'Quispe Ramos',
    nationalIdType: 'DNI',
    nationalId: '72814905',
    email: 'mariafernanda.quispe@gmail.com',
    phone: '+51 987 654 321',
    birthDate: '2010-03-18',
    isMinor: true,
    status: 'active',
    country: 'PE',
    region: 'Cusco',
    city: 'Cusco',
    activeCourses: 2,
    totalEnrollments: 3,
    createdAt: '2026-02-11T15:04:00Z',
    lastActivityAt: '2026-08-17T23:10:00Z',
    guardian: {
      firstName: 'Rosa',
      lastName: 'Ramos Huamán',
      relationship: 'mother',
      nationalIdType: 'DNI',
      nationalId: '41209877',
      email: 'rosa.ramos@gmail.com',
      phone: '+51 984 112 700',
      consent: {
        version: 'v2026-01',
        acceptedAt: '2026-02-11T15:04:00Z',
        ip: '190.234.11.42',
      },
    },
    enrollments: [
      enrollment({ id: 'enr_1001' }),
      enrollment({
        id: 'enr_1002',
        courseName: 'Portugués Inicial',
        classGroupName: 'PT-I — Sáb 09:00',
        teacherName: 'Ana Beltrán',
        planPriceId: 'pp_pt_i_v2',
        amountCents: 5990,
        paymentMethod: 'plin',
        paymentMethodDetail: null,
        operationNumber: '55120398',
        createdAt: '2026-07-28T16:40:00Z',
        paidAt: '2026-07-28T16:31:00Z',
        progressPct: 12,
      }),
      enrollment({
        id: 'enr_0930',
        status: 'completed',
        courseName: 'Inglés Introductorio',
        classGroupName: 'INT — Mar/Jue 19:00',
        academicPeriodName: 'Ciclo 2026-I',
        planPriceId: 'pp_en_int_v1',
        amountCents: 4990,
        createdAt: '2026-02-11T15:04:00Z',
        paidAt: '2026-02-11T14:58:00Z',
        operationNumber: '00412907',
        progressPct: 100,
      }),
    ],
    documents: [
      doc({
        id: 'doc_1',
        type: 'enrollment_certificate',
        enrollmentId: 'enr_1001',
        issuedAt: '2026-07-03T12:00:00Z',
        verificationCode: 'OOC-2026-K4M7QP',
        issuedByName: 'Lucía Ramírez',
        delivery: { status: 'sent', lastSentAt: '2026-07-03T12:01:00Z', attempts: 1 },
      }),
      doc({
        id: 'doc_2',
        type: 'certificate',
        enrollmentId: 'enr_0930',
        issuedAt: '2026-06-30T12:00:00Z',
        verificationCode: 'OOC-2026-B92XR5',
        delivery: { status: 'sent', lastSentAt: '2026-06-30T12:02:00Z', attempts: 1 },
      }),
      doc({
        id: 'doc_3',
        type: 'certificate',
        status: 'locked',
        enrollmentId: 'enr_1001',
      }),
    ],
    documentRequests: [
      {
        id: 'dreq_1',
        type: 'enrollment_certificate',
        enrollmentId: 'enr_1001',
        requestedAt: '2026-08-18T15:40:00Z',
        feeCents: CONSTANCIA_FEE_CENTS,
        currency: 'PEN',
        paymentStatus: 'under_review',
        paymentMethod: 'yape',
        operationNumber: '00918744',
      },
    ],
    attachments: [
      {
        id: 'att_1',
        kind: 'guardian_consent',
        fileName: 'consentimiento-apoderado-firmado.pdf',
        sizeBytes: 412_336,
        uploadedAt: '2026-07-02T15:10:00Z',
        uploadedBy: 'student',
        uploadedByName: 'María Fernanda Quispe Ramos',
      },
      {
        id: 'att_2',
        kind: 'national_id',
        fileName: 'dni-72814905.jpg',
        sizeBytes: 1_204_880,
        uploadedAt: '2026-07-02T15:08:00Z',
        uploadedBy: 'student',
        uploadedByName: 'María Fernanda Quispe Ramos',
      },
    ],
    activity: [
      audit({
        id: 'aud_9',
        action: 'enrollment_created',
        at: '2026-07-28T16:40:00Z',
        actorName: 'Sistema',
        actorRole: 'coordinator',
        reference: { kind: 'course', name: 'Portugués Inicial' },
      }),
      audit({
        id: 'aud_8',
        action: 'payment_approved',
        at: '2026-07-28T16:44:00Z',
        actorName: 'Diego Salas',
        actorRole: 'treasury',
        reference: { kind: 'operation', number: '55120398' },
      }),
      audit({
        id: 'aud_7',
        action: 'document_issued',
        at: '2026-06-30T12:00:00Z',
        actorName: 'Sistema',
        actorRole: 'coordinator',
        reference: { kind: 'course', name: 'Inglés Introductorio' },
      }),
      audit({
        id: 'aud_6',
        action: 'student_updated',
        at: '2026-05-14T18:22:00Z',
        reference: { kind: 'student_field', field: 'phone' },
      }),
      audit({
        id: 'aud_5',
        action: 'credentials_sent',
        at: '2026-02-11T15:10:00Z',
        actorName: 'Sistema',
        actorRole: 'coordinator',
        reference: null,
      }),
      audit({
        id: 'aud_4',
        action: 'student_created',
        at: '2026-02-11T15:04:00Z',
        actorName: 'Sistema',
        actorRole: 'coordinator',
        reference: null,
      }),
    ],
  },
  {
    id: 'stu_0002',
    firstName: 'Jhon Alexander',
    lastName: 'Mamani Ccama',
    nationalIdType: 'DNI',
    nationalId: '70551238',
    email: 'jhon.mamani@outlook.com',
    phone: '+51 951 220 447',
    birthDate: '2004-11-02',
    isMinor: false,
    status: 'under_review',
    country: 'PE',
    region: 'Puno',
    city: 'Puno',
    activeCourses: 0,
    totalEnrollments: 1,
    createdAt: '2026-08-18T21:02:00Z',
    lastActivityAt: '2026-08-18T21:02:00Z',
    guardian: null,
    enrollments: [
      enrollment({
        id: 'enr_1188',
        status: 'under_review',
        seatStatus: 'reserved',
        paymentStatus: 'under_review',
        courseName: 'Inglés Básico A1',
        classGroupName: 'A1 — Mar/Jue 20:00',
        teacherName: 'Carlos Meza',
        createdAt: '2026-08-18T21:02:00Z',
        paidAt: null,
        operationNumber: '00993412',
        progressPct: null,
      }),
    ],
    documents: [],
    documentRequests: [],
    attachments: [],
    activity: [
      audit({
        id: 'aud_21',
        action: 'payment_flagged',
        at: '2026-08-18T21:03:00Z',
        actorName: 'Sistema',
        actorRole: 'mass_approver',
        reference: { kind: 'review_flag', flag: 'amount_mismatch' },
      }),
      audit({
        id: 'aud_20',
        action: 'enrollment_created',
        at: '2026-08-18T21:02:00Z',
        actorName: 'Sistema',
        actorRole: 'coordinator',
        reference: { kind: 'course', name: 'Inglés Básico A1' },
      }),
    ],
  },
  {
    id: 'stu_0003',
    firstName: 'Camila',
    lastName: 'Torres Vílchez',
    nationalIdType: 'DNI',
    nationalId: '75320981',
    email: 'camila.torres@gmail.com',
    phone: '+51 976 334 128',
    birthDate: '2008-06-24',
    isMinor: true,
    status: 'active',
    country: 'PE',
    region: 'La Libertad',
    city: 'Trujillo',
    activeCourses: 1,
    totalEnrollments: 2,
    createdAt: '2026-03-05T13:30:00Z',
    lastActivityAt: '2026-08-15T01:12:00Z',
    guardian: {
      firstName: 'Manuel',
      lastName: 'Torres Aguilar',
      relationship: 'father',
      nationalIdType: 'DNI',
      nationalId: '40118266',
      email: 'manuel.torres@gmail.com',
      phone: '+51 976 334 100',
      consent: null,
    },
    enrollments: [
      enrollment({
        id: 'enr_1120',
        courseName: 'Quechua Conversacional',
        classGroupName: 'QU-I — Sáb 11:00',
        teacherName: 'Nilda Puma',
        modality: 'in_person',
        planPriceId: 'pp_qu_i_v1',
        amountCents: 5490,
        paymentMethod: 'bcp',
        paymentMethodDetail: null,
        operationNumber: '77120054',
        createdAt: '2026-07-19T11:05:00Z',
        paidAt: '2026-07-19T10:58:00Z',
        progressPct: 30,
      }),
      enrollment({
        id: 'enr_1005',
        status: 'completed',
        academicPeriodName: 'Ciclo 2026-I',
        createdAt: '2026-03-05T13:30:00Z',
        paidAt: '2026-03-05T13:22:00Z',
        operationNumber: '00522118',
        progressPct: 100,
      }),
    ],
    documents: [
      doc({
        id: 'doc_11',
        type: 'enrollment_certificate',
        enrollmentId: 'enr_1120',
        issuedAt: '2026-07-20T12:00:00Z',
        verificationCode: 'OOC-2026-T61HN8',
        issuedByName: 'Lucía Ramírez',
        // Bounced: the address is full, the classic Gmail-sin-espacio case.
        delivery: { status: 'failed', lastSentAt: '2026-07-20T12:01:00Z', attempts: 2 },
      }),
    ],
    documentRequests: [],
    attachments: [],
    activity: [
      audit({
        id: 'aud_31',
        action: 'email_sent',
        at: '2026-08-15T01:12:00Z',
        actorName: 'Sistema',
        actorRole: 'coordinator',
        reference: { kind: 'email_template', template: 'guardian_consent_reminder' },
      }),
      audit({
        id: 'aud_30',
        action: 'payment_approved',
        at: '2026-07-19T11:09:00Z',
        actorName: 'Diego Salas',
        actorRole: 'treasury',
        reference: { kind: 'operation', number: '77120054' },
      }),
    ],
  },
  {
    id: 'stu_0004',
    firstName: 'Sebastián',
    lastName: 'Ríos Paredes',
    nationalIdType: 'CE',
    nationalId: '001234567',
    email: 'sebastian.rios@gmail.com',
    phone: '+51 933 887 012',
    birthDate: '1998-01-09',
    isMinor: false,
    status: 'inactive',
    country: 'PE',
    region: 'Lima',
    city: 'Lima',
    activeCourses: 0,
    totalEnrollments: 1,
    createdAt: '2025-09-14T17:45:00Z',
    lastActivityAt: '2026-01-20T14:00:00Z',
    guardian: null,
    enrollments: [
      enrollment({
        id: 'enr_0712',
        status: 'completed',
        academicPeriodName: 'Ciclo 2025-II',
        courseName: 'Italiano Inicial',
        classGroupName: 'IT-I — Lun/Mié 20:00',
        teacherName: 'Paolo Grimaldi',
        planPriceId: 'pp_it_i_v1',
        amountCents: 6490,
        paymentMethod: 'interbank',
        paymentMethodDetail: null,
        operationNumber: '31882004',
        createdAt: '2025-09-14T17:45:00Z',
        paidAt: '2025-09-14T17:33:00Z',
        progressPct: 100,
      }),
    ],
    documents: [
      doc({
        id: 'doc_21',
        type: 'certificate',
        enrollmentId: 'enr_0712',
        issuedAt: '2026-01-20T14:00:00Z',
        verificationCode: 'OOC-2026-D33WLA',
        delivery: { status: 'sent', lastSentAt: '2026-01-20T14:03:00Z', attempts: 1 },
      }),
    ],
    documentRequests: [],
    attachments: [],
    activity: [
      audit({
        id: 'aud_41',
        action: 'document_issued',
        at: '2026-01-20T14:00:00Z',
        actorName: 'Sistema',
        actorRole: 'coordinator',
        reference: { kind: 'course', name: 'Italiano Inicial' },
      }),
    ],
  },
  {
    id: 'stu_0005',
    firstName: 'Ana Lucía',
    lastName: 'Chávez Soto',
    nationalIdType: 'DNI',
    nationalId: '73998120',
    email: 'analucia.chavez@gmail.com',
    phone: '+51 942 118 903',
    birthDate: '2011-09-30',
    isMinor: true,
    status: 'under_review',
    country: 'PE',
    region: 'Arequipa',
    city: 'Arequipa',
    activeCourses: 0,
    totalEnrollments: 1,
    createdAt: '2026-08-19T02:15:00Z',
    lastActivityAt: '2026-08-19T02:15:00Z',
    guardian: {
      firstName: 'Elena',
      lastName: 'Soto Vargas',
      relationship: 'mother',
      nationalIdType: 'DNI',
      nationalId: '42887301',
      email: 'elena.soto@gmail.com',
      phone: '+51 942 118 900',
      consent: {
        version: 'v2026-01',
        acceptedAt: '2026-08-19T02:15:00Z',
        ip: '181.65.201.9',
      },
    },
    enrollments: [
      enrollment({
        id: 'enr_1190',
        status: 'under_review',
        seatStatus: 'reserved',
        paymentStatus: 'under_review',
        courseName: 'Francés Inicial',
        classGroupName: 'FR-I — Sáb 15:00',
        teacherName: 'Claire Dubois',
        planPriceId: 'pp_fr_i_v2',
        amountCents: 6490,
        paymentMethod: 'yape',
        paymentMethodDetail: null,
        operationNumber: null,
        createdAt: '2026-08-19T02:15:00Z',
        paidAt: null,
        progressPct: null,
      }),
    ],
    documents: [],
    documentRequests: [],
    attachments: [],
    activity: [
      audit({
        id: 'aud_51',
        action: 'payment_flagged',
        at: '2026-08-19T02:16:00Z',
        actorName: 'Sistema',
        actorRole: 'mass_approver',
        reference: { kind: 'review_flag', flag: 'illegible' },
      }),
    ],
  },
  {
    id: 'stu_0006',
    firstName: 'Diego',
    lastName: 'Huamán Ccopa',
    nationalIdType: 'DNI',
    nationalId: '71220456',
    email: 'diego.huaman@gmail.com',
    phone: '+51 918 442 771',
    birthDate: '2006-04-12',
    isMinor: false,
    status: 'active',
    country: 'PE',
    region: 'Cusco',
    city: 'Cusco',
    activeCourses: 1,
    totalEnrollments: 2,
    createdAt: '2026-01-22T16:10:00Z',
    lastActivityAt: '2026-08-16T19:44:00Z',
    guardian: null,
    enrollments: [
      enrollment({
        id: 'enr_1044',
        courseName: 'Inglés Intermedio B1',
        classGroupName: 'B1 — Mar/Jue 18:00',
        teacherName: 'Carlos Meza',
        planPriceId: 'pp_en_b1_v2',
        amountCents: 7990,
        operationNumber: '00733901',
        createdAt: '2026-07-11T12:30:00Z',
        paidAt: '2026-07-11T12:21:00Z',
        progressPct: 62,
      }),
      enrollment({
        id: 'enr_0880',
        status: 'completed',
        academicPeriodName: 'Ciclo 2026-I',
        createdAt: '2026-01-22T16:10:00Z',
        paidAt: '2026-01-22T16:02:00Z',
        operationNumber: '00318822',
        progressPct: 100,
      }),
    ],
    documents: [
      doc({
        id: 'doc_31',
        type: 'enrollment_certificate',
        enrollmentId: 'enr_1044',
        issuedAt: '2026-07-12T12:00:00Z',
        verificationCode: 'OOC-2026-S07VZ2',
        issuedByName: 'Lucía Ramírez',
        delivery: { status: 'queued', lastSentAt: null, attempts: 0 },
      }),
    ],
    documentRequests: [],
    attachments: [],
    activity: [
      audit({
        id: 'aud_61',
        action: 'payment_approved',
        at: '2026-07-11T12:34:00Z',
        actorName: 'Diego Salas',
        actorRole: 'treasury',
        reference: { kind: 'operation', number: '00733901' },
      }),
    ],
  },
  {
    id: 'stu_0007',
    firstName: 'Valentina',
    lastName: 'Núñez Ibarra',
    nationalIdType: 'DNI',
    nationalId: '74810223',
    email: 'valentina.nunez@gmail.com',
    phone: '+51 995 001 348',
    birthDate: '2009-12-05',
    isMinor: true,
    status: 'active',
    country: 'PE',
    region: 'Piura',
    city: 'Piura',
    activeCourses: 1,
    totalEnrollments: 1,
    createdAt: '2026-07-30T20:50:00Z',
    lastActivityAt: '2026-08-18T14:05:00Z',
    guardian: {
      firstName: 'Patricia',
      lastName: 'Ibarra León',
      relationship: 'mother',
      nationalIdType: 'DNI',
      nationalId: '43776512',
      email: 'patricia.ibarra@gmail.com',
      phone: '+51 995 001 300',
      consent: {
        version: 'v2026-01',
        acceptedAt: '2026-07-30T20:50:00Z',
        ip: '200.121.44.18',
      },
    },
    enrollments: [
      enrollment({
        id: 'enr_1150',
        courseName: 'Alemán Inicial',
        classGroupName: 'DE-I — Lun/Mié 19:00',
        teacherName: 'Katrin Wolf',
        planPriceId: 'pp_de_i_v1',
        amountCents: 6990,
        paymentMethod: 'plin',
        paymentMethodDetail: null,
        operationNumber: '61220874',
        createdAt: '2026-07-30T20:50:00Z',
        paidAt: '2026-07-30T20:41:00Z',
        progressPct: 20,
      }),
    ],
    documents: [],
    documentRequests: [],
    attachments: [],
    activity: [
      audit({
        id: 'aud_71',
        action: 'credentials_sent',
        at: '2026-07-30T20:58:00Z',
        actorName: 'Sistema',
        actorRole: 'coordinator',
        reference: null,
      }),
    ],
  },
  {
    id: 'stu_0008',
    firstName: 'Renzo',
    lastName: 'Palacios Vega',
    nationalIdType: 'passport',
    nationalId: 'PE4471902',
    email: 'renzo.palacios@gmail.com',
    phone: '+51 909 776 220',
    birthDate: '2001-07-19',
    isMinor: false,
    status: 'inactive',
    country: 'PE',
    region: 'Loreto',
    city: 'Iquitos',
    activeCourses: 0,
    totalEnrollments: 1,
    createdAt: '2026-04-02T11:00:00Z',
    lastActivityAt: '2026-04-09T11:00:00Z',
    guardian: null,
    enrollments: [
      enrollment({
        id: 'enr_1010',
        status: 'rejected',
        seatStatus: 'released',
        paymentStatus: 'rejected',
        courseName: 'Portugués Inicial',
        classGroupName: 'PT-I — Sáb 09:00',
        teacherName: 'Ana Beltrán',
        planPriceId: 'pp_pt_i_v2',
        amountCents: 5990,
        paymentMethod: 'yape',
        paymentMethodDetail: null,
        operationNumber: '00611233',
        createdAt: '2026-04-02T11:00:00Z',
        paidAt: null,
        progressPct: null,
      }),
    ],
    documents: [],
    documentRequests: [],
    attachments: [],
    activity: [
      audit({
        id: 'aud_81',
        action: 'payment_rejected',
        at: '2026-04-09T11:00:00Z',
        actorName: 'Diego Salas',
        actorRole: 'treasury',
        reference: { kind: 'operation', number: '00611233' },
      }),
    ],
  },
  ...pendingReceipts.map(pendingStudent),
]


export function getDashboardMetrics(): DashboardMetrics {
  return {
    enrollmentsToday: 148,
    enrollmentsTodayDelta: 12,
    pendingReview: listReviewQueue().length,
    oldestPendingHours: 6,
    activeStudents: 1284,
    activeStudentsDelta: 4,
    seatsTaken: 892,
    seatsCapacity: 1100,
  }
}

/** Receipts already sitting on a student file of their own. */
const flaggedReceipts: ReviewQueueItem[] = [
    {
      id: 'rev_01',
      studentId: 'stu_0002',
      studentName: 'Jhon Alexander Mamani Ccama',
      courseName: 'Inglés Básico A1',
      method: 'yape',
      amountCents: 6900,
      expectedAmountCents: 6990,
      operationNumber: '00993412',
      flag: 'amount_mismatch',
      tier: 2,
      confidence: 0.71,
      submittedAt: '2026-08-18T21:02:00Z',
    },
    {
      id: 'rev_02',
      studentId: 'stu_0005',
      studentName: 'Ana Lucía Chávez Soto',
      courseName: 'Francés Inicial',
      method: 'yape',
      amountCents: 6490,
      expectedAmountCents: 6490,
      // The extraction could not read the number — that is the flag itself.
      operationNumber: null,
      flag: 'illegible',
      tier: 3,
      confidence: 0.34,
      submittedAt: '2026-08-19T02:15:00Z',
    },
    {
      id: 'rev_03',
      studentId: 'stu_0006',
      studentName: 'Diego Huamán Ccopa',
      courseName: 'Inglés Intermedio B1',
      method: 'bcp',
      amountCents: 7990,
      expectedAmountCents: 7990,
      // Same number as an already approved payment — that is what pHash caught.
      operationNumber: '00733901',
      flag: 'duplicate_phash',
      tier: 0,
      confidence: 0.98,
      submittedAt: '2026-08-18T18:40:00Z',
    },
    {
      id: 'rev_04',
      studentId: 'stu_0007',
      studentName: 'Valentina Núñez Ibarra',
      courseName: 'Alemán Inicial',
      method: 'plin',
      amountCents: 6990,
      expectedAmountCents: 6990,
      operationNumber: '61220899',
      flag: 'model_divergence',
      tier: 2,
      confidence: 0.55,
      submittedAt: '2026-08-18T16:12:00Z',
    },
    {
      id: 'rev_05',
      studentId: 'stu_0003',
      studentName: 'Camila Torres Vílchez',
      courseName: 'Quechua Conversacional',
      method: 'interbank',
      amountCents: 5490,
      expectedAmountCents: 5490,
      operationNumber: '77120099',
      flag: 'low_confidence',
      tier: 2,
      confidence: 0.62,
      submittedAt: '2026-08-18T13:55:00Z',
    },
]

/**
 * The whole human queue, oldest first — the order it is worked in, and the one
 * the screen promises. Never a model's decision: tier 3 and divergence end
 * here by rule (CLAUDE.md §5).
 */
export function listReviewQueue(): ReviewQueueItem[] {
  return [
    ...flaggedReceipts,
    ...pendingReceipts.map(
      ({
        studentId,
        firstName,
        lastName,
        courseName,
        method,
        amountCents,
        expectedAmountCents,
        operationNumber,
        flag,
        tier,
        confidence,
        submittedAt,
        id,
      }): ReviewQueueItem => ({
        id,
        studentId,
        studentName: `${firstName} ${lastName}`,
        courseName,
        method,
        amountCents,
        expectedAmountCents,
        operationNumber,
        flag,
        tier,
        confidence,
        submittedAt,
      }),
    ),
  ].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
}

/** Home preview: the five that have been waiting the longest. */
export function getReviewQueue(): ReviewQueueItem[] {
  return listReviewQueue().slice(0, 5)
}

export function getSeatWatch(): SeatWatchItem[] {
  return [
    {
      id: 'cg_01',
      courseName: 'Inglés Básico A1',
      classGroupName: 'A1 — Lun/Mié 18:00',
      startDate: '2026-09-07',
      seatsTaken: 38,
      capacity: 40,
    },
    {
      id: 'cg_02',
      courseName: 'Quechua Conversacional',
      classGroupName: 'QU-I — Sáb 11:00',
      startDate: '2026-09-12',
      seatsTaken: 29,
      capacity: 30,
    },
    {
      id: 'cg_03',
      courseName: 'Francés Inicial',
      classGroupName: 'FR-I — Sáb 15:00',
      startDate: '2026-09-12',
      seatsTaken: 18,
      capacity: 35,
    },
    {
      id: 'cg_04',
      courseName: 'Alemán Inicial',
      classGroupName: 'DE-I — Lun/Mié 19:00',
      startDate: '2026-09-07',
      seatsTaken: 9,
      capacity: 30,
    },
  ]
}

/* -------------------------------------------------------------------------- */
/* Class groups                                                                */
/* -------------------------------------------------------------------------- */

/** Language catalogue. New languages are rows here, never code branches. */
const LANGUAGES = {
  en: { id: 'lang_en', name: 'Inglés' },
  it: { id: 'lang_it', name: 'Italiano' },
  fr: { id: 'lang_fr', name: 'Francés' },
  de: { id: 'lang_de', name: 'Alemán' },
  qu: { id: 'lang_qu', name: 'Quechua' },
  pt: { id: 'lang_pt', name: 'Portugués' },
} as const

/**
 * Class groups across the three states that matter for the panel: still
 * enrolling, running, and finished — the last one being where certificates get
 * issued in batch. `certificateRule: 'exam_required'` marks Inglés Básico,
 * which certifies only after the student sits the certification exam
 * (`docs/REGRAS-NEGOCIO.md` §6), so it never goes out in a blind batch.
 */
/**
 * The seed rows carry everything but `pendingGrades`, which is derived from the
 * roster by `pendingGradesOf` — a stored copy of a count the students already
 * answer would be a number that drifts.
 */
type ClassGroupSeed = Omit<ClassGroupDetail, 'pendingGrades'>

const classGroups: ClassGroupSeed[] = [
  {
    id: 'cg_05',
    courseName: 'Italiano Inicial',
    code: 'ITA-0002',
    language: LANGUAGES.it,
    weekdays: ['tue', 'thu'],
    startTime: '19:00',
    teacherId: 'tea_03',
    teacherName: 'Paola Benítez',
    modality: 'online',
    academicPeriodName: 'Ciclo 2026-I',
    startDate: '2026-04-07',
    endDate: '2026-08-07',
    seatsTaken: 8,
    capacity: 30,
    status: 'finished',
    certificateRule: 'automatic',
    allowsFreeze: true,
    allowsTransfer: false,
    pendingCertificates: 4,
    students: [
      {
        studentId: 'stu_0004',
        fullName: 'Sebastián Ríos Paredes',
        enrollmentId: 'enr_0712',
        enrollmentStatus: 'completed',
        paymentStatus: 'approved',
        finalGrade: 18,
        gradeStatus: 'approved',
        certificationExam: null,
        certificateIssuedAt: '2026-01-20T14:00:00Z',
        delivery: { status: 'sent', lastSentAt: '2026-01-20T14:03:00Z', attempts: 1 },
        procedure: null,
      },
      {
        studentId: 'stu_0001',
        fullName: 'María Fernanda Quispe Ramos',
        enrollmentId: 'enr_0930',
        enrollmentStatus: 'completed',
        paymentStatus: 'approved',
        finalGrade: 17,
        gradeStatus: 'approved',
        certificationExam: null,
        certificateIssuedAt: null,
        delivery: null,
        procedure: null,
      },
      {
        studentId: 'stu_0003',
        fullName: 'Camila Torres Vílchez',
        enrollmentId: 'enr_1120',
        enrollmentStatus: 'completed',
        paymentStatus: 'approved',
        finalGrade: 15,
        gradeStatus: 'approved',
        certificationExam: null,
        certificateIssuedAt: null,
        delivery: null,
        procedure: null,
      },
      {
        studentId: 'stu_0006',
        fullName: 'Diego Huamán Ccopa',
        enrollmentId: 'enr_1044',
        enrollmentStatus: 'completed',
        paymentStatus: 'approved',
        finalGrade: 14,
        gradeStatus: 'approved',
        certificationExam: null,
        certificateIssuedAt: null,
        delivery: null,
        procedure: null,
      },
      {
        studentId: 'stu_0008',
        fullName: 'Renzo Palacios Vega',
        enrollmentId: 'enr_0640',
        enrollmentStatus: 'completed',
        paymentStatus: 'approved',
        finalGrade: 16,
        gradeStatus: 'approved',
        certificationExam: null,
        certificateIssuedAt: null,
        delivery: null,
        procedure: null,
      },
      {
        studentId: 'stu_0007',
        fullName: 'Valentina Núñez Ibarra',
        enrollmentId: 'enr_0655',
        enrollmentStatus: 'completed',
        paymentStatus: 'approved',
        finalGrade: 12,
        gradeStatus: 'failed',
        certificationExam: null,
        certificateIssuedAt: null,
        delivery: null,
        procedure: null,
      },
      {
        studentId: 'stu_0005',
        fullName: 'Ana Lucía Chávez Soto',
        enrollmentId: 'enr_0661',
        enrollmentStatus: 'completed',
        paymentStatus: 'approved',
        finalGrade: null,
        gradeStatus: 'auto_failed',
        certificationExam: null,
        certificateIssuedAt: null,
        delivery: null,
        procedure: null,
      },
      {
        studentId: 'stu_0002',
        fullName: 'Jhon Alexander Mamani Ccama',
        enrollmentId: 'enr_0670',
        enrollmentStatus: 'active',
        paymentStatus: 'under_review',
        finalGrade: 16,
        gradeStatus: 'approved',
        certificationExam: null,
        certificateIssuedAt: null,
        delivery: null,
        procedure: null,
      },
    ],
  },
  {
    id: 'cg_06',
    courseName: 'Inglés Básico A1',
    code: 'ING-0004',
    language: LANGUAGES.en,
    weekdays: ['sat'],
    startTime: '09:00',
    teacherId: 'tea_01',
    teacherName: 'Carlos Meza',
    modality: 'online',
    academicPeriodName: 'Ciclo 2026-I',
    startDate: '2026-04-11',
    endDate: '2026-08-12',
    seatsTaken: 4,
    capacity: 40,
    status: 'finished',
    certificateRule: 'exam_required',
    allowsFreeze: true,
    allowsTransfer: true,
    pendingCertificates: 1,
    students: [
      {
        studentId: 'stu_0003',
        fullName: 'Camila Torres Vílchez',
        enrollmentId: 'enr_0801',
        enrollmentStatus: 'completed',
        paymentStatus: 'approved',
        finalGrade: 18,
        gradeStatus: 'approved',
        certificationExam: 'approved',
        certificateIssuedAt: null,
        delivery: null,
        procedure: null,
      },
      {
        studentId: 'stu_0006',
        fullName: 'Diego Huamán Ccopa',
        enrollmentId: 'enr_0802',
        enrollmentStatus: 'completed',
        paymentStatus: 'approved',
        finalGrade: 17,
        gradeStatus: 'approved',
        certificationExam: 'pending',
        certificateIssuedAt: null,
        delivery: null,
        procedure: null,
      },
      {
        studentId: 'stu_0007',
        fullName: 'Valentina Núñez Ibarra',
        enrollmentId: 'enr_0803',
        enrollmentStatus: 'completed',
        paymentStatus: 'approved',
        finalGrade: 15,
        gradeStatus: 'approved',
        certificationExam: 'not_requested',
        certificateIssuedAt: null,
        delivery: null,
        procedure: null,
      },
      {
        studentId: 'stu_0008',
        fullName: 'Renzo Palacios Vega',
        enrollmentId: 'enr_0804',
        enrollmentStatus: 'completed',
        paymentStatus: 'approved',
        finalGrade: null,
        gradeStatus: 'pending',
        certificationExam: 'not_requested',
        certificateIssuedAt: null,
        delivery: null,
        procedure: null,
      },
    ],
  },
  {
    id: 'cg_03',
    courseName: 'Francés Inicial',
    code: 'FRA-0003',
    language: LANGUAGES.fr,
    weekdays: ['sat'],
    startTime: '15:00',
    teacherId: 'tea_04',
    teacherName: 'Marion Lefèvre',
    modality: 'online',
    academicPeriodName: PERIOD,
    startDate: '2026-06-13',
    endDate: '2026-10-17',
    seatsTaken: 18,
    capacity: 35,
    status: 'in_progress',
    certificateRule: 'automatic',
    allowsFreeze: true,
    allowsTransfer: false,
    pendingCertificates: 0,
    students: [
      {
        studentId: 'stu_0003',
        fullName: 'Camila Torres Vílchez',
        enrollmentId: 'enr_1044',
        enrollmentStatus: 'active',
        paymentStatus: 'approved',
        finalGrade: null,
        gradeStatus: 'pending',
        certificationExam: null,
        certificateIssuedAt: null,
        delivery: null,
        procedure: 'frozen',
      },
      {
        studentId: 'stu_0005',
        fullName: 'Ana Lucía Chávez Soto',
        enrollmentId: 'enr_1051',
        enrollmentStatus: 'active',
        paymentStatus: 'approved',
        finalGrade: null,
        gradeStatus: 'pending',
        certificationExam: null,
        certificateIssuedAt: null,
        delivery: null,
        procedure: null,
      },
    ],
  },
  {
    id: 'cg_01',
    courseName: 'Inglés Básico A1',
    code: 'ING-0006',
    language: LANGUAGES.en,
    weekdays: ['mon', 'wed'],
    startTime: '18:00',
    teacherId: 'tea_01',
    teacherName: 'Carlos Meza',
    modality: 'online',
    academicPeriodName: PERIOD,
    startDate: '2026-09-07',
    endDate: '2027-01-13',
    seatsTaken: 38,
    capacity: 40,
    status: 'enrolling',
    certificateRule: 'exam_required',
    allowsFreeze: true,
    allowsTransfer: true,
    pendingCertificates: 0,
    students: [
      {
        studentId: 'stu_0001',
        fullName: 'María Fernanda Quispe Ramos',
        enrollmentId: 'enr_1188',
        enrollmentStatus: 'active',
        paymentStatus: 'approved',
        finalGrade: null,
        gradeStatus: 'pending',
        certificationExam: null,
        certificateIssuedAt: null,
        delivery: null,
        procedure: 'frozen',
      },
      {
        studentId: 'stu_0002',
        fullName: 'Jhon Alexander Mamani Ccama',
        enrollmentId: 'enr_1190',
        enrollmentStatus: 'active',
        paymentStatus: 'under_review',
        finalGrade: null,
        gradeStatus: 'pending',
        certificationExam: null,
        certificateIssuedAt: null,
        delivery: null,
        procedure: null,
      },
      {
        studentId: 'stu_0004',
        fullName: 'Sebastián Ríos Paredes',
        enrollmentId: 'enr_1193',
        enrollmentStatus: 'active',
        paymentStatus: 'approved',
        finalGrade: null,
        gradeStatus: 'pending',
        certificationExam: null,
        certificateIssuedAt: null,
        delivery: null,
        procedure: 'withdrawn',
      },
      {
        studentId: 'stu_0006',
        fullName: 'Diego Huamán Ccopa',
        enrollmentId: 'enr_1201',
        enrollmentStatus: 'under_review',
        paymentStatus: 'under_review',
        finalGrade: null,
        gradeStatus: 'pending',
        certificationExam: null,
        certificateIssuedAt: null,
        delivery: null,
        procedure: null,
      },
    ],
  },
  {
    id: 'cg_02',
    courseName: 'Quechua Conversacional',
    code: 'QUE-0003',
    language: LANGUAGES.qu,
    weekdays: ['sat'],
    startTime: '11:00',
    teacherId: 'tea_05',
    teacherName: 'Rosa Ccahuana',
    modality: 'online',
    academicPeriodName: PERIOD,
    startDate: '2026-09-12',
    endDate: '2026-12-19',
    seatsTaken: 29,
    capacity: 30,
    status: 'enrolling',
    certificateRule: 'automatic',
    allowsFreeze: true,
    allowsTransfer: false,
    pendingCertificates: 0,
    students: [],
  },
  {
    id: 'cg_04',
    courseName: 'Alemán Inicial',
    code: 'ALE-0002',
    language: LANGUAGES.de,
    weekdays: ['mon', 'wed'],
    startTime: '19:00',
    teacherId: 'tea_06',
    teacherName: 'Klaus Brenner',
    modality: 'online',
    academicPeriodName: PERIOD,
    startDate: '2026-09-07',
    endDate: '2027-01-11',
    seatsTaken: 9,
    capacity: 30,
    status: 'enrolling',
    certificateRule: 'automatic',
    allowsFreeze: true,
    allowsTransfer: false,
    pendingCertificates: 0,
    students: [],
  },
  {
    id: 'cg_07',
    courseName: 'Inglés Intermedio B1',
    code: 'ING-0005',
    language: LANGUAGES.en,
    weekdays: ['tue', 'thu'],
    startTime: '20:00',
    teacherId: 'tea_02',
    teacherName: 'Andrea Solís',
    modality: 'online',
    academicPeriodName: PERIOD,
    startDate: '2026-07-14',
    endDate: '2026-09-17',
    seatsTaken: 24,
    capacity: 25,
    status: 'in_progress',
    certificateRule: 'automatic',
    allowsFreeze: false,
    allowsTransfer: false,
    pendingCertificates: 0,
    students: [],
  },
  {
    id: 'cg_08',
    courseName: 'Portugués Inicial',
    code: 'POR-0002',
    language: LANGUAGES.pt,
    weekdays: ['sat'],
    startTime: '09:00',
    teacherId: 'tea_07',
    teacherName: 'Bruno Antunes',
    modality: 'online',
    academicPeriodName: PERIOD,
    startDate: '2026-09-12',
    endDate: '2026-12-19',
    seatsTaken: 12,
    capacity: 30,
    status: 'enrolling',
    certificateRule: 'automatic',
    allowsFreeze: true,
    allowsTransfer: false,
    pendingCertificates: 0,
    students: [],
  },
  {
    id: 'cg_09',
    courseName: 'Inglés Básico A1',
    code: 'ING-0007',
    language: LANGUAGES.en,
    weekdays: ['sat'],
    startTime: '15:00',
    teacherId: 'tea_02',
    teacherName: 'Andrea Solís',
    modality: 'online',
    academicPeriodName: PERIOD,
    startDate: '2026-09-12',
    endDate: '2027-01-16',
    seatsTaken: 31,
    capacity: 40,
    status: 'enrolling',
    certificateRule: 'exam_required',
    allowsFreeze: true,
    allowsTransfer: true,
    pendingCertificates: 0,
    students: [],
  },
  {
    id: 'cg_10',
    courseName: 'Italiano Inicial',
    code: 'ITA-0003',
    language: LANGUAGES.it,
    weekdays: ['mon', 'wed'],
    startTime: '20:00',
    teacherId: 'tea_03',
    teacherName: 'Paola Benítez',
    modality: 'online',
    academicPeriodName: PERIOD,
    startDate: '2026-09-07',
    endDate: '2027-01-11',
    seatsTaken: 6,
    capacity: 30,
    status: 'enrolling',
    certificateRule: 'automatic',
    allowsFreeze: true,
    allowsTransfer: false,
    pendingCertificates: 0,
    students: [],
  },
  {
    id: 'cg_11',
    courseName: 'Quechua Conversacional',
    code: 'QUE-0002',
    language: LANGUAGES.qu,
    weekdays: ['tue'],
    startTime: '18:00',
    teacherId: 'tea_05',
    teacherName: 'Rosa Ccahuana',
    modality: 'online',
    academicPeriodName: 'Ciclo 2026-I',
    startDate: '2026-03-10',
    endDate: '2026-06-30',
    seatsTaken: 22,
    capacity: 25,
    status: 'closed',
    certificateRule: 'automatic',
    allowsFreeze: true,
    allowsTransfer: false,
    pendingCertificates: 0,
    students: [],
  },
  {
    id: 'cg_12',
    courseName: 'Inglés Básico A1',
    code: 'ING-0002',
    language: LANGUAGES.en,
    weekdays: ['mon', 'wed'],
    startTime: '18:00',
    teacherId: 'tea_01',
    teacherName: 'Carlos Meza',
    modality: 'online',
    academicPeriodName: 'Ciclo 2026-I',
    startDate: '2026-03-09',
    endDate: '2026-07-13',
    seatsTaken: 37,
    capacity: 40,
    status: 'closed',
    certificateRule: 'exam_required',
    allowsFreeze: true,
    allowsTransfer: true,
    pendingCertificates: 0,
    students: [],
  },
  {
    id: 'cg_13',
    courseName: 'Inglés Intermedio B1',
    code: 'ING-0003',
    language: LANGUAGES.en,
    weekdays: ['tue', 'thu'],
    startTime: '20:00',
    teacherId: 'tea_02',
    teacherName: 'Andrea Solís',
    modality: 'online',
    academicPeriodName: 'Ciclo 2026-I',
    startDate: '2026-03-10',
    endDate: '2026-06-25',
    seatsTaken: 23,
    capacity: 25,
    status: 'closed',
    certificateRule: 'automatic',
    allowsFreeze: false,
    allowsTransfer: false,
    pendingCertificates: 0,
    students: [],
  },
  {
    id: 'cg_14',
    courseName: 'Francés Inicial',
    code: 'FRA-0002',
    language: LANGUAGES.fr,
    weekdays: ['sat'],
    startTime: '15:00',
    teacherId: 'tea_04',
    teacherName: 'Marion Lefèvre',
    modality: 'online',
    academicPeriodName: 'Ciclo 2026-I',
    startDate: '2026-03-14',
    endDate: '2026-07-18',
    seatsTaken: 26,
    capacity: 35,
    status: 'closed',
    certificateRule: 'automatic',
    allowsFreeze: true,
    allowsTransfer: false,
    pendingCertificates: 0,
    students: [],
  },
  {
    id: 'cg_15',
    courseName: 'Alemán Inicial',
    code: 'ALE-0001',
    language: LANGUAGES.de,
    weekdays: ['mon', 'wed'],
    startTime: '19:00',
    teacherId: 'tea_06',
    teacherName: 'Klaus Brenner',
    modality: 'online',
    academicPeriodName: 'Ciclo 2026-I',
    startDate: '2026-03-09',
    endDate: '2026-07-15',
    seatsTaken: 19,
    capacity: 30,
    status: 'closed',
    certificateRule: 'automatic',
    allowsFreeze: true,
    allowsTransfer: false,
    pendingCertificates: 0,
    students: [],
  },
  {
    id: 'cg_16',
    courseName: 'Portugués Inicial',
    code: 'POR-0001',
    language: LANGUAGES.pt,
    weekdays: ['sat'],
    startTime: '09:00',
    teacherId: 'tea_07',
    teacherName: 'Bruno Antunes',
    modality: 'online',
    academicPeriodName: 'Ciclo 2026-I',
    startDate: '2026-03-14',
    endDate: '2026-06-27',
    seatsTaken: 24,
    capacity: 30,
    status: 'closed',
    certificateRule: 'automatic',
    allowsFreeze: true,
    allowsTransfer: false,
    pendingCertificates: 0,
    students: [],
  },
  {
    id: 'cg_17',
    courseName: 'Inglés Básico A1',
    code: 'ING-0001',
    language: LANGUAGES.en,
    weekdays: ['sat'],
    startTime: '09:00',
    teacherId: 'tea_02',
    teacherName: 'Andrea Solís',
    modality: 'online',
    academicPeriodName: 'Ciclo 2025-II',
    startDate: '2025-09-13',
    endDate: '2026-01-17',
    seatsTaken: 39,
    capacity: 40,
    status: 'closed',
    certificateRule: 'exam_required',
    allowsFreeze: true,
    allowsTransfer: true,
    pendingCertificates: 0,
    students: [],
  },
  {
    id: 'cg_18',
    courseName: 'Italiano Inicial',
    code: 'ITA-0001',
    language: LANGUAGES.it,
    weekdays: ['mon', 'wed'],
    startTime: '20:00',
    teacherId: 'tea_03',
    teacherName: 'Paola Benítez',
    modality: 'online',
    academicPeriodName: 'Ciclo 2025-II',
    startDate: '2025-09-08',
    endDate: '2026-01-12',
    seatsTaken: 21,
    capacity: 30,
    status: 'closed',
    certificateRule: 'automatic',
    allowsFreeze: true,
    allowsTransfer: false,
    pendingCertificates: 0,
    students: [],
  },
  {
    id: 'cg_19',
    courseName: 'Quechua Conversacional',
    code: 'QUE-0001',
    language: LANGUAGES.qu,
    weekdays: ['sat'],
    startTime: '11:00',
    teacherId: 'tea_05',
    teacherName: 'Rosa Ccahuana',
    modality: 'online',
    academicPeriodName: 'Ciclo 2025-II',
    startDate: '2025-09-13',
    endDate: '2025-12-20',
    seatsTaken: 28,
    capacity: 30,
    status: 'closed',
    certificateRule: 'automatic',
    allowsFreeze: true,
    allowsTransfer: false,
    pendingCertificates: 0,
    students: [],
  },
  {
    id: 'cg_20',
    courseName: 'Francés Inicial',
    code: 'FRA-0001',
    language: LANGUAGES.fr,
    weekdays: ['tue', 'thu'],
    startTime: '19:00',
    teacherId: 'tea_04',
    teacherName: 'Marion Lefèvre',
    modality: 'online',
    academicPeriodName: 'Ciclo 2025-II',
    startDate: '2025-09-09',
    endDate: '2026-01-15',
    seatsTaken: 30,
    capacity: 35,
    status: 'closed',
    certificateRule: 'automatic',
    allowsFreeze: true,
    allowsTransfer: false,
    pendingCertificates: 0,
    students: [],
  },
]

/**
 * The course catalog. Hours and module counts come from
 * `docs/REGRAS-NEGOCIO.md` §3 where the source states them (Inglés Básico: 4
 * modules, 20h each) and are plausible fill-ins elsewhere — the real numbers
 * are catalog data the Asociación owns, not something to derive in code.
 *
 * `minAge` follows §2: 13 for every language except the Inglés kids track,
 * which does not exist in this mock.
 */
const courses: CourseRow[] = [
  {
    id: 'crs_01',
    name: 'Inglés Básico A1',
    language: LANGUAGES.en,
    level: 'A1',
    minAge: 13,
    modules: 4,
    totalHours: 80,
    certificateRule: 'exam_required',
    allowsFreeze: true,
    allowsTransfer: true,
    active: true,
    classGroupCount: 0,
  },
  {
    id: 'crs_02',
    name: 'Inglés Intermedio B1',
    language: LANGUAGES.en,
    level: 'B1',
    minAge: 13,
    modules: 2,
    totalHours: 80,
    certificateRule: 'automatic',
    // §2 and §5: the intermediate/advanced track cannot be frozen.
    allowsFreeze: false,
    allowsTransfer: false,
    active: true,
    classGroupCount: 0,
  },
  {
    id: 'crs_03',
    name: 'Francés Inicial',
    language: LANGUAGES.fr,
    level: 'Inicial',
    minAge: 13,
    modules: 4,
    totalHours: 80,
    certificateRule: 'automatic',
    allowsFreeze: true,
    allowsTransfer: false,
    active: true,
    classGroupCount: 0,
  },
  {
    id: 'crs_04',
    name: 'Alemán Inicial',
    language: LANGUAGES.de,
    level: 'Inicial',
    minAge: 13,
    modules: 4,
    totalHours: 80,
    certificateRule: 'automatic',
    allowsFreeze: true,
    allowsTransfer: false,
    active: true,
    classGroupCount: 0,
  },
  {
    id: 'crs_05',
    name: 'Italiano Inicial',
    language: LANGUAGES.it,
    level: 'Inicial',
    minAge: 13,
    modules: 4,
    totalHours: 80,
    certificateRule: 'automatic',
    allowsFreeze: true,
    allowsTransfer: false,
    active: true,
    classGroupCount: 0,
  },
  {
    id: 'crs_06',
    name: 'Portugués Inicial',
    language: LANGUAGES.pt,
    level: 'Inicial',
    minAge: 13,
    modules: 4,
    totalHours: 80,
    certificateRule: 'automatic',
    allowsFreeze: true,
    allowsTransfer: false,
    active: true,
    classGroupCount: 0,
  },
  {
    id: 'crs_07',
    name: 'Quechua Conversacional',
    language: LANGUAGES.qu,
    level: 'Inicial',
    minAge: 13,
    modules: 3,
    totalHours: 60,
    certificateRule: 'automatic',
    allowsFreeze: true,
    allowsTransfer: false,
    active: true,
    classGroupCount: 0,
  },
  {
    id: 'crs_08',
    name: 'Chino Mandarín Básico',
    language: { id: 'lang_zh', name: 'Chino Mandarín' },
    level: 'Inicial',
    minAge: 13,
    modules: 3,
    totalHours: 60,
    certificateRule: 'automatic',
    allowsFreeze: true,
    allowsTransfer: false,
    // In the catalog but with no class group open this period.
    active: false,
    classGroupCount: 0,
  },
]

/** Class group count is derived, never stored — it would drift the moment one opens. */
export function listCourses(): CourseRow[] {
  return courses
    .map((course) => ({
      ...course,
      classGroupCount: classGroups.filter((group) => group.courseName === course.name)
        .length,
    }))
    .sort(
      (a, b) =>
        a.language.name.localeCompare(b.language.name) || a.name.localeCompare(b.name),
    )
}

/**
 * Final grades still open on a roster — what the teacher owes the class group.
 * Only while there is something to owe: an enrolling group has not taught
 * anything yet and a closed one is history, so both count zero. A student
 * moved out by a procedure (frozen, transferred, withdrawn) is not counted
 * either: they left the roster, not a grade behind.
 */
function pendingGradesOf(group: ClassGroupSeed): number {
  if (group.status !== 'in_progress' && group.status !== 'finished') return 0
  return group.students.filter(
    (student) => student.gradeStatus === 'pending' && student.procedure === null,
  ).length
}

export function listClassGroups(): ClassGroupRow[] {
  return classGroups.map((group) => {
    const { students, ...row } = group
    void students
    return { ...row, pendingGrades: pendingGradesOf(group) }
  })
}

export function getClassGroup(id: string): ClassGroupDetail | undefined {
  const group = classGroups.find((item) => item.id === id)
  if (!group) return undefined
  return { ...group, pendingGrades: pendingGradesOf(group) }
}

/**
 * The class groups with their rosters attached — what `listClassGroups()`
 * deliberately strips. Read by anything that has to count across every roster
 * at once (grades, administrative procedures), never by a list screen: a
 * directory has no business carrying every student of every class group.
 */
export function listClassGroupRosters(): ClassGroupDetail[] {
  return classGroups.map((group) => ({
    ...group,
    pendingGrades: pendingGradesOf(group),
  }))
}

/* -------------------------------------------------------------------------- */
/* Teachers                                                                    */
/* -------------------------------------------------------------------------- */

/** Weekly availability, written the way the schedule is spoken about. */
function slots(
  weekdays: AvailabilitySlot['weekday'][],
  startTime: string,
  endTime: string,
): AvailabilitySlot[] {
  return weekdays.map((weekday) => ({ weekday, startTime, endTime }))
}

/**
 * Teacher roster. Everything countable — class groups, students, pending
 * grades, pending certificates — is derived from `classGroups` below rather
 * than written here, so the roster can never disagree with the class group
 * list about who teaches what.
 *
 * The nationalities are not decoration: the catalog advertises the Italian
 * class group with a "docente ítalo-peruano" (`docs/REGRAS-NEGOCIO.md` §3), so
 * origin is catalogue data the ficha carries (`docs/REQUISITOS.md` RF03).
 */
const teachers: Omit<
  TeacherDetail,
  | 'activeClassGroups'
  | 'studentCount'
  | 'pendingGrades'
  | 'pendingCertificates'
  | 'classGroups'
  /* Derived from `contract` against the request's clock, not seeded. */
  | 'contractDaysLeft'
>[] = [
  {
    id: 'tea_01',
    firstName: 'Carlos',
    lastName: 'Meza',
    email: 'carlos.meza@onlyonecoin.edu.pe',
    phone: '+51 987 112 340',
    status: 'active',
    languages: [LANGUAGES.en],
    nationality: 'PE',
    nationalIdType: 'DNI',
    nationalId: '41028873',
    country: 'PE',
    region: 'Lima',
    city: 'Lima',
    addressLine: 'Av. Arequipa 2450, dpto. 502, Lince',
    contract: {
      fileName: 'contrato-carlos-meza-2026.pdf',
      fileSizeBytes: 184320,
      uploadedAt: '2026-01-08T14:20:00Z',
      startsAt: '2026-01-05',
      endsAt: '2026-12-31',
    },
    joinedAt: '2023-03-06',
    availability: [
      ...slots(['mon', 'wed'], '17:00', '21:00'),
      ...slots(['sat'], '08:00', '13:00'),
    ],
  },
  {
    id: 'tea_02',
    firstName: 'Andrea',
    lastName: 'Solís',
    email: 'andrea.solis@onlyonecoin.edu.pe',
    phone: '+51 954 208 771',
    status: 'active',
    languages: [LANGUAGES.en],
    nationality: 'PE',
    nationalIdType: 'DNI',
    nationalId: '44190226',
    country: 'PE',
    region: 'Lima',
    city: 'Lima',
    addressLine: 'Jr. Manuel Segura 118, Lince',
    contract: {
      fileName: 'contrato-andrea-solis-2026.pdf',
      fileSizeBytes: 176128,
      uploadedAt: '2026-01-15T14:20:00Z',
      startsAt: '2026-01-15',
      endsAt: '2026-09-30',
    },
    joinedAt: '2024-01-15',
    availability: [
      ...slots(['tue', 'thu'], '18:00', '22:00'),
      ...slots(['sat'], '08:00', '17:00'),
    ],
  },
  {
    id: 'tea_03',
    firstName: 'Paola',
    lastName: 'Benítez',
    email: 'paola.benitez@onlyonecoin.edu.pe',
    phone: '+51 943 771 020',
    status: 'active',
    languages: [LANGUAGES.it],
    nationality: 'IT',
    nationalIdType: 'DNI',
    nationalId: '09887321',
    country: 'PE',
    region: 'Cusco',
    city: 'Cusco',
    addressLine: 'Calle Saphi 470, Cusco',
    contract: {
      fileName: 'contrato-paola-benitez-2026.pdf',
      fileSizeBytes: 192512,
      uploadedAt: '2026-02-02T14:20:00Z',
      startsAt: '2026-02-01',
      endsAt: '2026-10-05',
    },
    joinedAt: '2022-08-22',
    availability: [
      ...slots(['mon', 'wed'], '18:00', '22:00'),
      ...slots(['tue', 'thu'], '18:00', '21:00'),
    ],
  },
  {
    id: 'tea_04',
    firstName: 'Marion',
    lastName: 'Lefèvre',
    email: 'marion.lefevre@onlyonecoin.edu.pe',
    phone: '+51 921 664 508',
    status: 'active',
    languages: [LANGUAGES.fr],
    nationality: 'FR',
    nationalIdType: 'CE',
    nationalId: '001788452',
    country: 'PE',
    region: 'Lima',
    city: 'Miraflores',
    addressLine: 'Av. Larco 743, dpto. 1102, Miraflores',
    contract: {
      fileName: 'contrato-marion-lefevre-2026.pdf',
      fileSizeBytes: 203776,
      uploadedAt: '2026-03-11T14:20:00Z',
      startsAt: '2026-03-10',
      endsAt: '2027-03-09',
    },
    joinedAt: '2024-06-03',
    availability: [
      ...slots(['tue', 'thu'], '18:00', '21:00'),
      ...slots(['sat'], '14:00', '18:00'),
    ],
  },
  {
    id: 'tea_05',
    firstName: 'Rosa',
    lastName: 'Ccahuana',
    email: 'rosa.ccahuana@onlyonecoin.edu.pe',
    phone: '+51 968 330 194',
    status: 'active',
    languages: [LANGUAGES.qu],
    nationality: 'PE',
    nationalIdType: 'DNI',
    nationalId: '47720184',
    country: 'PE',
    region: 'Cusco',
    city: 'Cusco',
    addressLine: 'Urb. Magisterio A-12, Cusco',
    contract: null,
    joinedAt: '2023-09-11',
    availability: [
      ...slots(['tue'], '17:00', '20:00'),
      ...slots(['sat'], '09:00', '13:00'),
    ],
  },
  {
    id: 'tea_06',
    firstName: 'Klaus',
    lastName: 'Brenner',
    email: 'klaus.brenner@onlyonecoin.edu.pe',
    phone: '+51 917 245 883',
    status: 'active',
    languages: [LANGUAGES.de],
    nationality: 'DE',
    nationalIdType: 'CE',
    nationalId: '001902337',
    country: 'PE',
    region: 'Lima',
    city: 'Lima',
    addressLine: 'Calle Los Nogales 285, San Isidro',
    contract: {
      fileName: 'contrato-klaus-brenner-2026.pdf',
      fileSizeBytes: 188416,
      uploadedAt: '2025-09-01T14:20:00Z',
      startsAt: '2025-09-01',
      endsAt: '2026-08-31',
    },
    joinedAt: '2025-02-17',
    availability: [...slots(['mon', 'wed'], '18:00', '22:00')],
  },
  {
    id: 'tea_07',
    firstName: 'Bruno',
    lastName: 'Antunes',
    email: 'bruno.antunes@onlyonecoin.edu.pe',
    phone: '+51 902 517 466',
    status: 'active',
    languages: [LANGUAGES.pt],
    nationality: 'BR',
    nationalIdType: 'passport',
    nationalId: 'FT902118',
    country: 'BR',
    region: null,
    city: 'São Paulo',
    addressLine: 'Rua Augusta 1508, ap. 84, São Paulo',
    contract: {
      fileName: 'contrato-bruno-antunes-2026.pdf',
      fileSizeBytes: 180224,
      uploadedAt: '2026-02-20T14:20:00Z',
      startsAt: '2026-02-20',
      endsAt: '2027-02-19',
    },
    joinedAt: '2025-07-28',
    availability: [...slots(['sat'], '08:00', '13:00')],
  },
  /* Cleared and free: on the roster, no class group this period. This is what
     the allocation screen is looking for, so it must not read as inactive. */
  {
    id: 'tea_08',
    firstName: 'Ana',
    lastName: 'Beltrán',
    email: 'ana.beltran@onlyonecoin.edu.pe',
    phone: '+51 939 802 115',
    status: 'active',
    languages: [LANGUAGES.en, LANGUAGES.pt],
    nationality: 'PE',
    nationalIdType: 'DNI',
    nationalId: '43118902',
    country: 'PE',
    region: 'Arequipa',
    city: 'Arequipa',
    addressLine: 'Calle Jerusalén 402, Arequipa',
    contract: {
      fileName: 'contrato-ana-beltran-2026.pdf',
      fileSizeBytes: 171008,
      uploadedAt: '2025-08-18T14:20:00Z',
      startsAt: '2025-08-18',
      endsAt: '2026-08-17',
    },
    joinedAt: '2022-04-04',
    availability: [
      ...slots(['mon', 'tue', 'wed', 'thu'], '15:00', '19:00'),
      ...slots(['fri'], '15:00', '18:00'),
    ],
  },
  {
    id: 'tea_09',
    firstName: 'Nilda',
    lastName: 'Puma',
    email: 'nilda.puma@onlyonecoin.edu.pe',
    phone: '+51 995 118 727',
    status: 'active',
    languages: [LANGUAGES.qu],
    nationality: 'PE',
    nationalIdType: 'DNI',
    nationalId: '48802173',
    country: 'PE',
    region: 'Puno',
    city: 'Juliaca',
    addressLine: 'Jr. Huancané 730, Juliaca',
    contract: {
      fileName: 'contrato-nilda-puma-2026.pdf',
      fileSizeBytes: 166912,
      uploadedAt: '2026-04-06T14:20:00Z',
      startsAt: '2026-04-06',
      endsAt: '2027-04-05',
    },
    joinedAt: '2024-10-19',
    availability: [...slots(['fri'], '17:00', '21:00'), ...slots(['sun'], '09:00', '12:00')],
  },
  /* Off the roster. Their finished class groups still carry their name, which
     is exactly why the record is kept instead of deleted. */
  {
    id: 'tea_10',
    firstName: 'Paolo',
    lastName: 'Grimaldi',
    email: 'paolo.grimaldi@onlyonecoin.edu.pe',
    phone: '+51 911 470 663',
    status: 'inactive',
    languages: [LANGUAGES.it],
    nationality: 'IT',
    nationalIdType: 'CE',
    nationalId: '001655209',
    country: 'PE',
    region: 'Lima',
    city: 'Lima',
    addressLine: 'Av. Petit Thouars 1890, Lince',
    contract: {
      fileName: 'contrato-paolo-grimaldi-2026.pdf',
      fileSizeBytes: 197632,
      uploadedAt: '2026-01-22T14:20:00Z',
      startsAt: '2026-01-20',
      endsAt: '2026-11-30',
    },
    joinedAt: '2021-05-10',
    availability: [],
  },
  {
    id: 'tea_11',
    firstName: 'Katrin',
    lastName: 'Wolf',
    email: 'katrin.wolf@onlyonecoin.edu.pe',
    phone: '+51 928 355 041',
    status: 'inactive',
    languages: [LANGUAGES.de],
    nationality: 'DE',
    nationalIdType: 'passport',
    nationalId: 'C4Z8801PP',
    country: 'PE',
    region: 'Lima',
    city: 'Miraflores',
    addressLine: 'Calle Berlín 690, dpto. 305, Miraflores',
    contract: {
      fileName: 'contrato-katrin-wolf-2026.pdf',
      fileSizeBytes: 174080,
      uploadedAt: '2026-05-04T14:20:00Z',
      startsAt: '2026-05-04',
      endsAt: '2027-05-03',
    },
    joinedAt: '2021-11-02',
    availability: [],
  },
  {
    id: 'tea_12',
    firstName: 'Claire',
    lastName: 'Dubois',
    email: 'claire.dubois@onlyonecoin.edu.pe',
    phone: '+51 906 229 318',
    status: 'inactive',
    languages: [LANGUAGES.fr],
    nationality: 'FR',
    nationalIdType: 'CE',
    nationalId: '001744820',
    country: 'PE',
    region: 'Lima',
    city: 'Lima',
    addressLine: 'Av. Salaverry 3120, Magdalena',
    contract: {
      fileName: 'contrato-claire-dubois-2026.pdf',
      fileSizeBytes: 169984,
      uploadedAt: '2026-03-02T14:20:00Z',
      startsAt: '2026-03-01',
      endsAt: '2026-09-15',
    },
    joinedAt: '2020-09-14',
    availability: [],
  },
]

/** Still enrolling or running — what counts as load right now. */
function isRunning(group: Pick<ClassGroupRow, 'status'>): boolean {
  return group.status === 'enrolling' || group.status === 'in_progress'
}

function teacherLoad(teacherId: string) {
  const own = classGroups.filter((group) => group.teacherId === teacherId)
  const running = own.filter(isRunning)
  return {
    activeClassGroups: running.length,
    studentCount: running.reduce((sum, group) => sum + group.seatsTaken, 0),
    pendingGrades: own.reduce((sum, group) => sum + pendingGradesOf(group), 0),
    pendingCertificates: own.reduce((sum, group) => sum + group.pendingCertificates, 0),
  }
}

/**
 * Days left on the contract, against the request's clock. Handed down as a
 * number so the component never computes a date: it would hydrate a different
 * figure than the server rendered.
 */
function contractCountdown(
  contract: TeacherContract | null,
  now: Date,
): { contractDaysLeft: number | null } {
  return {
    contractDaysLeft: contract ? daysUntil(contract.endsAt, now) : null,
  }
}

export function listTeachers(now: Date = new Date()): TeacherRow[] {
  return teachers
    .map(({ availability, ...teacher }) => {
      void availability
      return {
        ...teacher,
        ...teacherLoad(teacher.id),
        ...contractCountdown(teacher.contract, now),
      }
    })
    .sort(
      (a, b) =>
        a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
    )
}

export function getTeacher(
  id: string,
  now: Date = new Date(),
): TeacherDetail | undefined {
  const teacher = teachers.find((item) => item.id === id)
  if (!teacher) return undefined
  return {
    ...teacher,
    ...teacherLoad(teacher.id),
    ...contractCountdown(teacher.contract, now),
    /* Running first, then the finished ones that still owe a certificate:
       the file is opened either to allocate the next class group or to close
       the last one. */
    classGroups: classGroups
      .filter((group) => group.teacherId === id)
      .map((group) => {
        const { students, ...row } = group
        void students
        return { ...row, pendingGrades: pendingGradesOf(group) }
      })
      .sort(
        (a, b) =>
          Number(isRunning(b)) - Number(isRunning(a)) ||
          b.pendingCertificates - a.pendingCertificates ||
          b.startDate.localeCompare(a.startDate),
      ),
  }
}

/* -------------------------------------------------------------------------- */
/* Scoped reads — a teacher sees their own class groups, nobody else's         */
/* -------------------------------------------------------------------------- */

/**
 * The class groups a staff member may list. For a teacher that is their own and
 * only their own (`docs/ARCHITECTURE.md` §3): the filter is built from the
 * session's `teacherId`, never from anything the client sent (CLAUDE.md §8).
 *
 * Here it narrows a mocked array; in production the same rule is the usecase in
 * `packages/domain` behind `apps/api`, and that one is what enforces it.
 */
export function listClassGroupsFor(staff: StaffUser): ClassGroupRow[] {
  const rows = listClassGroups()
  if (staff.role !== 'teacher') return rows
  return rows.filter((group) => group.teacherId === staff.teacherId)
}

/**
 * Reading one class group under the same rule. A teacher asking for somebody
 * else's gets nothing back — not a hidden button, nothing: guessing the id in
 * the URL is the whole point of the check (anti-IDOR, CLAUDE.md §8).
 */
export function getClassGroupFor(
  staff: StaffUser,
  id: string,
): ClassGroupDetail | undefined {
  const group = getClassGroup(id)
  if (!group) return undefined
  if (staff.role === 'teacher' && group.teacherId !== staff.teacherId) return undefined
  return group
}

/* -------------------------------------------------------------------------- */
/* Payments                                                                    */
/* -------------------------------------------------------------------------- */

/** Tolerance and the other pipeline parameters — settings, never constants
 *  in the code (CLAUDE.md §5). Editable from the backoffice. */
export function getPaymentSettings(): PaymentSettings {
  return {
    toleranceCents: 50,
    escalationConfidence: 0.75,
    reservationDays: 5,
    checkoutHoldMinutes: 15,
  }
}

/**
 * Who settled a payment and when, read off the student's own audit trail — the
 * append-only record is the source (CLAUDE.md §8), not a column somebody could
 * set to a different value. No entry means the ladder approved it with no human
 * in the loop.
 */
function decisionOf(
  student: StudentDetail,
  operationNumber: string | null,
): { at: string; by: string } | null {
  const entry = student.activity.find(
    (item) =>
      (item.action === 'payment_approved' || item.action === 'payment_rejected') &&
      item.reference?.kind === 'operation' &&
      item.reference.number === operationNumber,
  )
  return entry ? { at: entry.at, by: entry.actorName } : null
}

/**
 * The whole ledger, newest first. Enrollments and paid procedures land in the
 * same list on purpose: `payments` is agnostic of origin (CLAUDE.md §5), the
 * constancia travels the same states and the same OCR ladder, and the treasury
 * closes the period over both.
 *
 * What the receipt *reads* comes from the review queue when the case is still
 * open; the enrollment only ever carries the frozen plan price, so the two
 * screens can never disagree about the same receipt.
 */
export function listPayments(): PaymentRow[] {
  const queue = listReviewQueue()
  const flags = new Map(
    queue.map((item) => [`${item.studentId}|${item.courseName}`, item]),
  )
  /** Queued receipts already accounted for by an enrollment of their own. */
  const matched = new Set<string>()

  const rows: PaymentRow[] = []

  for (const student of students) {
    const studentName = `${student.firstName} ${student.lastName}`

    for (const item of student.enrollments) {
      const key = `${student.id}|${item.courseName}`
      const open = item.paymentStatus === 'under_review' ? flags.get(key) : undefined
      if (open) matched.add(open.id)
      const decision = decisionOf(student, item.operationNumber)
      rows.push({
        id: `pay_${item.id}`,
        studentId: student.id,
        studentName,
        concept: { kind: 'course', courseName: item.courseName },
        status: item.paymentStatus,
        method: item.paymentMethod,
        amountCents: open?.amountCents ?? item.amountCents,
        expectedAmountCents: item.amountCents,
        currency: item.currency,
        operationNumber: item.operationNumber,
        submittedAt: item.createdAt,
        decidedAt: decision?.at ?? item.paidAt,
        decidedByName: decision?.by ?? null,
        flag: open?.flag ?? null,
      })
    }

    for (const request of student.documentRequests) {
      const decision = decisionOf(student, request.operationNumber)
      rows.push({
        id: `pay_${request.id}`,
        studentId: student.id,
        studentName,
        concept: { kind: 'document', type: request.type },
        status: request.paymentStatus,
        method: request.paymentMethod,
        // A procedure has a fixed fee: what is expected is what it costs, and
        // the receipt is checked against it exactly like a plan price.
        amountCents: request.feeCents,
        expectedAmountCents: request.feeCents,
        currency: request.currency,
        operationNumber: request.operationNumber,
        submittedAt: request.requestedAt,
        decidedAt: decision?.at ?? null,
        decidedByName: decision?.by ?? null,
        flag: null,
      })
    }
  }

  /**
   * A receipt that matches no enrollment of its own is still a payment: a
   * second upload over an already approved enrollment is exactly what tier 0
   * catches. It belongs in the ledger, or the queue would hold receipts nobody
   * can find from the money side.
   */
  for (const item of queue) {
    if (matched.has(item.id)) continue
    rows.push({
      id: `pay_${item.id}`,
      studentId: item.studentId,
      studentName: item.studentName,
      concept: { kind: 'course', courseName: item.courseName },
      status: 'under_review',
      method: item.method,
      amountCents: item.amountCents,
      expectedAmountCents: item.expectedAmountCents,
      currency: 'PEN',
      operationNumber: item.operationNumber,
      submittedAt: item.submittedAt,
      decidedAt: null,
      decidedByName: null,
      flag: item.flag,
    })
  }

  return rows.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
}

/**
 * Period figures, not daily ones: the ciclo is what the treasury closes
 * against, and "collected today" reads as zero every Sunday.
 */
export function getPaymentMetrics(): PaymentMetrics {
  const rows = listPayments()
  const approved = rows.filter((row) => row.status === 'approved')
  return {
    inReview: rows.filter((row) => row.status === 'under_review').length,
    oldestPendingHours: getDashboardMetrics().oldestPendingHours,
    approved: approved.length,
    collectedCents: approved.reduce((total, row) => total + row.amountCents, 0),
    rejected: rows.filter((row) => row.status === 'rejected').length,
    periodName: PERIOD,
  }
}

/** Thirty minutes before the upload — a receipt is photographed after paying. */
function paidAtOf(submittedAt: string): string {
  return new Date(new Date(submittedAt).getTime() - 30 * 60_000).toISOString()
}

/**
 * The extraction behind one queued receipt, built from the queue row itself so
 * the flag, the tier and the confidence on the list are the same ones the
 * reviewer sees when opening it.
 *
 * Every field carries its own confidence and every extraction carries its tier
 * and model (CLAUDE.md §5) — that is what tells a reviewer whether the doubt is
 * about the number or about the picture.
 */
function extractionOf(item: ReviewQueueItem): ReceiptExtraction {
  const { toleranceCents } = getPaymentSettings()
  const unreadable = item.flag === 'illegible'
  /**
   * The queue row promises the lowest per-field confidence, so no field may
   * read below it — a sheet full of higher numbers would make the list lie.
   * The weak field is the one the flag is about: the amount when the value does
   * not match, the operation number in every other case.
   */
  const atLeast = (value: number) => Math.max(value, item.confidence)
  const weakField: ExtractionField =
    item.flag === 'amount_mismatch' ? 'amount' : 'operation_number'

  return {
    paymentId: item.id,
    studentId: item.studentId,
    studentName: item.studentName,
    concept: { kind: 'course', courseName: item.courseName },
    flag: item.flag,
    tier: item.tier,
    modelName: 'Gemini 3.1 Flash-Lite',
    modelVersion: '2026-05',
    imageUrl: null,
    amountCents: item.amountCents,
    expectedAmountCents: item.expectedAmountCents,
    toleranceCents,
    method: item.method,
    submittedAt: item.submittedAt,
    fields: [
      {
        field: 'operation_number',
        value: item.operationNumber
          ? { kind: 'text', text: item.operationNumber }
          : { kind: 'unreadable' },
        confidence:
          weakField === 'operation_number' ? item.confidence : atLeast(0.96),
      },
      {
        field: 'amount',
        value: { kind: 'money', amountCents: item.amountCents, currency: 'PEN' },
        confidence: weakField === 'amount' ? item.confidence : atLeast(0.97),
      },
      {
        field: 'paid_at',
        value: unreadable
          ? { kind: 'unreadable' }
          : { kind: 'timestamp', iso: paidAtOf(item.submittedAt) },
        confidence: unreadable ? item.confidence : atLeast(0.9),
      },
      {
        field: 'payer_name',
        value: unreadable
          ? { kind: 'unreadable' }
          : { kind: 'text', text: item.studentName },
        confidence: unreadable ? item.confidence : atLeast(0.86),
      },
      {
        field: 'method',
        value: { kind: 'method', method: item.method },
        confidence: atLeast(0.99),
      },
    ],
    // Tier 0: the same picture was already approved for somebody else. It is a
    // block, not a doubt — the reviewer is confirming a match, not reading a
    // number.
    duplicateOf:
      item.flag === 'duplicate_phash'
        ? {
            studentName: 'Diego Huamán Ccopa',
            operationNumber: item.operationNumber,
            approvedAt: '2026-07-11T12:34:00Z',
          }
        : null,
    // Tier 2: a model of another family read the same picture. Agreement is
    // the criterion, never the more expensive model (CLAUDE.md §5) — so both
    // readings are shown and neither vendor settles it.
    secondOpinion:
      item.flag === 'model_divergence'
        ? {
            // The whole case is the two readings differing: the digit has to
            // change, whatever the original one was.
            operationNumber: item.operationNumber
              ? `${item.operationNumber.slice(0, -1)}${
                  (Number(item.operationNumber.slice(-1)) + 1) % 10
                }`
              : null,
            amountCents: item.amountCents,
            confidence: 0.61,
          }
        : null,
  }
}

/** Every queued receipt's extraction, keyed by the queue row it belongs to. */
export function listReceiptExtractions(): Record<string, ReceiptExtraction> {
  return Object.fromEntries(
    listReviewQueue().map((item) => [item.id, extractionOf(item)]),
  )
}

/* -------------------------------------------------------------------------- */
/* Enrollments — the ledger of seats, and the reservations still open          */
/* -------------------------------------------------------------------------- */

/**
 * The price in force per course this period. One entry, not a range: there is
 * no discount and no negotiated value (CLAUDE.md §1), so what the backoffice
 * form offers is the same number the student saw on the public page. The real
 * source is the versioned price table, and the enrollment freezes the
 * `plan_price_id` in force (CLAUDE.md §5) — which is why the id travels with
 * the amount and never gets recomputed from it.
 */
const PLAN_PRICES: Record<string, { amountCents: number; planId: string; planPriceId: string }> = {
  'Inglés Básico A1': { amountCents: 6990, planId: 'pl_en_a1', planPriceId: 'pp_en_a1_v3' },
  'Inglés Intermedio B1': { amountCents: 7990, planId: 'pl_en_b1', planPriceId: 'pp_en_b1_v2' },
  'Inglés Introductorio': { amountCents: 4990, planId: 'pl_en_int', planPriceId: 'pp_en_int_v1' },
  'Francés Inicial': { amountCents: 6490, planId: 'pl_fr_i', planPriceId: 'pp_fr_i_v2' },
  'Alemán Inicial': { amountCents: 6990, planId: 'pl_de_i', planPriceId: 'pp_de_i_v1' },
  'Italiano Inicial': { amountCents: 6490, planId: 'pl_it_i', planPriceId: 'pp_it_i_v1' },
  'Portugués Inicial': { amountCents: 5990, planId: 'pl_pt_i', planPriceId: 'pp_pt_i_v2' },
  'Quechua Conversacional': { amountCents: 5490, planId: 'pl_qu_i', planPriceId: 'pp_qu_i_v1' },
  'Chino Mandarín Básico': { amountCents: 7490, planId: 'pl_zh_b', planPriceId: 'pp_zh_b_v1' },
}

/** The only plan sold today — the whole package, one payment (CLAUDE.md §1). */
const PLAN_NAME = 'Paquete completo'

/**
 * What a course costs right now. Returns null rather than a fallback price: a
 * form that invents an amount is a form that can under-charge somebody, and
 * "this course has no price in force" is the honest answer to give the reader.
 */
export function getPlanPrice(courseName: string): PlanPrice | null {
  const price = PLAN_PRICES[courseName]
  if (!price) return null
  return {
    courseName,
    planName: PLAN_NAME,
    planId: price.planId,
    planPriceId: price.planPriceId,
    amountCents: price.amountCents,
    currency: 'PEN',
  }
}

/** Every price in force, for the form that has to show one without guessing. */
export function listPlanPrices(): PlanPrice[] {
  return Object.keys(PLAN_PRICES)
    .map((courseName) => getPlanPrice(courseName))
    .filter((price): price is PlanPrice => price !== null)
}

/** Course name → the catalog's language, for the ledger filter. */
function languageOf(courseName: string): CourseLanguage | null {
  return courses.find((course) => course.name === courseName)?.language ?? null
}

/**
 * Enrollment id → the class group whose roster claims it. The roster is the
 * join the real schema has as a foreign key; here it is the only honest link,
 * because two class groups of the same course share a course name and would
 * otherwise be told apart by a label.
 */
function classGroupOf(enrollmentId: string): ClassGroupSeed | undefined {
  return classGroups.find((group) =>
    group.students.some((student) => student.enrollmentId === enrollmentId),
  )
}

/**
 * Every enrollment in the institution, newest first — the seat side of what the
 * payments ledger shows as money. The two are deliberately separate screens:
 * `payments` is agnostic of origin and counts constancias alongside courses
 * (CLAUDE.md §5), while this one only ever counts people sitting in a class
 * group, which is what coordination closes the period against.
 */
/**
 * The tracking code the checkout shows the student on its confirmation screen.
 * Derived here from the enrollment id so the mock is stable; the real one is
 * issued by `apps/api` at submit and stored on the row.
 */
function enrollmentCode(id: string, createdAt: string): string {
  const digits = id.replace(/\D/g, '').slice(-4).padStart(4, '0')
  return `OOC-${createdAt.slice(0, 4)}-${digits}`
}

export function listEnrollments(): EnrollmentRow[] {
  const rows: EnrollmentRow[] = []

  for (const student of students) {
    const studentName = `${student.firstName} ${student.lastName}`
    for (const item of student.enrollments) {
      const group = classGroupOf(item.id)
      rows.push({
        id: item.id,
        code: enrollmentCode(item.id, item.createdAt),
        studentId: student.id,
        studentName,
        courseName: item.courseName,
        classGroupId: group?.id ?? null,
        classGroupName: item.classGroupName,
        teacherName: item.teacherName,
        language: group?.language ?? languageOf(item.courseName),
        modality: item.modality,
        academicPeriodName: item.academicPeriodName,
        status: item.status,
        seatStatus: item.seatStatus,
        planName: item.planName,
        planPriceId: item.planPriceId,
        amountCents: item.amountCents,
        currency: item.currency,
        paymentStatus: item.paymentStatus,
        paymentMethod: item.paymentMethod,
        paymentMethodDetail: item.paymentMethodDetail,
        operationNumber: item.operationNumber,
        createdAt: item.createdAt,
        paidAt: item.paidAt,
        progressPct: item.progressPct,
      })
    }
  }

  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** An hour, in milliseconds — the unit the reservation countdown is read in. */
const HOUR_MS = 3_600_000

/** Inside this many hours of expiry, a reservation is worth chasing today. */
export const RESERVATION_WARNING_HOURS = 24

/**
 * The seats currently held by an unsettled payment, soonest to expire first.
 * The deadline is the reservation window from the payment settings
 * (CLAUDE.md §5) counted from when the seat was taken — the same number the
 * cron releases against, read from one place so the screen cannot promise a
 * day the job does not honour.
 *
 * `now` is a parameter so the page passes the request's clock: computing it
 * inside a component would hydrate a different countdown than it rendered.
 */
export function listSeatReservations(now: Date = new Date()): SeatReservation[] {
  const windowMs = getPaymentSettings().reservationDays * 24 * HOUR_MS
  const queue = listReviewQueue()

  return listEnrollments()
    .filter((row) => row.seatStatus === 'reserved')
    .map((row) => {
      const expiresAt = new Date(new Date(row.createdAt).getTime() + windowMs)
      const open = queue.find(
        (item) =>
          item.studentId === row.studentId && item.courseName === row.courseName,
      )
      return {
        enrollmentId: row.id,
        studentId: row.studentId,
        studentName: row.studentName,
        courseName: row.courseName,
        classGroupName: row.classGroupName,
        classGroupId: row.classGroupId,
        paymentStatus: row.paymentStatus,
        flag: open?.flag ?? null,
        // The queued receipt itself, so the row can open that one instead of
        // handing the reader the whole queue back.
        reviewId: open?.id ?? null,
        amountCents: row.amountCents,
        currency: row.currency,
        reservedAt: row.createdAt,
        expiresAt: expiresAt.toISOString(),
        hoursLeft: Math.floor((expiresAt.getTime() - now.getTime()) / HOUR_MS),
      }
    })
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))
}

/** Period figures for the section header. */
export function getEnrollmentMetrics(now: Date = new Date()): EnrollmentMetrics {
  const rows = listEnrollments()
  const reservations = listSeatReservations(now)
  return {
    periodName: PERIOD,
    total: rows.length,
    active: rows.filter((row) => row.status === 'active').length,
    reserved: reservations.length,
    expiringSoon: reservations.filter(
      (item) => item.hoursLeft <= RESERVATION_WARNING_HOURS,
    ).length,
    released: rows.filter((row) => row.seatStatus === 'released').length,
  }
}

/* -------------------------------------------------------------------------- */
/* Team — the accounts that open the panel, and the cargo each one opens it with */
/* -------------------------------------------------------------------------- */

/**
 * The Asociación's own people, as accounts. Small on purpose: this is staff,
 * not students — the panel is opened by a dozen people, and every one of them
 * can reach data that belongs to thousands.
 *
 * A `teacher` row points at the teacher record behind it (`teacherId`), which
 * is what narrows the panel to their own class groups. The rest have none:
 * administración, coordinación and tesorería are cargos, not fichas.
 *
 * Names are fictional, like the rest of this module.
 */
const staffMembers: StaffMemberRow[] = [
  {
    id: 'staff_01',
    firstName: 'Lucía',
    lastName: 'Ramírez',
    email: 'lucia.ramirez@onlyonecoin.edu.pe',
    role: 'admin',
    status: 'active',
    teacherId: null,
    mfaEnrolled: true,
    joinedAt: '2024-03-04',
    lastAccessAt: '2026-08-21T13:40:00Z',
  },
  {
    /* An admin without a second factor: exactly what the directory exists to
       make visible, on the cargo where it costs the most (CLAUDE.md §8). */
    id: 'staff_02',
    firstName: 'Renzo',
    lastName: 'Ballón',
    email: 'renzo.ballon@onlyonecoin.edu.pe',
    role: 'admin',
    status: 'active',
    teacherId: null,
    mfaEnrolled: false,
    joinedAt: '2025-01-13',
    lastAccessAt: '2026-08-20T22:05:00Z',
  },
  {
    id: 'staff_03',
    firstName: 'Miriam',
    lastName: 'Quispe',
    email: 'miriam.quispe@onlyonecoin.edu.pe',
    role: 'coordinator',
    status: 'active',
    teacherId: null,
    mfaEnrolled: true,
    joinedAt: '2024-06-10',
    lastAccessAt: '2026-08-21T15:12:00Z',
  },
  {
    id: 'staff_04',
    firstName: 'Elena',
    lastName: 'Vargas',
    email: 'elena.vargas@onlyonecoin.edu.pe',
    role: 'treasury',
    status: 'active',
    teacherId: null,
    mfaEnrolled: true,
    joinedAt: '2025-02-24',
    lastAccessAt: '2026-08-21T11:02:00Z',
  },
  {
    /* Opened for the busy season and never used since — an account nobody
       signs into still opens the panel if somebody finds the password. */
    id: 'staff_05',
    firstName: 'Iván',
    lastName: 'Cárdenas',
    email: 'ivan.cardenas@onlyonecoin.edu.pe',
    role: 'mass_approver',
    status: 'active',
    teacherId: null,
    mfaEnrolled: false,
    joinedAt: '2026-07-28',
    lastAccessAt: null,
  },
  {
    id: 'staff_06',
    firstName: 'Carlos',
    lastName: 'Meza',
    email: 'carlos.meza@onlyonecoin.edu.pe',
    role: 'teacher',
    status: 'active',
    teacherId: 'tea_01',
    mfaEnrolled: false,
    joinedAt: '2024-04-02',
    lastAccessAt: '2026-08-19T23:30:00Z',
  },
  {
    id: 'staff_07',
    firstName: 'Andrea',
    lastName: 'Solís',
    email: 'andrea.solis@onlyonecoin.edu.pe',
    role: 'teacher',
    status: 'active',
    teacherId: 'tea_02',
    mfaEnrolled: false,
    joinedAt: '2024-09-16',
    lastAccessAt: '2026-08-21T02:15:00Z',
  },
  {
    id: 'staff_08',
    firstName: 'Rosa',
    lastName: 'Ccahuana',
    email: 'rosa.ccahuana@onlyonecoin.edu.pe',
    role: 'teacher',
    status: 'active',
    teacherId: 'tea_05',
    mfaEnrolled: false,
    joinedAt: '2025-03-11',
    lastAccessAt: '2026-08-18T01:44:00Z',
  },
  {
    /* Left the Asociación. The account is closed, never deleted: the payments
       she approved and the entries she signed still point at her
       (CLAUDE.md §6). */
    id: 'staff_09',
    firstName: 'Hugo',
    lastName: 'Delgado',
    email: 'hugo.delgado@onlyonecoin.edu.pe',
    role: 'coordinator',
    status: 'inactive',
    teacherId: null,
    mfaEnrolled: true,
    joinedAt: '2023-08-21',
    lastAccessAt: '2026-04-30T16:20:00Z',
  },
]

/**
 * The cargo ledger. In the database this is `audit_log` — append-only, no grant
 * of UPDATE or DELETE, not even for admin (CLAUDE.md §8) — so the panel reads
 * it and never edits it. The alta of an account is a line too: `fromRole` null
 * is "there was no cargo before this one".
 */
const staffRoleChanges: StaffRoleChange[] = [
  {
    id: 'rol_06',
    at: '2026-07-28T14:05:00Z',
    memberId: 'staff_05',
    memberName: 'Iván Cárdenas',
    fromRole: null,
    toRole: 'mass_approver',
    actorName: 'Lucía Ramírez',
    actorRole: 'admin',
  },
  {
    id: 'rol_05',
    at: '2026-05-04T17:30:00Z',
    memberId: 'staff_03',
    memberName: 'Miriam Quispe',
    fromRole: 'treasury',
    toRole: 'coordinator',
    actorName: 'Lucía Ramírez',
    actorRole: 'admin',
  },
  {
    id: 'rol_04',
    at: '2026-03-11T15:10:00Z',
    memberId: 'staff_08',
    memberName: 'Rosa Ccahuana',
    fromRole: null,
    toRole: 'teacher',
    actorName: 'Renzo Ballón',
    actorRole: 'admin',
  },
  {
    id: 'rol_03',
    at: '2026-02-24T13:00:00Z',
    memberId: 'staff_04',
    memberName: 'Elena Vargas',
    fromRole: null,
    toRole: 'treasury',
    actorName: 'Lucía Ramírez',
    actorRole: 'admin',
  },
  {
    id: 'rol_02',
    at: '2025-01-13T16:45:00Z',
    memberId: 'staff_02',
    memberName: 'Renzo Ballón',
    fromRole: 'coordinator',
    toRole: 'admin',
    actorName: 'Lucía Ramírez',
    actorRole: 'admin',
  },
  {
    id: 'rol_01',
    at: '2024-06-10T14:20:00Z',
    memberId: 'staff_03',
    memberName: 'Miriam Quispe',
    fromRole: null,
    toRole: 'treasury',
    actorName: 'Lucía Ramírez',
    actorRole: 'admin',
  },
]

/** The team directory, ordered the way a roster is read: by surname. */
export function listStaff(): StaffMemberRow[] {
  return [...staffMembers].sort(
    (a, b) =>
      a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
  )
}

/** The cargo ledger, newest first — it is read as "what changed lately". */
export function listStaffRoleChanges(): StaffRoleChange[] {
  return [...staffRoleChanges].sort((a, b) => b.at.localeCompare(a.at))
}

/* -------------------------------------------------------------------------- */
/* E-mail                                                                      */
/* -------------------------------------------------------------------------- */

/** The window every figure on the e-mail screen is measured over. */
const EMAIL_WINDOW_DAYS = 30

/**
 * One sample per audience, shared by every flow written to it. The preview is
 * read by staff to check wording, so it renders over invented people — a real
 * student's name has no business on that screen (CLAUDE.md §8).
 */
const studentSample = {
  studentName: 'María Fernanda Quispe Rojas',
  studentEmail: 'maria.quispe@gmail.com',
  guardianName: 'Rosa Elena Rojas Sánchez',
  guardianEmail: 'rosa.rojas@gmail.com',
  teacherName: 'Elena Ríos Salazar',
  teacherEmail: 'elena.rios@onlyonecoin.edu.pe',
  staffName: 'Lucía Ramírez',
  staffEmail: 'lucia.ramirez@onlyonecoin.edu.pe',
  courseName: 'Inglés Básico A1',
  classGroupName: 'A1 — Lun/Mié 18:00',
  amountCents: 6990,
  date: '2026-09-07T23:00:00Z',
}

/**
 * The transactional catalog. Every entry is an e-mail that leaves on its own,
 * as the consequence of something the domain did — there is no send button per
 * message (`docs/DOCUMENTOS-E-CERTIFICADOS.md` §4).
 *
 * The counts are the last 30 days as the provider reported them back. They sit
 * next to each other on purpose: a flow whose bounces climb is one whose
 * addresses are wrong, and that only shows against its own volume.
 */
export function listEmailFlows(): EmailFlow[] {
  return [
    {
      template: 'enrollment_submitted',
      audience: 'student',
      stage: 'submitted',
      conditional: false,
      enabled: true,
      version: 4,
      updatedAt: '2026-08-04T14:20:00Z',
      metrics: { sent: 4128, delivered: 4061, bounced: 54, failed: 13 },
      sample: studentSample,
    },
    {
      template: 'guardian_consent_reminder',
      audience: 'guardian',
      stage: 'submitted',
      conditional: true,
      enabled: true,
      version: 2,
      updatedAt: '2026-07-18T13:00:00Z',
      metrics: { sent: 486, delivered: 470, bounced: 14, failed: 2 },
      sample: studentSample,
    },
    {
      template: 'payment_under_review',
      audience: 'student',
      stage: 'payment_pending',
      conditional: true,
      enabled: true,
      version: 2,
      updatedAt: '2026-07-22T16:05:00Z',
      metrics: { sent: 612, delivered: 604, bounced: 6, failed: 2 },
      sample: studentSample,
    },
    {
      template: 'seat_reservation_expiring',
      audience: 'student',
      stage: 'payment_pending',
      conditional: true,
      enabled: true,
      version: 1,
      updatedAt: '2026-08-16T10:05:00Z',
      metrics: { sent: 173, delivered: 171, bounced: 2, failed: 0 },
      sample: studentSample,
    },
    {
      template: 'payment_approved',
      audience: 'student',
      stage: 'payment_settled',
      conditional: false,
      enabled: true,
      version: 5,
      updatedAt: '2026-08-11T11:40:00Z',
      metrics: { sent: 3907, delivered: 3854, bounced: 41, failed: 12 },
      sample: studentSample,
    },
    {
      template: 'payment_rejected',
      audience: 'student',
      stage: 'payment_settled',
      conditional: true,
      enabled: true,
      version: 3,
      updatedAt: '2026-07-30T09:15:00Z',
      metrics: { sent: 214, delivered: 209, bounced: 4, failed: 1 },
      sample: studentSample,
    },
    {
      template: 'credentials_issued',
      audience: 'student',
      stage: 'access',
      conditional: false,
      enabled: true,
      version: 6,
      updatedAt: '2026-08-14T18:30:00Z',
      metrics: { sent: 3891, delivered: 3822, bounced: 57, failed: 12 },
      sample: studentSample,
    },
    {
      /* Off in the mock so the journey has to show what that costs: three days
         before the class group starts, nobody gets the Classroom link
         (`docs/REGRAS-NEGOCIO.md` §8). A paused flow is a silence, not a gap. */
      template: 'class_access_ready',
      audience: 'student',
      stage: 'access',
      conditional: false,
      enabled: false,
      version: 2,
      updatedAt: '2026-08-02T15:45:00Z',
      metrics: { sent: 0, delivered: 0, bounced: 0, failed: 0 },
      sample: studentSample,
    },
    {
      template: 'enrollment_certificate_issued',
      audience: 'student',
      stage: 'documents',
      conditional: true,
      enabled: true,
      version: 3,
      updatedAt: '2026-08-09T12:10:00Z',
      metrics: { sent: 96, delivered: 95, bounced: 1, failed: 0 },
      sample: studentSample,
    },
    {
      template: 'certificate_issued',
      audience: 'student',
      stage: 'documents',
      conditional: false,
      enabled: true,
      version: 4,
      updatedAt: '2026-08-12T17:25:00Z',
      metrics: { sent: 341, delivered: 336, bounced: 4, failed: 1 },
      sample: studentSample,
    },

    /* Internal. Small volumes — there are two dozen teachers, not five
       thousand students — and no stage: none of these is a step of the
       student's journey. */
    {
      template: 'teacher_credentials_issued',
      audience: 'teacher',
      stage: null,
      conditional: false,
      enabled: true,
      version: 2,
      updatedAt: '2026-07-28T15:10:00Z',
      metrics: { sent: 4, delivered: 4, bounced: 0, failed: 0 },
      sample: studentSample,
    },
    {
      template: 'teacher_class_group_assigned',
      audience: 'teacher',
      stage: null,
      conditional: false,
      enabled: true,
      version: 3,
      updatedAt: '2026-08-06T10:35:00Z',
      metrics: { sent: 21, delivered: 21, bounced: 0, failed: 0 },
      sample: studentSample,
    },
    {
      /* 45 days out, the number the panel already watches
         (`CONTRACT_ALERT_DAYS`, CLAUDE.md §1 — provisional). */
      template: 'teacher_contract_expiring',
      audience: 'teacher',
      stage: null,
      conditional: true,
      enabled: true,
      version: 1,
      updatedAt: '2026-08-19T09:00:00Z',
      metrics: { sent: 3, delivered: 3, bounced: 0, failed: 0 },
      sample: studentSample,
    },
    {
      template: 'teacher_grades_pending',
      audience: 'teacher',
      stage: null,
      conditional: true,
      enabled: true,
      version: 2,
      updatedAt: '2026-08-15T13:20:00Z',
      metrics: { sent: 7, delivered: 7, bounced: 0, failed: 0 },
      sample: studentSample,
    },
    {
      /* The batch is never fired by a date — the list is prepared and
         coordination confirms it (`docs/DOCUMENTOS-E-CERTIFICADOS.md`). This
         e-mail is what tells them the list is ready. */
      template: 'staff_certificates_ready',
      audience: 'staff',
      stage: null,
      conditional: false,
      enabled: true,
      version: 1,
      updatedAt: '2026-08-17T16:40:00Z',
      metrics: { sent: 5, delivered: 5, bounced: 0, failed: 0 },
      sample: studentSample,
    },
  ]
}

/** The header figures — the same window, summed over the catalog. */
export function getEmailMetrics(): EmailMetrics {
  const flows = listEmailFlows()
  return {
    windowDays: EMAIL_WINDOW_DAYS,
    sent: flows.reduce((total, flow) => total + flow.metrics.sent, 0),
    delivered: flows.reduce((total, flow) => total + flow.metrics.delivered, 0),
    bounced: flows.reduce((total, flow) => total + flow.metrics.bounced, 0),
    failed: flows.reduce((total, flow) => total + flow.metrics.failed, 0),
    paused: flows.filter((flow) => !flow.enabled).length,
  }
}

/** One flow, by the template it renders — the id the detail route carries. */
export function getEmailFlow(template: string): EmailFlow | undefined {
  return listEmailFlows().find((flow) => flow.template === template)
}

/**
 * How many people a manual send would reach, resolved against the enrollment
 * ledger the same way the real query will: the segment is a question answered
 * at send time, never a list kept at the provider (`docs/ROADMAP.md` fase 5).
 *
 * Counted by student, not by enrollment — somebody enrolled in two courses is
 * one person receiving one e-mail.
 */
export function countEmailRecipients(segment: EmailSegment): number {
  const rows = listEnrollments().filter((row) => {
    switch (segment.kind) {
      case 'all':
        return true
      case 'course':
        return row.courseName === segment.courseName
      case 'class_group':
        return row.classGroupId === segment.classGroupId
      case 'enrollment_status':
        return row.status === segment.status
    }
  })
  return new Set(rows.map((row) => row.studentId)).size
}

/**
 * The deliveries that did not land, newest first. Not a report: it is a list of
 * people the institution failed to reach — the student whose credentials
 * bounced cannot get into the portal, and nobody finds that out from a counter.
 */
export function listEmailDeliveryIssues(): EmailDeliveryIssue[] {
  return [
    {
      id: 'del_01',
      template: 'credentials_issued',
      studentId: 'stu_0002',
      studentName: 'Jhon Alexander Mamani Ccama',
      address: 'jhon.mamani@outlook.com',
      state: 'bounced',
      reason: 'mailbox_full',
      at: '2026-08-23T14:20:00Z',
      attempts: 3,
    },
    {
      id: 'del_02',
      template: 'payment_approved',
      studentId: 'stu_0006',
      studentName: 'Diego Huamán Ccopa',
      address: 'diego.huaman@gmial.com',
      state: 'bounced',
      reason: 'domain_invalid',
      at: '2026-08-23T02:41:00Z',
      attempts: 1,
    },
    {
      id: 'del_03',
      template: 'enrollment_submitted',
      studentId: 'stu_0007',
      studentName: 'Valentina Núñez Ibarra',
      address: 'valentina.nunez@gmail.com',
      state: 'failed',
      reason: 'provider_error',
      at: '2026-08-22T19:05:00Z',
      attempts: 3,
    },
    {
      id: 'del_04',
      template: 'credentials_issued',
      studentId: 'stu_0004',
      studentName: 'Sebastián Ríos Paredes',
      address: 'sebastian.ríos@gmail.com',
      state: 'bounced',
      reason: 'address_unknown',
      at: '2026-08-22T16:30:00Z',
      attempts: 2,
    },
    {
      id: 'del_05',
      template: 'certificate_issued',
      studentId: 'stu_0003',
      studentName: 'Camila Torres Vílchez',
      address: 'camila.torres@gmail.com',
      state: 'bounced',
      reason: 'mailbox_full',
      at: '2026-08-21T22:14:00Z',
      attempts: 3,
    },
    {
      id: 'del_06',
      template: 'guardian_consent_reminder',
      studentId: 'stu_0008',
      studentName: 'Renzo Palacios Vega',
      address: 'renzo.palacios@gmail.com',
      state: 'bounced',
      reason: 'blocked_by_server',
      at: '2026-08-21T11:02:00Z',
      attempts: 2,
    },
    {
      id: 'del_07',
      template: 'payment_approved',
      studentId: 'stu_0005',
      studentName: 'Ana Lucía Chávez Soto',
      address: 'analucia.chavez@gmail.com',
      state: 'failed',
      reason: 'provider_error',
      at: '2026-08-20T09:48:00Z',
      attempts: 3,
    },
  ]
}
