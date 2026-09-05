import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getPortalSession } from '@/lib/portal/mock-data'
import { formatDate } from '@/lib/portal/format'
import type { Locale } from '@/lib/portal/types'
import {
  Card,
  EmptyState,
  PageHeader,
  StatusBadge,
} from '@/components/portal/ui'
import { documentTone } from '@/components/portal/status-tone'
import { Icon } from '@/components/portal/icons'
import { AutoGrid } from '@/components/layout/auto-grid'

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = raw as Locale
  setRequestLocale(raw)
  const t = await getTranslations('portal')

  const { enrollments, documents } = getPortalSession()
  const enrollmentOf = (enrollmentId: string) =>
    enrollments.find((e) => e.id === enrollmentId)
  const courseName = (enrollmentId: string) =>
    enrollmentOf(enrollmentId)?.course.name ?? ''

  /**
   * Why a certificate is still locked: course completion with grade ≥ 14, and
   * — for Inglés Básico — also the separately-requested certification exam
   * (CLAUDE.md §1, docs/DOCUMENTOS-E-CERTIFICADOS.md).
   */
  const lockedNote = (doc: (typeof documents)[number]) => {
    if (doc.type !== 'certificate') return t('documents.locked_note')
    return enrollmentOf(doc.enrollmentId)?.course.requiresCertificationExam
      ? t('documents.locked_cert_exam_note')
      : t('documents.locked_cert_note')
  }

  return (
    <div>
      <PageHeader title={t('documents.title')} />

      {documents.length === 0 ? (
        <EmptyState
          title={t('documents.empty_title')}
          body={t('documents.empty_body')}
          icon={<Icon name="documents" size={24} />}
        />
      ) : (
        <AutoGrid as="ul" min="18rem">
          {documents.map((doc) => (
            <Card key={doc.id} as="li" className="flex flex-col gap-4 p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky text-brand-blue">
                  <Icon name="documents" size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-ink">
                    {t(`document_type.${doc.type}`)}
                  </h2>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {courseName(doc.enrollmentId)}
                  </p>
                </div>
                <StatusBadge
                  tone={documentTone[doc.status]}
                  label={t(`document_status.${doc.status}`)}
                />
              </div>

              {doc.status === 'available' ? (
                <div className="flex items-center justify-between gap-3">
                  {doc.issuedAt && (
                    <span className="text-xs text-muted-foreground">
                      {t('documents.issued_on', {
                        date: formatDate(doc.issuedAt, locale),
                      })}
                    </span>
                  )}
                  <a
                    href={doc.fileUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-brand-yellow hover:text-ink"
                  >
                    <Icon name="download" size={16} />
                    {t('common.download')}
                  </a>
                </div>
              ) : (
                <p className="rounded-xl bg-sky-soft px-3.5 py-2.5 text-xs text-muted-foreground">
                  {doc.status === 'pending'
                    ? t('documents.pending_note')
                    : lockedNote(doc)}
                </p>
              )}
            </Card>
          ))}
        </AutoGrid>
      )}

      <div className="mt-6 flex flex-col gap-2 text-xs text-muted-foreground">
        <p className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 text-brand-blue">
            <Icon name="alert" size={14} />
          </span>
          {t('documents.rules_note')}
        </p>
        <p className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 text-brand-blue">
            <Icon name="clipboard" size={14} />
          </span>
          <span>
            {t('documents.constancia_note')}{' '}
            <Link
              href="/portal/requests"
              className="font-semibold text-brand-blue transition hover:text-brand-blue-deep"
            >
              {t('documents.constancia_cta')}
            </Link>
          </span>
        </p>
      </div>
    </div>
  )
}
