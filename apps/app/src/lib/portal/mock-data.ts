import type {
  ClassGroup,
  ContinuationOffer,
  Course,
  Enrollment,
  PortalDocument,
  PortalNotification,
  PortalSession,
  ProcedureCatalogItem,
  StudentRequest,
} from './types'

/**
 * Mock portal session for the UI/UX phase. Every value shaped like the future
 * database row it will replace (CLAUDE.md §5). Swapping this for real queries
 * should not require touching any component.
 *
 * Persona: María Fernanda, 16 (minor → guardian-consent flow is central,
 * CLAUDE.md §1), with four enrollments so every UI branch has data:
 * — Inglés Básico A1, **monthly** (decision 02/09/2026) with the current
 *   month unpaid past its date → class access locked (the portal cadeado);
 * — Quechua Básico, package, active and joinable (happy path);
 * — Portugués Inicial, package, under review;
 * — Italiano Inicial, completed with a certificate-earning grade (≥ 14),
 *   which unlocks the next-level continuation offer.
 *
 * Prices are honest per-course numbers, not the S/1 landing hook. Only the
 * S/25 constancia is a confirmed price (docs/REGRAS-NEGOCIO.md §5); the other
 * procedure prices are placeholders until the table is confirmed. Dates are
 * UTC; the UI renders them in America/Lima. "Today" in this dataset is early
 * September 2026.
 */

const englishCourse: Course = {
  id: 'course_en_a1',
  name: 'Inglés Básico A1',
  summary:
    'Primer nivel de inglés: saludos, presentaciones y conversación cotidiana.',
  minAge: 12,
  level: 'A1',
  requiresCertificationExam: true,
  materials: [
    {
      id: 'mat_en_1',
      title: 'Cuadernillo de trabajo — Unidad 1',
      url: 'https://drive.google.com/file/d/example-workbook-u1',
      kind: 'doc',
    },
    {
      id: 'mat_en_2',
      title: 'Audios de pronunciación — Unidad 1',
      url: 'https://drive.google.com/file/d/example-audio-u1',
      kind: 'audio',
    },
    {
      id: 'mat_en_3',
      title: 'Video de repaso — Verbo to be',
      url: 'https://youtube.com/watch?v=example',
      kind: 'video',
    },
  ],
}

const quechuaCourse: Course = {
  id: 'course_qu_basico',
  name: 'Quechua Básico',
  summary:
    'Taller de quechua chanka: saludos, presentaciones y vocabulario del día a día.',
  minAge: 14,
  level: 'Básico',
  requiresCertificationExam: false,
  materials: [
    {
      id: 'mat_qu_1',
      title: 'Guía de escritura — Sesión 1',
      url: 'https://drive.google.com/file/d/example-quechua-s1',
      kind: 'doc',
    },
  ],
}

const portugueseCourse: Course = {
  id: 'course_pt_a1',
  name: 'Portugués Inicial',
  summary: 'Portugués para hispanohablantes: fonética, saludos y frases útiles.',
  minAge: 14,
  level: 'A1',
  requiresCertificationExam: false,
  materials: [],
}

const italianCourse: Course = {
  id: 'course_it_a1',
  name: 'Italiano Inicial',
  summary: 'Italiano desde cero: pronunciación, saludos y conversación básica.',
  minAge: 14,
  level: 'A1',
  requiresCertificationExam: false,
  materials: [
    {
      id: 'mat_it_1',
      title: 'Glosario del curso',
      url: 'https://drive.google.com/file/d/example-glossary-it',
      kind: 'doc',
    },
  ],
}

const englishGroup: ClassGroup = {
  id: 'cg_en_a1_ago',
  courseId: englishCourse.id,
  name: 'Inglés A1 — Turno Tarde (Lun/Mié)',
  teacherName: 'Prof. Carla Ríos',
  schedule: [
    { weekday: 1, startTime: '18:00', endTime: '19:30' },
    { weekday: 3, startTime: '18:00', endTime: '19:30' },
  ],
  startDate: '2026-06-01T23:00:00Z',
  endDate: '2026-12-16T23:00:00Z',
  capacity: 25,
  seatsTaken: 21,
  meetingUrl: 'https://meet.google.com/abc-defg-hij',
}

