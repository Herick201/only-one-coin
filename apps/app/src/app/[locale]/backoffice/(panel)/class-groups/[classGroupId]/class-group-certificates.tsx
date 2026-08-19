'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { ClassGroupDetail, ClassGroupStudent } from '@/lib/backoffice/types'
import { PASSING_GRADE } from '@/lib/backoffice/mock-data'
import { certificateBlockReason } from '@/lib/backoffice/certificates'
import { formatDate, formatDateTime, type Locale } from '@/lib/format'
import {
  Card,
  EmptyState,
  SectionTitle,
  StatusBadge,
  TableShell,
  tdClass,
  thClass,
} from '@/components/backoffice/ui'
import {
  deliveryTone,
  examTone,
  gradeTone,
} from '@/components/backoffice/status-tone'
import { BoIcon } from '@/components/backoffice/icons'

/**
 * Batch certificate issuing for one class group, plus the roster it acts on.
 *
 * This is the answer to "otherwise it stays manual": the coordinator confirms
 * once and every eligible student gets a PDF and the e-mail that carries it —
 * one outbox row per document (CLAUDE.md §5), never a send button per student.
 *
 * What it deliberately does NOT do is fire on its own when the end date passes.
 * Who passed and who did not is a coordination call: `docs/REGRAS-NEGOCIO.md`
 * §3 puts the bar at grade 14 and §6 requires a certification exam for Inglés
 * Básico. The system gets the list ready; a human presses the button.
 */
export function ClassGroupCertificates({
  group,
  deadlineIso,
  businessDaysLeft,
}: {
  group: ClassGroupDetail
  deadlineIso: string
  businessDaysLeft: number
}) {
  const t = useTranslations('bo')
  const locale = useLocale() as Locale

  const [students, setStudents] = useState<ClassGroupStudent[]>(group.students)
  const [issuedAt, setIssuedAt] = useState<string | null>(null)

  const rows = students.map((student) => ({
    student,
    reason: certificateBlockReason(student, group.certificateRule),
  }))
  const eligible = rows.filter((row) => row.reason === null)
  const blocked = rows.filter((row) => row.reason !== null && row.reason !== 'already_issued')

  function issueBatch() {
    const now = new Date().toISOString()
    const ids = new Set(eligible.map((row) => row.student.studentId))
    setStudents((current) =>
      current.map((student) =>
        ids.has(student.studentId)
          ? {
              ...student,
              certificateIssuedAt: now,
              delivery: { status: 'queued', lastSentAt: null, attempts: 0 },
            }
          : student,
      ),
    )
    setIssuedAt(now)
  }

  const finished = group.status === 'finished'
  const overdue = businessDaysLeft < 0

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <div className="mb-4">
          <SectionTitle icon="doc">{t('class_group.batch_title')}</SectionTitle>
        </div>

        {finished && (
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-sky-soft px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-ink">
              <BoIcon name="clock" size={16} />
              {t('class_group.deadline_title')}
            </span>
            <span className="text-sm text-ink">
              {t('class_group.deadline_value', {
                date: formatDate(deadlineIso, locale),
              })}
            </span>
            <StatusBadge
              tone={overdue ? 'danger' : businessDaysLeft <= 5 ? 'warning' : 'info'}
              label={
                overdue
                  ? t('class_group.deadline_overdue', { days: -businessDaysLeft })
                  : t('class_group.deadline_left', { days: businessDaysLeft })
              }
            />
            <span className="w-full text-xs text-muted-foreground">
              {t('class_group.deadline_rule')}
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-sm font-semibold text-ink">
            {t('class_group.batch_eligible', { count: eligible.length })}
          </span>
          {blocked.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {t('class_group.batch_blocked', { count: blocked.length })}
            </span>
          )}
        </div>

        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <BoIcon name="email" size={14} className="mt-0.5 shrink-0" />
          {t('class_group.batch_email_notice')}
        </p>
        {group.certificateRule === 'exam_required' && (
          <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
            <BoIcon name="alert" size={14} className="mt-0.5 shrink-0" />
            {t('class_group.batch_exam_notice')}
          </p>
        )}

        <div className="mt-4">
          {!finished ? (
            <p className="text-sm text-muted-foreground">
              {t('class_group.batch_not_finished')}
            </p>
          ) : eligible.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('class_group.batch_none')}
            </p>
          ) : (
            <button
              type="button"
              onClick={issueBatch}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-deep"
            >
              <BoIcon name="check" size={16} />
              {t('class_group.batch_issue', { count: eligible.length })}
            </button>
          )}
        </div>

        {issuedAt && (
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <BoIcon name="alert" size={14} className="mt-0.5 shrink-0" />
            {t('class_group.batch_done_local_only', {
              time: formatDateTime(issuedAt, locale),
            })}
          </p>
        )}
      </Card>

      <Card>
        <div className="border-b border-line px-5 py-4">
          <SectionTitle icon="students">
            {t('class_group.roster_title')}
          </SectionTitle>
        </div>

        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon="students"
              title={t('class_groups.empty_title')}
              body={t('class_groups.empty_body')}
            />
          </div>
        ) : (
          <TableShell>
            <thead>
              <tr>
                <th className={thClass}>{t('class_group.col_student')}</th>
                <th className={thClass}>{t('class_group.col_grade')}</th>
                {group.certificateRule === 'exam_required' && (
                  <th className={thClass}>{t('class_group.col_exam')}</th>
                )}
                <th className={thClass}>{t('class_group.col_certificate')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ student, reason }) => (
                <tr key={student.studentId} className="transition hover:bg-sky-soft">
                  <td className={tdClass}>
                    <Link
                      href={`/backoffice/students/${student.studentId}`}
                      className="font-semibold text-ink transition hover:text-brand-blue"
                    >
                      {student.fullName}
                    </Link>
                  </td>
                  <td className={tdClass}>
                    <span className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        tone={gradeTone[student.gradeStatus]}
                        label={t(`grade_status.${student.gradeStatus}`)}
                      />
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {student.finalGrade === null
                          ? t('class_group.no_grade')
                          : t('class_group.grade_value', {
                              grade: student.finalGrade,
                            })}
                      </span>
                    </span>
                  </td>
                  {group.certificateRule === 'exam_required' && (
                    <td className={tdClass}>
                      {student.certificationExam && (
                        <StatusBadge
                          tone={examTone[student.certificationExam]}
                          label={t(`exam_status.${student.certificationExam}`)}
                        />
                      )}
                    </td>
                  )}
                  <td className={tdClass}>
                    {student.certificateIssuedAt ? (
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {t('class_group.issued_at', {
                            date: formatDate(student.certificateIssuedAt, locale),
                          })}
                        </span>
                        {student.delivery && (
                          <StatusBadge
                            tone={deliveryTone[student.delivery.status]}
                            label={t(`delivery_status.${student.delivery.status}`)}
                          />
                        )}
                      </span>
                    ) : reason === null ? (
                      <StatusBadge
                        tone="info"
                        label={t('class_group.ready_to_issue')}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {t(`certificate_block.${reason}`, { min: PASSING_GRADE })}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>
    </div>
  )
}
