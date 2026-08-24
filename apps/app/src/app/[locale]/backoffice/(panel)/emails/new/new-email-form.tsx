'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { EnrollmentStatus } from '@/lib/backoffice/types'
import {
  MAX_TEST_RECIPIENTS,
  parseTestRecipients,
} from '@/lib/backoffice/email-proof'
import { Card, EmptyState, SectionTitle } from '@/components/backoffice/ui'
import { Toast } from '@/components/backoffice/controls'
import { BoIcon } from '@/components/backoffice/icons'

/** Which question the segment asks. The answer is resolved at send time. */
type SegmentKind = 'all' | 'course' | 'class_group' | 'enrollment_status'

const KINDS: SegmentKind[] = ['all', 'course', 'class_group', 'enrollment_status']

const STEPS = ['recipients', 'content', 'test', 'review'] as const
type Step = (typeof STEPS)[number]

const fieldClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted-foreground focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15'

const primaryButtonClass =
  'inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-yellow hover:text-ink active:bg-brand-yellow-deep disabled:cursor-not-allowed disabled:opacity-40'

const ghostButtonClass =
  'inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold text-muted-foreground transition hover:text-ink'

/**
 * The composer for a send written by hand. Four steps, in the order the
 * mistakes happen: who it reaches, what it says, a proof to a real inbox, and
 * only then the approval.
 *
 * Two rules are wired rather than written on a sign:
 *
 * - **The proof stops counting the moment the text changes.** Editing the
 *   subject or the message clears it, so nobody ever approves a message that
 *   was edited after being checked (`docs/ROADMAP.md` fase 5).
 * - **Everyone is not a segment somebody reaches alone.** A send to the whole
 *   register needs a second approval, and the button stays shut until that
 *   exists — an empty confirmation would be worse than no confirmation.
 *
 * Nothing is saved: this is the mockup, and the send ends in a queued state
 * because the outbox is what delivers, never this screen (CLAUDE.md §5).
 */