const quechuaGroup: ClassGroup = {
  id: 'cg_qu_basico_sab',
  courseId: quechuaCourse.id,
  name: 'Quechua Básico — Turno Mañana (Sáb)',
  teacherName: 'Prof. Elmer Ccahuana',
  schedule: [{ weekday: 6, startTime: '09:00', endTime: '11:00' }],
  startDate: '2026-08-01T14:00:00Z',
  endDate: '2026-11-28T14:00:00Z',
  capacity: 30,
  seatsTaken: 24,
  meetingUrl: 'https://meet.google.com/qch-basi-sab',
}

const portugueseGroup: ClassGroup = {
  id: 'cg_pt_a1_noc',
  courseId: portugueseCourse.id,
  name: 'Portugués Inicial — Turno Noche (Mar/Jue)',
  teacherName: 'Prof. Bruno Antunes',
  schedule: [
    { weekday: 2, startTime: '20:00', endTime: '21:30' },
    { weekday: 4, startTime: '20:00', endTime: '21:30' },
  ],
  startDate: '2026-09-15T01:00:00Z',
  endDate: '2026-12-17T01:00:00Z',
  capacity: 20,
  seatsTaken: 11,
  meetingUrl: null,
}

const italianGroup: ClassGroup = {
  id: 'cg_it_a1_prev',
  courseId: italianCourse.id,
  name: 'Italiano Inicial — Turno Noche (Lun/Mié)',
  teacherName: 'Prof. Lucía Baresi',
  schedule: [
    { weekday: 1, startTime: '20:00', endTime: '21:30' },
    { weekday: 3, startTime: '20:00', endTime: '21:30' },
  ],
  startDate: '2026-03-16T01:00:00Z',
  endDate: '2026-07-29T01:00:00Z',
  capacity: 25,
  seatsTaken: 25,
  meetingUrl: 'https://meet.google.com/ita-prev-000',
}

