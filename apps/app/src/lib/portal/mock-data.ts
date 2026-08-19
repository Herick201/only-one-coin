import type {
  ClassGroup,
  Course,
  Enrollment,
  PortalDocument,
  PortalSession,
} from './types'

/**
 * Mock portal session for the UI/UX phase. Every value shaped like the future
 * database row it will replace (CLAUDE.md §5). Swapping this for real queries
 * should not require touching any component.
 *
 * Persona: María Fernanda, 16 (minor → guardian-consent flow is central,
 * CLAUDE.md §1), with three enrollments across states so every UI branch has
 * data: one active, one under review, one completed.
 *
 * Prices reflect the honest per-course pricing (e.g. Inglés S/69.90), not the
 * S/1 landing hook. Dates are UTC; the UI renders them in America/Lima.
 */

const englishCourse: Course = {
  id: 'course_en_a1',
  name: 'Inglés Básico A1',
  summary:
    'Primer nivel de inglés: saludos, presentaciones y conversación cotidiana.',
  minAge: 12,
  level: 'A1',
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

const portugueseCourse: Course = {
  id: 'course_pt_a1',
  name: 'Portugués Inicial',
  summary: 'Portugués para hispanohablantes: fonética, saludos y frases útiles.',
  minAge: 14,
  level: 'A1',
  materials: [],
}

const englishIntroCourse: Course = {
  id: 'course_en_intro',
  name: 'Inglés Introductorio',
  summary: 'Taller introductorio de inglés de 8 semanas.',
  minAge: 12,
  level: 'Intro',
  materials: [
    {
      id: 'mat_intro_1',
      title: 'Glosario del taller',
      url: 'https://drive.google.com/file/d/example-glossary',
      kind: 'doc',
    },
  ],
}

const englishGroup: ClassGroup = {
  id: 'cg_en_a1_mar',
  courseId: englishCourse.id,
  name: 'Inglés A1 — Turno Tarde (Lun/Mié)',
  teacherName: 'Prof. Carla Ríos',
  modality: 'online',
  schedule: [
    { weekday: 1, startTime: '18:00', endTime: '19:30' },
    { weekday: 3, startTime: '18:00', endTime: '19:30' },
  ],
  startDate: '2026-08-04T23:00:00Z',
  endDate: '2026-11-26T23:00:00Z',
  capacity: 25,
  seatsTaken: 18,
  meetingUrl: 'https://meet.google.com/abc-defg-hij',
}

const portugueseGroup: ClassGroup = {
  id: 'cg_pt_a1_noc',
  courseId: portugueseCourse.id,
  name: 'Portugués Inicial — Turno Noche (Mar/Jue)',
  teacherName: 'Prof. Bruno Antunes',
  modality: 'online',
  schedule: [
    { weekday: 2, startTime: '20:00', endTime: '21:30' },
    { weekday: 4, startTime: '20:00', endTime: '21:30' },
  ],
  startDate: '2026-08-25T01:00:00Z',
  endDate: '2026-12-05T01:00:00Z',
  capacity: 20,
  seatsTaken: 11,
  meetingUrl: null,
}

const englishIntroGroup: ClassGroup = {
  id: 'cg_en_intro_prev',
  courseId: englishIntroCourse.id,
  name: 'Inglés Introductorio — Turno Mañana',
  teacherName: 'Prof. Carla Ríos',
  modality: 'online',
  schedule: [{ weekday: 6, startTime: '09:00', endTime: '11:00' }],
  startDate: '2026-04-04T14:00:00Z',
  endDate: '2026-05-30T14:00:00Z',
  capacity: 30,
  seatsTaken: 30,
  meetingUrl: 'https://meet.google.com/xyz-prev-000',
}

const enrollments: Enrollment[] = [
  {
    id: 'enr_en_a1',
    code: 'IN-1122',
    status: 'active',
    seatStatus: 'confirmed',
    createdAt: '2026-07-28T15:12:00Z',
    course: englishCourse,
    classGroup: englishGroup,
    plan: {
      id: 'plan_en_a1',
      name: 'Inglés Básico — Nivel completo',
      priceCents: 6990,
      currency: 'PEN',
    },
    planPriceId: 'pp_en_a1_2026s2',
    academicPeriod: {
      id: 'ap_2026_s2',
      name: 'Ciclo 2026-II',
      startDate: '2026-08-01T00:00:00Z',
      endDate: '2026-12-15T00:00:00Z',
    },
    payment: {
      id: 'pay_en_a1',
      amountCents: 6990,
      currency: 'PEN',
      method: 'yape',
      status: 'approved',
      operationNumber: '00483920',
      paidAt: '2026-07-28T15:10:00Z',
    },
    progressPct: 45,
  },
  {
    id: 'enr_pt_a1',
    code: 'PT-1183',
    status: 'under_review',
    seatStatus: 'reserved',
    createdAt: '2026-08-11T22:40:00Z',
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
      startDate: '2026-08-01T00:00:00Z',
      endDate: '2026-12-15T00:00:00Z',
    },
    payment: {
      id: 'pay_pt_a1',
      amountCents: 6990,
      currency: 'PEN',
      method: 'plin',
      status: 'under_review',
      operationNumber: '77120045',
      paidAt: '2026-08-11T22:38:00Z',
    },
    progressPct: null,
  },
  {
    id: 'enr_en_intro',
    code: 'IN-0947',
    status: 'completed',
    seatStatus: 'released',
    createdAt: '2026-03-20T11:00:00Z',
    course: englishIntroCourse,
    classGroup: englishIntroGroup,
    plan: {
      id: 'plan_en_intro',
      name: 'Inglés Introductorio — Taller',
      priceCents: 4990,
      currency: 'PEN',
    },
    planPriceId: 'pp_en_intro_2026s1',
    academicPeriod: {
      id: 'ap_2026_s1',
      name: 'Ciclo 2026-I',
      startDate: '2026-03-15T00:00:00Z',
      endDate: '2026-06-30T00:00:00Z',
    },
    payment: {
      id: 'pay_en_intro',
      amountCents: 4990,
      currency: 'PEN',
      method: 'bcp',
      status: 'approved',
      operationNumber: '10553218',
      paidAt: '2026-03-20T10:55:00Z',
    },
    progressPct: 100,
  },
]

