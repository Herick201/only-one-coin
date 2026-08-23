'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { StaffMemberRow, StaffRole } from '@/lib/backoffice/types'
import { requiresMfa } from '@/lib/backoffice/permissions'
import { BoIcon } from '@/components/backoffice/icons'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * Cargos a change can move an account between. `teacher` is deliberately absent
 * from both ends: that cargo travels with the roster file it is scoped by
 * (`teacherId`), so it is opened and closed from Docentes, never here.
 */
const ROLES: StaffRole[] = ['admin', 'coordinator', 'treasury', 'mass_approver']

const fieldClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted-foreground focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15'

const labelClass =
  'text-xs font-medium uppercase tracking-wide text-muted-foreground'

/**
 * Changing a cargo — the one action the whole section exists for, and the one
 * the platform guards hardest (CLAUDE.md §8).
 *
 * The password field is not decoration: the promotion usecase demands a fresh
 * re-authentication of the admin doing it, so an open session left on an
 * unlocked screen cannot hand out administración. This screen only collects it
 * — the verification happens in `apps/api`, which is also where the `role`
 * column and the append-only audit entry are written in a single transaction.
 */
export function RoleChangeDialog({
  member,
  onClose,
  onConfirm,
}: {
  member: StaffMemberRow | null
  onClose: () => void
  onConfirm: (member: StaffMemberRow, role: StaffRole) => void
}) {
  const t = useTranslations('bo')
  const [role, setRole] = useState<StaffRole>('coordinator')
  const [password, setPassword] = useState('')

  /* Reopening the dialog on a different person must not inherit the last one's
     answers — least of all the password. */
  useEffect(() => {
    if (!member) return
    setRole(ROLES.find((item) => item !== member.role) ?? 'coordinator')
    setPassword('')
  }, [member])

  const ready = member !== null && role !== member.role && password.trim() !== ''

  return (
    <Dialog
      open={member !== null}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent closeLabel={t('team.change_close')} className="bg-white">
        {member && (
          <>
            <DialogHeader className="gap-2 border-b border-line p-5 pr-14">
              <DialogTitle className="text-base font-semibold text-ink">
                {t('team.change_title')}
              </DialogTitle>
              <DialogDescription>
                {t('team.change_subtitle', {
                  name: `${member.firstName} ${member.lastName}`,
                })}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 p-5">
              <div className="flex flex-col gap-1">
                <span className={labelClass}>{t('team.change_current')}</span>
                <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {t(`role.${member.role}`)}
                </span>
              </div>

              <label className="flex flex-col gap-1">
                <span className={labelClass}>{t('team.change_new')}</span>
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as StaffRole)}
                  className={fieldClass}
                >
                  {ROLES.filter((item) => item !== member.role).map((item) => (
                    <option key={item} value={item}>
                      {t(`role.${item}`)}
                    </option>
                  ))}
                </select>
              </label>

              {/* Moving somebody onto a cargo that demands a second factor is
                  worth saying out loud: the account does not have one yet. */}
              {requiresMfa(role) && !member.mfaEnrolled && (
                <p className="flex items-start gap-2 rounded-lg border border-dashed border-line bg-sky-soft px-3 py-2 text-xs text-muted-foreground">
                  <BoIcon name="shield" size={14} className="mt-0.5 shrink-0" />
                  {t('team.mfa_note')}
                </p>
              )}

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
                onClick={() => onConfirm(member, role)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-deep disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brand-blue"
              >
                <BoIcon name="check" size={16} />
                {t('team.change_confirm')}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