const enrollments: Enrollment[] = [
  {
    id: 'enr_en_a1',
    code: 'IN-1122',
    status: 'active',
    seatStatus: 'confirmed',
    createdAt: '2026-05-25T15:12:00Z',
    course: englishCourse,
    classGroup: englishGroup,
    plan: {
      id: 'plan_en_a1',
      name: 'Inglés Básico A1 — Nivel completo',
      priceCents: 23960,
      currency: 'PEN',
    },
    planPriceId: 'pp_en_a1_2026s2',
    academicPeriod: {
      id: 'ap_2026_s2',
      name: 'Ciclo 2026-II',
      startDate: '2026-06-01T00:00:00Z',
      endDate: '2026-12-20T00:00:00Z',
    },
    billingMode: 'monthly',
    monthly: {
      modulePriceCents: 5990,
      currency: 'PEN',
      payments: [
        {
          moduleId: 'mod_en_1',
          dueDate: '2026-06-01',
          payment: {
            id: 'pay_en_m1',
            amountCents: 5990,
            currency: 'PEN',
            method: 'yape',
            status: 'approved',
            operationNumber: '00483920',
            paidAt: '2026-05-25T15:10:00Z',
          },
        },
        {
          moduleId: 'mod_en_2',
          dueDate: '2026-07-15',
          payment: {
            id: 'pay_en_m2',
            amountCents: 5990,
            currency: 'PEN',
            method: 'yape',
            status: 'approved',
            operationNumber: '00512244',
            paidAt: '2026-07-12T13:02:00Z',
          },
        },
        // The unpaid month: due date passed, no receipt yet. This null is what
        // the portal notice points at and what locks class access below.
        {
          moduleId: 'mod_en_3',
          dueDate: '2026-09-01',
          payment: null,
        },
      ],
    },
    modules: [
      {
        id: 'mod_en_1',
        name: 'Módulo 1 — Greetings & introductions',
        sequence: 1,
        startDate: '2026-06-01',
        endDate: '2026-07-14',
        status: 'completed',
      },
      {
        id: 'mod_en_2',
        name: 'Módulo 2 — Daily routines',
        sequence: 2,
        startDate: '2026-07-15',
        endDate: '2026-08-31',
        status: 'completed',
      },
      {
        id: 'mod_en_3',
        name: 'Módulo 3 — Food & places',
        sequence: 3,
        startDate: '2026-09-01',
        endDate: '2026-10-19',
        status: 'current',
      },
      {
        id: 'mod_en_4',
        name: 'Módulo 4 — Past & plans',
        sequence: 4,
        startDate: '2026-10-20',
        endDate: '2026-12-16',
        status: 'upcoming',
      },
    ],
    payment: {
      id: 'pay_en_m1',
      amountCents: 5990,
      currency: 'PEN',
      method: 'yape',
      status: 'approved',
      operationNumber: '00483920',
      paidAt: '2026-05-25T15:10:00Z',
    },
    classAccessLock: 'monthly_payment_due',
    finalGrade: null,
    progressPct: 50,
  },
  {
    id: 'enr_qu_basico',
    code: 'QU-0311',
    status: 'active',
    seatStatus: 'confirmed',
    createdAt: '2026-07-20T16:40:00Z',
    course: quechuaCourse,
    classGroup: quechuaGroup,
    plan: {
      id: 'plan_qu_basico',
      name: 'Quechua Básico — Taller completo',
      priceCents: 4990,
      currency: 'PEN',
    },
    planPriceId: 'pp_qu_basico_2026s2',
    academicPeriod: {
      id: 'ap_2026_s2',
      name: 'Ciclo 2026-II',
      startDate: '2026-06-01T00:00:00Z',
      endDate: '2026-12-20T00:00:00Z',
    },
    billingMode: 'package',
    monthly: null,
    modules: [
      {
        id: 'mod_qu_1',
        name: 'Módulo 1 — Rimanakuy (conversación)',
        sequence: 1,
        startDate: '2026-08-01',
        endDate: '2026-09-26',
        status: 'current',
      },
      {
        id: 'mod_qu_2',
        name: 'Módulo 2 — Vocabulario y escritura',
        sequence: 2,
        startDate: '2026-09-27',
        endDate: '2026-11-28',
        status: 'upcoming',
      },
    ],
    payment: {
      id: 'pay_qu',
      amountCents: 4990,
      currency: 'PEN',
      method: 'plin',
      status: 'approved',
      operationNumber: '77045512',
      paidAt: '2026-07-20T16:35:00Z',
    },
    classAccessLock: null,
    finalGrade: null,
    progressPct: 35,
  },
  {
    id: 'enr_pt_a1',
    code: 'PT-1183',
    status: 'under_review',
    seatStatus: 'reserved',
    createdAt: '2026-08-30T22:40:00Z',
    course: portugueseCourse,
    classGroup: portugueseGroup,
    plan: {
      id: 'plan_pt_a1',
      name: 'Portugués Inicial — Nivel completo',
      priceCents: 6990,
      currency: 'PEN',
    },
    planPriceId: 'pp_pt_a1_2026s2',
    academicPeriod: {
      id: 'ap_2026_s2',
      name: 'Ciclo 2026-II',
      startDate: '2026-06-01T00:00:00Z',
      endDate: '2026-12-20T00:00:00Z',
    },
    billingMode: 'package',
    monthly: null,
    modules: [
      {
        id: 'mod_pt_1',
        name: 'Módulo 1 — Fonética y saludos',
        sequence: 1,
        startDate: '2026-09-15',
        endDate: '2026-10-29',
        status: 'upcoming',
      },
      {
        id: 'mod_pt_2',
        name: 'Módulo 2 — Conversación cotidiana',
        sequence: 2,
        startDate: '2026-10-30',
        endDate: '2026-12-17',
        status: 'upcoming',
      },
    ],
    payment: {
      id: 'pay_pt_a1',
      amountCents: 6990,
      currency: 'PEN',
      method: 'plin',
      status: 'under_review',
      operationNumber: '77120045',
      paidAt: '2026-08-30T22:38:00Z',
    },
    classAccessLock: null,
    finalGrade: null,
    progressPct: null,
  },
  {
    id: 'enr_it_a1',
    code: 'IT-0947',
    status: 'completed',
    seatStatus: 'released',
    createdAt: '2026-03-02T11:00:00Z',
    course: italianCourse,
    classGroup: italianGroup,
    plan: {
      id: 'plan_it_a1',
      name: 'Italiano Inicial — Nivel completo',
      priceCents: 4990,
      currency: 'PEN',
    },
    planPriceId: 'pp_it_a1_2026s1',
    academicPeriod: {
      id: 'ap_2026_s1',
      name: 'Ciclo 2026-I',
      startDate: '2026-03-01T00:00:00Z',
      endDate: '2026-07-31T00:00:00Z',
    },
    billingMode: 'package',
    monthly: null,
    modules: [
      {
        id: 'mod_it_1',
        name: 'Módulo 1 — Pronuncia e saluti',
        sequence: 1,
        startDate: '2026-03-16',
        endDate: '2026-05-20',
        status: 'completed',
      },
      {
        id: 'mod_it_2',
        name: 'Módulo 2 — Conversazione di base',
        sequence: 2,
        startDate: '2026-05-21',
        endDate: '2026-07-29',
        status: 'completed',
      },
    ],
    payment: {
      id: 'pay_it_a1',
      amountCents: 4990,
      currency: 'PEN',
      method: 'bcp',
      status: 'approved',
      operationNumber: '10553218',
      paidAt: '2026-03-02T10:55:00Z',
    },
    classAccessLock: null,
    finalGrade: 16,
    progressPct: 100,
  },
]

