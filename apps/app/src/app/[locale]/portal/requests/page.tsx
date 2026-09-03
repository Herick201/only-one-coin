import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getPortalSession } from '@/lib/portal/mock-data'
import type { Enrollment, RequestType } from '@/lib/portal/types'
import { PageHeader } from '@/components/portal/ui'
import {
  RequestsView,
  type ProcedureView,
  type RequestView,
} from './requests-view'

/**
 * Which enrollments a procedure can act on. In production this is a domain
 * rule evaluated server-side; the mock mirrors the confirmed pieces:
 * — constancia / makeup exam: any enrollment that actually ran;
 * — certification exam: only courses that demand it (Inglés Básico);
 * — freeze: only active enrollments, and never intermedio/avanzado
 *   (docs/REGRAS-NEGOCIO.md §5 — current rule).
 */
function eligibleFor(type: RequestType, enrollments: Enrollment[]): Enrollment[] {
  switch (type) {
    case 'enrollment_certificate':
    case 'makeup_exam':
      return enrollments.filter(
        (e) => e.status === 'active' || e.status === 'completed',
      )
    case 'certification_exam':
      return enrollments.filter(
        (e) =>
          e.course.requiresCertificationExam &&
          (e.status === 'active' || e.status === 'completed'),
      )
    case 'enrollment_freeze':
      return enrollments.filter((e) => e.status === 'active')
  }
}

export default async function RequestsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('portal')

  const { enrollments, procedures, requests } = getPortalSession()

  const procedureViews: ProcedureView[] = procedures.map((p) => ({
    type: p.type,
    priceCents: p.priceCents,
    currency: p.currency,
    eligible: eligibleFor(p.type, enrollments).map((e) => ({
      enrollmentId: e.id,
      courseName: e.course.name,
    })),
  }))

  const requestViews: RequestView[] = requests.map((r) => ({
    id: r.id,
    type: r.type,
    status: r.status,
    courseName:
      enrollments.find((e) => e.id === r.enrollmentId)?.course.name ?? '',
    createdAt: r.createdAt,
    priceCents: r.priceCents,
    currency: r.currency,
    resultUrl: r.resultUrl,
  }))

  return (
    <div>
      <PageHeader title={t('requests.title')} subtitle={t('requests.subtitle')} />
      <RequestsView procedures={procedureViews} initialRequests={requestViews} />
    </div>
  )
}
