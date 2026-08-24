'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { StaffMemberRow, StaffRole } from '@/lib/backoffice/types'
import { isMfaMandatory } from '@/lib/backoffice/permissions'
import { Card, RequiredMark } from '@/components/backoffice/ui'
import { BoIcon } from '@/components/backoffice/icons'
import { AutoGrid } from '@/components/layout/auto-grid'

/** A teacher still on the roster — who an account may be opened over. */
export interface TeacherOption {
  id: string
  firstName: string
  lastName: string
  email: string
}

const ROLES: StaffRole[] = [
  'admin',
  'coordinator',
  'treasury',
  'mass_approver',
  'teacher',
]

const fieldClass =
  'rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted-foreground focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15'

const labelClass =
  'text-xs font-medium uppercase tracking-wide text-muted-foreground'

/**
 * Opening a panel account: who the person is, and which cargo they come in
 * with. Two blocks, because those are the two questions — and the second one is
 * the whole reason this form is admin-only (CLAUDE.md §8).
 *
 * No password field, by design. The account is opened here and the credentials
 * leave by e-mail, the same way a student's do: a panel that shows somebody
 * else's password is a panel that has it. The second factor is not set here
 * either — the owner enrolls their own, on first sign-in.
 *
 * A `teacher` account is opened over a teacher who is already on the roster,
 * the same shape as a manual enrollment acting only on a student who already
 * exists (CLAUDE.md §1): the record carries what the account is scoped by, so
 * it has to exist before the door does.
 *
 * Screen-local, like every other form in the mockup: the real write is a
 * usecase in `apps/api`, never the browser.
 */
export function NewStaffForm({
  teachers,
  onCancel,
  onCreate,
}: {
  teachers: TeacherOption[]
  onCancel: () => void
  onCreate: (member: StaffMemberRow) => void
}) {
  const t = useTranslations('bo')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<StaffRole>('coordinator')
  const [teacherId, setTeacherId] = useState('')

  const isTeacher = role === 'teacher'

  const ready =
    firstName.trim() !== '' &&
    lastName.trim() !== '' &&
    email.trim() !== '' &&
    (!isTeacher || teacherId !== '')

  /* Picking the teacher fills the person in: the roster already answered who
     they are and where to write to them, and retyping it is how two records of
     one person start disagreeing. */
  function selectTeacher(id: string) {
    setTeacherId(id)
    const teacher = teachers.find((item) => item.id === id)
    if (!teacher) return
    setFirstName(teacher.firstName)
    setLastName(teacher.lastName)
    setEmail(teacher.email)
  }

  function selectRole(next: StaffRole) {
    setRole(next)
    if (next !== 'teacher') setTeacherId('')
  }

  function submit() {
    if (!ready) return
    onCreate({
      id: `staff_local_${email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      role,
      status: 'active',
      teacherId: isTeacher ? teacherId : null,
      // Nobody enrolls somebody else's second factor: the account starts
      // without one and the owner sets it up on first sign-in.
      mfaEnrolled: false,
      joinedAt: new Date().toISOString().slice(0, 10),
      lastAccessAt: null,
    })
  }

  return (
    <Card className="p-5">
      <p className="mb-1 text-sm font-semibold text-ink">{t('team.new_title')}</p>
      <p className="mb-4 text-xs text-muted-foreground">{t('team.new_subtitle')}</p>

      {/* Access first: the cargo decides whether the rest of the form is typed
          or picked from the roster. */}
      <Block title={t('team.section_access')} hint={t('team.role_hint')}>
        {/* Capped: one or two selects stretched across a wide panel read as a
            form with a field missing. */}
        <AutoGrid min="15rem" gap="gap-3" className="max-w-3xl">
          <Labelled label={t('team.field_role')} required>
            <select
              value={role}
              onChange={(event) => selectRole(event.target.value as StaffRole)}
              className={fieldClass}
            >
              {ROLES.map((item) => (
                <option key={item} value={item}>
                  {t(`role.${item}`)}
                </option>
              ))}
            </select>
          </Labelled>

          {isTeacher && (
            <Labelled label={t('team.field_teacher')} required>
              <select
                value={teacherId}
                onChange={(event) => selectTeacher(event.target.value)}
                className={fieldClass}
              >
                <option value="">{t('team.teacher_select')}</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {`${teacher.firstName} ${teacher.lastName}`}
                  </option>
                ))}
              </select>
            </Labelled>
          )}
        </AutoGrid>

        {isTeacher && (
          <p className="mt-3 text-xs text-muted-foreground">{t('team.teacher_hint')}</p>
        )}

        {isMfaMandatory(role) && (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-dashed border-line bg-sky-soft px-3 py-2 text-xs text-muted-foreground">
            <BoIcon name="shield" size={14} className="mt-0.5 shrink-0" />
            {t('team.mfa_note')}
          </p>
        )}
      </Block>

      <Block title={t('team.section_person')}>
        <AutoGrid min="15rem" gap="gap-3">
          <Labelled label={t('team.field_first_name')} required>
            <input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              disabled={isTeacher}
              className={`${fieldClass} disabled:bg-slate-50 disabled:text-muted-foreground`}
            />
          </Labelled>

          <Labelled label={t('team.field_last_name')} required>
            <input
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              disabled={isTeacher}
              className={`${fieldClass} disabled:bg-slate-50 disabled:text-muted-foreground`}
            />
          </Labelled>

          <Labelled label={t('team.field_email')} required>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isTeacher}
              className={`${fieldClass} disabled:bg-slate-50 disabled:text-muted-foreground`}
            />
          </Labelled>
        </AutoGrid>

        <p className="mt-3 text-xs text-muted-foreground">
          {t('team.credentials_note')}
        </p>
      </Block>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <button
          type="button"
          disabled={!ready}
          onClick={submit}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-deep disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brand-blue"
        >
          <BoIcon name="check" size={16} />
          {t('team.create')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-muted-foreground transition hover:text-ink"
        >
          {t('team.cancel')}
        </button>
        {/* A button that greys out without saying why reads as broken. */}
        {!ready && (
          <span className="text-xs text-muted-foreground">
            {t('team.missing_fields')}
          </span>
        )}
      </div>
    </Card>
  )
}

/** One question per block, with a rule above it — that is the whole layout. */
function Block({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-5 border-t border-line pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Labelled({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  const t = useTranslations('bo')
  return (
    <label className="flex flex-col gap-1">
      <span className={labelClass}>
        {label}
        {required && <RequiredMark label={t('common.required')} />}
      </span>
      {children}
    </label>
  )
}