const documents: PortalDocument[] = [
  {
    id: 'doc_cert_it_a1',
    type: 'certificate',
    status: 'available',
    enrollmentId: 'enr_it_a1',
    fileUrl: 'https://storage.example/certificate/enr_it_a1.pdf',
    issuedAt: '2026-08-28T14:00:00Z',
  },
  {
    id: 'doc_enrcert_en_a1',
    type: 'enrollment_certificate',
    status: 'available',
    enrollmentId: 'enr_en_a1',
    fileUrl: 'https://storage.example/enrollment-certificate/enr_en_a1.pdf',
    issuedAt: '2026-07-02T09:00:00Z',
  },
  {
    id: 'doc_cert_en_a1',
    type: 'certificate',
    status: 'locked',
    enrollmentId: 'enr_en_a1',
    fileUrl: null,
    issuedAt: null,
  },
  {
    id: 'doc_cert_qu_basico',
    type: 'certificate',
    status: 'locked',
    enrollmentId: 'enr_qu_basico',
    fileUrl: null,
    issuedAt: null,
  },
]

/**
 * Paid-procedures price table (docs/REGRAS-NEGOCIO.md §5). Only the S/25
 * constancia is a confirmed price; the rest are placeholders until the table
 * is confirmed. In production these come versioned from the backoffice.
 */
const procedures: ProcedureCatalogItem[] = [
  { type: 'enrollment_certificate', priceCents: 2500, currency: 'PEN' },
  { type: 'certification_exam', priceCents: 3000, currency: 'PEN' },
  { type: 'makeup_exam', priceCents: 2000, currency: 'PEN' },
  { type: 'enrollment_freeze', priceCents: 3500, currency: 'PEN' },
]