export function NewEmailForm({
  allCount,
  courses,
  classGroups,
  statuses,
}: {
  allCount: number
  courses: { name: string; count: number }[]
  classGroups: { id: string; label: string; count: number }[]
  statuses: { status: EnrollmentStatus; count: number }[]
}) {
  const t = useTranslations('bo')

  const [step, setStep] = useState<Step>('recipients')
  const [kind, setKind] = useState<SegmentKind>('course')
  const [courseName, setCourseName] = useState(courses[0]?.name ?? '')
  const [classGroupId, setClassGroupId] = useState(classGroups[0]?.id ?? '')
  const [status, setStatus] = useState<EnrollmentStatus>(
    statuses[0]?.status ?? 'active',
  )
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [proofTo, setProofTo] = useState('')
  /** Cleared by any edit to the text — that is the whole point of it. */
  const [proofSent, setProofSent] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [sent, setSent] = useState<number | null>(null)

  const recipients =
    kind === 'all'
      ? allCount
      : kind === 'course'
        ? (courses.find((item) => item.name === courseName)?.count ?? 0)
        : kind === 'class_group'
          ? (classGroups.find((item) => item.id === classGroupId)?.count ?? 0)
          : (statuses.find((item) => item.status === status)?.count ?? 0)

  const segmentLabel =
    kind === 'all'
      ? t('new_email.segment_all')
      : kind === 'course'
        ? courseName
        : kind === 'class_group'
          ? (classGroups.find((item) => item.id === classGroupId)?.label ?? '')
          : t(`enrollment_status.${status}`)

  /* A send to the whole register is the one nobody signs off alone. */
  const needsSecondApproval = kind === 'all'

  function editText(next: () => void) {
    next()
    setProofSent(false)
    setConfirmed(false)
    setError(null)
  }

  function go(next: Step) {
    setError(null)
    setStep(next)
  }

  function advance() {
    if (step === 'recipients') {
      if (recipients === 0) {
        setError(t('new_email.error_recipients'))
        return
      }
      go('content')
      return
    }
    if (step === 'content') {
      if (subject.trim().length === 0) {
        setError(t('new_email.error_subject'))
        return
      }
      if (body.trim().length === 0) {
        setError(t('new_email.error_body'))
        return
      }
      go('test')
      return
    }
    if (step === 'test') go('review')
  }

  function sendProof() {
    const parsed = parseTestRecipients(proofTo)
    if (!parsed.ok) {
      /* Written out rather than nested: the invalid case is the only one
         carrying the address that failed, and a ternary chain hides that. */
      if (parsed.reason === 'empty') setError(t('emails.test_error_empty'))
      else if (parsed.reason === 'max')
        setError(t('emails.test_error_max', { max: MAX_TEST_RECIPIENTS }))
      else setError(t('emails.test_error_invalid', { value: parsed.value }))
      return
    }
    setError(null)
    setProofTo('')
    setProofSent(true)
    setToast(t('emails.test_toast', { count: parsed.list.length }))
  }

  function send() {
    if (!proofSent) {
      setError(t('new_email.error_test'))
      return
    }
    if (!confirmed) {
      setError(t('new_email.error_confirm'))
      return
    }
    setError(null)
    setSent(recipients)
  }

  function reset() {
    setSent(null)
    setStep('recipients')
    setSubject('')
    setBody('')
    setProofSent(false)
    setConfirmed(false)
  }

  if (sent !== null) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          icon="check"
          title={t('new_email.sent_title')}
          body={t('new_email.sent_body', { count: sent })}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={reset} className={primaryButtonClass}>
            <BoIcon name="plus" size={16} />
            {t('new_email.sent_again')}
          </button>
          <Link href="/backoffice/emails" className={ghostButtonClass}>
            {t('new_email.back')}
          </Link>
        </div>
      </div>
    )
  }

  const index = STEPS.indexOf(step)

  return (
    <div className="flex flex-col gap-4">
      {/* The steps, and how far in you are. Behind is clickable — going back to
          re-read what you wrote must never cost the draft. */}
      <ol className="flex flex-wrap items-center gap-1.5">
        {STEPS.map((value, position) => {
          const active = value === step
          const done = position < index
          return (
            <li key={value} className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={!done && !active}
                onClick={() => go(value)}
                aria-current={active ? 'step' : undefined}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-brand-blue text-white'
                    : done
                      ? 'border border-line bg-white text-brand-blue hover:bg-cream'
                      : 'border border-line bg-white text-muted-foreground opacity-60'
                }`}
              >
                <span className={active ? 'text-white/70' : 'text-slate-400'}>
                  {position + 1}
                </span>
                {t(`new_email.step_${value}`)}
              </button>
              {position < STEPS.length - 1 && (
                <span aria-hidden="true" className="h-px w-3 bg-line" />
              )}
            </li>
          )
        })}
      </ol>

      <Card className="flex flex-col gap-4 p-5">
        {step === 'recipients' && (
          <>
            <SectionTitle icon="students">{t('new_email.segment_label')}</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {KINDS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setKind(value)
                    setError(null)
                  }}
                  aria-pressed={kind === value}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    kind === value
                      ? 'bg-brand-blue text-white'
                      : 'border border-line bg-white text-muted-foreground hover:bg-cream hover:text-ink'
                  }`}
                >
                  {t(`new_email.segment_${value === 'all' ? 'all' : value}`)}
                </button>
              ))}
            </div>

            {kind === 'course' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('new_email.pick_course')}
                </span>
                <select
                  value={courseName}
                  onChange={(event) => setCourseName(event.target.value)}
                  className={fieldClass}
                >
                  {courses.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {kind === 'class_group' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('new_email.pick_class_group')}
                </span>
                <select
                  value={classGroupId}
                  onChange={(event) => setClassGroupId(event.target.value)}
                  className={fieldClass}
                >
                  {classGroups.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {kind === 'enrollment_status' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('new_email.pick_status')}
                </span>
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as EnrollmentStatus)
                  }
                  className={fieldClass}
                >
                  {statuses.map((item) => (
                    <option key={item.status} value={item.status}>
                      {t(`enrollment_status.${item.status}`)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <p className="text-sm font-semibold text-ink">
              {t('new_email.recipients_count', { count: recipients })}
            </p>
            <p className="flex items-start gap-2 rounded-lg border border-dashed border-line bg-sky-soft px-3 py-2 text-xs text-muted-foreground">
              <BoIcon name="shield" size={14} className="mt-0.5 shrink-0" />
              {t('new_email.recipients_note')}
            </p>
          </>
        )}

        {step === 'content' && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('new_email.subject_label')}
              </span>
              <input
                type="text"
                value={subject}
                onChange={(event) => editText(() => setSubject(event.target.value))}
                placeholder={t('new_email.subject_placeholder')}
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('new_email.body_label')}
              </span>
              <textarea
                rows={9}
                value={body}
                onChange={(event) => editText(() => setBody(event.target.value))}
                placeholder={t('new_email.body_placeholder')}
                className={`${fieldClass} resize-y leading-relaxed`}
              />
            </label>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <BoIcon name="alert" size={14} className="mt-0.5 shrink-0" />
              {t('new_email.content_note')}
            </p>
          </>
        )}

        {step === 'test' && (
          <>
            <SectionTitle icon="email">{t('emails.test_title')}</SectionTitle>
            <p className="text-xs text-muted-foreground">
              {t('emails.test_hint', {
                max: MAX_TEST_RECIPIENTS,
                prefix: t('emails.test_prefix'),
              })}
            </p>
            <label className="flex flex-col gap-1.5">
              <span className="sr-only">{t('emails.test_label')}</span>
              <input
                type="text"
                value={proofTo}
                onChange={(event) => {
                  setProofTo(event.target.value)
                  setError(null)
                }}
                placeholder={t('emails.test_placeholder')}
                className={fieldClass}
              />
            </label>
            <button type="button" onClick={sendProof} className={primaryButtonClass}>
              <BoIcon name="email" size={16} />
              {t('emails.test_send')}
            </button>
            <p
              className={`flex items-start gap-2 text-xs font-medium ${
                proofSent ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              <BoIcon
                name={proofSent ? 'check' : 'clock'}
                size={14}
                className="mt-0.5 shrink-0"
              />
              {t(proofSent ? 'new_email.test_ok' : 'new_email.test_pending')}
            </p>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <BoIcon name="alert" size={14} className="mt-0.5 shrink-0" />
              {t('new_email.test_note')}
            </p>
            <p className="flex items-start gap-2 rounded-lg border border-dashed border-line bg-sky-soft px-3 py-2 text-xs text-muted-foreground">
              <BoIcon name="shield" size={14} className="mt-0.5 shrink-0" />
              {t('emails.test_guard')}
            </p>
          </>
        )}

        {step === 'review' && (
          <>
            <dl className="flex flex-col gap-3">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('new_email.review_recipients')}
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-ink">
                  {`${segmentLabel} · ${t('new_email.recipients_count', { count: recipients })}`}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('new_email.review_subject')}
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-ink">{subject}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('new_email.review_body')}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap rounded-lg border border-line bg-sky-soft px-3 py-2 text-sm leading-relaxed text-ink">
                  {body}
                </dd>
              </div>
            </dl>

            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => {
                  setConfirmed(event.target.checked)
                  setError(null)
                }}
                className="mt-0.5 size-4 accent-brand-blue"
              />
              {t('new_email.confirm_label')}
            </label>

            {needsSecondApproval && (
              <p className="flex items-start gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <BoIcon name="alert" size={14} className="mt-0.5 shrink-0" />
                {t('new_email.double_approval')}
              </p>
            )}

            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <BoIcon name="clock" size={14} className="mt-0.5 shrink-0" />
              {t('new_email.cooldown_note')}
            </p>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <BoIcon name="shield" size={14} className="mt-0.5 shrink-0" />
              {t('new_email.audit_note')}
            </p>
          </>
        )}

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
          {index > 0 && (
            <button
              type="button"
              onClick={() => go(STEPS[index - 1])}
              className={ghostButtonClass}
            >
              <BoIcon name="arrow-left" size={16} />
              {t('new_email.prev')}
            </button>
          )}
          {step === 'review' ? (
            <button
              type="button"
              onClick={send}
              disabled={needsSecondApproval}
              className={primaryButtonClass}
            >
              <BoIcon name="email" size={16} />
              {t('new_email.send')}
            </button>
          ) : (
            <button type="button" onClick={advance} className={primaryButtonClass}>
              {t('new_email.next')}
              <BoIcon name="chevron-right" size={16} />
            </button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {t('new_email.step_of', { step: index + 1, total: STEPS.length })}
          </span>
        </div>
      </Card>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
