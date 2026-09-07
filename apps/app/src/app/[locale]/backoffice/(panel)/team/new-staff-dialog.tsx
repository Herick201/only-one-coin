'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { StaffMemberRow, StaffRole } from '@/lib/backoffice/types'
import { RequiredMark } from '@/components/backoffice/ui'
import { BoIcon } from '@/components/backoffice/icons'
import { AutoGrid } from '@/components/layout/auto-grid'
import { PhoneField, hasPhoneNumber } from '@/components/backoffice/phone-field'
import { canHoldMaster } from '@/lib/backoffice/permissions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/** A teacher still on the roster — who an account may be opened over. */
export interface TeacherOption {
  id: string
  firstName: string
  lastName: string
  email: string
}

/** `master` is not listed: it only appears for the owners' e-mail domain. */
const ROLES: StaffRole[] = [
  'admin',
  'analyst',
  'enrollment_supervisor',
  'academic_supervisor',
  'teacher',
  'sales',
  'support',
  'billing',
]

const fieldClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted-foreground focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15'

const labelClass =
  'text-xs font-medium uppercase tracking-wide text-muted-foreground'

/**
 * Opening a panel account, in its own dialog: who the person is, and which
 * cargo they come in with — the cargo being the whole reason this is
 * admin-only (CLAUDE.md §8).
 *
 * No password field, by design. The account is opened here and the credentials
 * leave by e-mail, the same way a student's do: a panel that shows somebody
 * else's password is a panel that has it.
 *
 * A `teacher` account is opened over a teacher who is already on the roster,
 * the same shape as a manual enrollment acting only on a student who already
 * exists (CLAUDE.md §1): the record carries what the account is scoped by, so
 * it has to exist before the door does.
 *
 * Screen-local, like every other form in the mockup: the real write is a
 * usecase in `apps/api`, never the browser.
 */
export function NewStaffDialog({
  open,
  teachers,
  onClose,
  onCreate,
}: {
  open: boolean
  teachers: TeacherOption[]
  onClose: () => void
  onCreate: (member: StaffMemberRow) => void
}) {
  const t = useTranslations('bo')

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent
        closeLabel={t('team.change_close')}
        className="bg-white sm:max-w-2xl"
        aria-describedby={undefined}
      >
        {/* Mounted per open: closing throws the half-typed answers away. */}
        {open && (
          <NewStaffFields teachers={teachers} onClose={onClose} onCreate={onCreate} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function NewStaffFields({
  teachers,
  onClose,
  onCreate,
}: {
  teachers: TeacherOption[]
  onClose: () => void
  onCreate: (member: StaffMemberRow) => void
}) {
  const t = useTranslations('bo')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<StaffRole>('enrollment_supervisor')
  const [teacherId, setTeacherId] = useState('')

  const isTeacher = role === 'teacher'

  /* Master is the owners' cargo: the option only exists while the e-mail is on
     their domain, and an e-mail edited off it takes the cargo with it. */
  const allowMaster = canHoldMaster(email)
  const roles: StaffRole[] =
    allowMaster || role === 'master' ? ['master', ...ROLES] : ROLES

  const ready =
    firstName.trim() !== '' &&
    lastName.trim() !== '' &&
    email.trim() !== '' &&
    hasPhoneNumber(phone) &&
    (role !== 'master' || allowMaster) &&
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
      phone: phone.trim(),
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
    <>
      <DialogHeader className="border-b border-line p-5 pr-14">
        <DialogTitle className="text-base font-semibold text-ink">
          {t('team.new_title')}
        </DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-4 p-5">
        <AutoGrid min="14rem" gap="gap-3">
          <Labelled label={t('team.field_role')} required>
            <select
              value={role}
              onChange={(event) => selectRole(event.target.value as StaffRole)}
              className={fieldClass}
            >
              {roles.map((item) => (
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
          <p className="text-xs text-muted-foreground">{t('team.teacher_hint')}</p>
        )}

        <AutoGrid min="14rem" gap="gap-3">
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
        </AutoGrid>

        <AutoGrid min="14rem" gap="gap-3">
          <Labelled label={t('team.field_email')} required>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isTeacher}
              className={`${fieldClass} disabled:bg-slate-50 disabled:text-muted-foreground`}
            />
          </Labelled>

          <Labelled label={t('team.field_phone')} required>
            <PhoneField value={phone} onChange={setPhone} />
          </Labelled>
        </AutoGrid>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line p-5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-muted-foreground transition hover:text-ink"
        >
          {t('team.cancel')}
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={submit}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-deep disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brand-blue"
        >
          <BoIcon name="check" size={16} />
          {t('team.create')}
        </button>
      </div>
    </>
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