const requests: StudentRequest[] = [
  // The constancia that produced doc_enrcert_en_a1: request → payment approved
  // → coordination issued the document (paid procedure, never a free button).
  {
    id: 'req_const_en_a1',
    type: 'enrollment_certificate',
    status: 'completed',
    enrollmentId: 'enr_en_a1',
    priceCents: 2500,
    currency: 'PEN',
    createdAt: '2026-06-28T18:20:00Z',
    payment: {
      id: 'pay_req_const',
      amountCents: 2500,
      currency: 'PEN',
      method: 'yape',
      status: 'approved',
      operationNumber: '00497731',
      paidAt: '2026-06-28T18:15:00Z',
    },
    resultUrl: 'https://storage.example/enrollment-certificate/enr_en_a1.pdf',
  },
]

const offers: ContinuationOffer[] = [
  {
    id: 'offer_it_a2',
    kind: 'next_level',
    courseName: 'Italiano Intermedio',
    basedOnCourseName: italianCourse.name,
    priceCents: 5990,
    currency: 'PEN',
    groups: [
      {
        id: 'og_it_a2_sep',
        name: 'Italiano Intermedio — Turno Noche (Mar/Jue)',
        teacherName: 'Prof. Lucía Baresi',
        schedule: [
          { weekday: 2, startTime: '19:00', endTime: '20:30' },
          { weekday: 4, startTime: '19:00', endTime: '20:30' },
        ],
        startDate: '2026-09-15',
        seatsLeft: 12,
      },
      {
        id: 'og_it_a2_oct',
        name: 'Italiano Intermedio — Turno Mañana (Sáb)',
        teacherName: 'Prof. Marco Vitale',
        schedule: [{ weekday: 6, startTime: '10:00', endTime: '13:00' }],
        startDate: '2026-10-03',
        seatsLeft: 20,
      },
    ],
  },
]

const notifications: PortalNotification[] = [
  {
    id: 'ntf_monthly_en',
    kind: 'monthly_payment_due',
    createdAt: '2026-09-01T12:00:00Z',
    courseName: englishCourse.name,
  },
  {
    id: 'ntf_next_level_it',
    kind: 'next_level_invite',
    createdAt: '2026-08-30T15:00:00Z',
    courseName: 'Italiano Intermedio',
  },
  {
    id: 'ntf_cert_it',
    kind: 'document_ready',
    createdAt: '2026-08-28T14:05:00Z',
    courseName: italianCourse.name,
  },
]

const session: PortalSession = {
  student: {
    id: 'stu_mariafernanda',
    firstName: 'María Fernanda',
    lastName: 'Quispe Huamán',
    nationalIdType: 'DNI',
    nationalId: '71234567',
    email: 'maria.quispe@gmail.com',
    phone: '+51 987 654 321',
    secondaryEmail: null,
    secondaryPhone: null,
    birthDate: '2010-02-14T00:00:00Z',
    isMinor: true,
    guardian: {
      id: 'gdn_rosa',
      firstName: 'Rosa',
      lastName: 'Huamán Ccapa',
      nationalIdType: 'DNI',
      nationalId: '40998877',
      relationship: 'mother',
      email: 'rosa.huaman@example.com',
      phone: '+51 999 111 222',
      consent: {
        version: 'v1.2',
        acceptedAt: '2026-05-25T15:09:00Z',
        ip: '190.234.10.55',
      },
    },
  },
  enrollments,
  documents,
  requests,
  procedures,
  offers,
  notifications,
  // Saturday's Quechua session is the soonest joinable class. English would be
  // Monday — and locked anyway (see enr_en_a1.classAccessLock).
  nextClass: {
    enrollmentId: 'enr_qu_basico',
    courseName: quechuaCourse.name,
    classGroupName: quechuaGroup.name,
    teacherName: quechuaGroup.teacherName,
    startsAt: '2026-09-05T14:00:00Z',
    meetingUrl: quechuaGroup.meetingUrl,
    classAccessLock: null,
  },
}

/** Single entry point — mirrors a future `getPortalSession(userId)` query. */
export function getPortalSession(): PortalSession {
  return session
}

export function getEnrollment(id: string): Enrollment | undefined {
  return session.enrollments.find((e) => e.id === id)
}
