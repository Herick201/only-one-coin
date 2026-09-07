'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { StaffMemberRow, StaffRole } from '@/lib/backoffice/types'
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

/** What the edit dialog is allowed to change on an account. */
export interface StaffEdit {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: StaffRole
}

/**
 * Cargos an account can be moved between. `teacher` is deliberately absent:
 * that cargo travels with the roster file it is scoped by (`teacherId`), so it
 * is opened and closed from Docentes, never here — and teacher rows never
 * reach this dialog to begin with. `master` is not listed either: it only
 * appears when the account's e-mail is on the owners' domain (`canHoldMaster`).
 */
const ROLES: StaffRole[] = [
  'admin',
  'analyst',
  'enrollment_supervisor',
  'academic_supervisor',
  'sales',
  'support',
  'billing',
]

const fieldClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted-foreground focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15'

const labelClass =
  'text-xs font-medium uppercase tracking-wide text-muted-foreground'

/**
 * Editing an account: name, e-mail, phone and cargo in one place. The cargo is
 * still the field the platform guards hardest (CLAUDE.md §8), which is why the
 * whole dialog sits behind a fresh re-authentication — this screen only
 * collects the password; the verification happens in `apps/api`, which is also
 * where the `role` column and the append-only audit entry are written in a
 * single transaction.
 */
export function EditStaffDialog({
  member,
  onClose,
  onConfirm,
}: {
  member: StaffMemberRow | null
  onClose: () => void
  onConfirm: (member: StaffMemberRow, edit: StaffEdit) => void
}) {
  const t = useTranslations('bo')

  return (
    <Dialog
      open={member !== null}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent
        closeLabel={t('team.change_close')}
        className="bg-white sm:max-w-2xl"
        aria-describedby={undefined}
      >
        {/* Keyed by the person: reopening on somebody else must start from
            their record, never inherit the last one's half-typed answers. */}
        {member && (
          <EditForm
            key={member.id}
            member={member}
            onClose={onClose}
            onConfirm={onConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function EditForm({
  member,
  onClose,
  onConfirm,
}: {
  member: StaffMemberRow
  onClose: () => void
  onConfirm: (member: StaffMemberRow, edit: StaffEdit) => void
}) {
  const t = useTranslations('bo')
  const [firstName, setFirstName] = useState(member.firstName)
  const [lastName, setLastName] = useState(member.lastName)
  const [email, setEmail] = useState(member.email)
  const [phone, setPhone] = useState(member.phone)
  const [role, setRole] = useState<StaffRole>(member.role)
  const [password, setPassword] = useState('')

  const dirty =
    firstName.trim() !== member.firstName ||
    lastName.trim() !== member.lastName ||
    email.trim() !== member.email ||
    phone.trim() !== member.phone ||
    role !== member.role

  /* Master is the owners' cargo: the option only exists while the e-mail is on
     their domain, and an e-mail edited off it takes the cargo with it. */
  const allowMaster = canHoldMaster(email)
  const roles: StaffRole[] =
    allowMaster || role === 'master' ? ['master', ...ROLES] : ROLES

  const ready =
    dirty &&
    firstName.trim() !== '' &&
    lastName.trim() !== '' &&
    email.trim() !== '' &&
    hasPhoneNumber(phone) &&
    (role !== 'master' || allowMaster) &&
    password.trim() !== ''

  return (
    <>
      <DialogHeader className="border-b border-line p-5 pr-14">
        <DialogTitle className="text-base font-semibold text-ink">
          {t('team.change_title')}
        </DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-4 p-5">
        <AutoGrid min="14rem" gap="gap-3">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>{t('team.field_first_name')}</span>
            <input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className={fieldClass}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={labelClass}>{t('team.field_last_name')}</span>
            <input
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className={fieldClass}
            />
          </label>
        </AutoGrid>

        <AutoGrid min="14rem" gap="gap-3">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>{t('team.field_email')}</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={fieldClass}
            />
          </label>

          <span className="flex flex-col gap-1">
            <span className={labelClass}>{t('team.field_phone')}</span>
            <PhoneField value={phone} onChange={setPhone} />
          </span>
        </AutoGrid>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>{t('team.field_role')}</span>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as StaffRole)}
            className={fieldClass}
          >
            {roles.map((item) => (
              <option key={item} value={item}>
                {t(`role.${item}`)}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1">
          {/* The hint sits outside the label on purpose: inside it, it
              becomes part of the field's accessible name and a screen
              reader announces the whole rule as the field's title. */}
          <label className="flex flex-col gap-1">
            <span className={labelClass}>{t('team.change_reauth')}</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className={fieldClass}
            />
          </label>
          <span className="text-xs text-muted-foreground">
            {t('team.change_reauth_hint')}
          </span>
        </div>
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
          onClick={() =>
            onConfirm(member, {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              email: email.trim(),
              phone: phone.trim(),
              role,
            })
          }
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-deep disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brand-blue"
        >
          <BoIcon name="check" size={16} />
          {t('team.change_confirm')}
        </button>
      </div>
    </>
  )
}