const documents: PortalDocument[] = [
  {
    id: 'doc_cert_en_intro',
    type: 'certificate',
    status: 'available',
    enrollmentId: 'enr_en_intro',
    fileUrl: 'https://storage.example/certificate/enr_en_intro.pdf',
    issuedAt: '2026-06-05T14:00:00Z',
  },
  {
    id: 'doc_enrcert_en_a1',
    type: 'enrollment_certificate',
    status: 'available',
    enrollmentId: 'enr_en_a1',
    fileUrl: 'https://storage.example/enrollment-certificate/enr_en_a1.pdf',
    issuedAt: '2026-07-29T09:00:00Z',
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
    id: 'doc_enrcert_pt_a1',
    type: 'enrollment_certificate',
    status: 'pending',
    enrollmentId: 'enr_pt_a1',
    fileUrl: null,
    issuedAt: null,
  },
]

const session: PortalSession = {
  student: {
    id: 'stu_mariafernanda',
    firstName: 'María Fernanda',
    lastName: 'Quispe Huamán',
    nationalIdType: 'DNI',
    nationalId: '71234567',
    email: 'maria.quispe@example.com',
    phone: '+51 987 654 321',
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
        acceptedAt: '2026-07-28T15:09:00Z',
        ip: '190.234.10.55',
      },
    },
  },
  enrollments,
  documents,
  nextClass: {
    enrollmentId: 'enr_en_a1',
    courseName: englishCourse.name,
    classGroupName: englishGroup.name,
    teacherName: englishGroup.teacherName,
    startsAt: '2026-08-12T23:00:00Z',
    modality: 'online',
    meetingUrl: englishGroup.meetingUrl,
  },
}

/** Single entry point — mirrors a future `getPortalSession(userId)` query. */
export function getPortalSession(): PortalSession {
  return session
}

export function getEnrollment(id: string): Enrollment | undefined {
  return session.enrollments.find((e) => e.id === id)
}
