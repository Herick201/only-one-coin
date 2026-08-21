'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import type {
  CheckoutDraft,
  GuardianRelationship,
  NationalIdType,
  PublicCatalog,
} from '@/lib/enrollment/types'
import {
  courseById,
  hasErrors,
  isMinor,
  validateGuardian,
  validateStudent,
} from '@/lib/enrollment/checkout'
import {
  Card,
  FieldGroup,
  GhostButton,
  Note,
  PrimaryButton,
  SelectInput,
  StepHeading,
  TextInput,
} from '@/components/enrollment/ui'
import { CheckoutIcon } from '@/components/enrollment/icons'
import { AutoGrid, fullRowClass } from '@/components/layout/auto-grid'

const ID_TYPES: NationalIdType[] = ['DNI', 'CE', 'passport']
const RELATIONSHIPS: GuardianRelationship[] = ['mother', 'father', 'legal_guardian']

/**
 * Step 2 — who is going to study.
 *
 * The student half mirrors the columns the Asociación already collects
 * (`docs/MATRICULA-CHECKOUT.md` §2): one full-name field, document, mobile,
 * birth date, Gmail address.
 *
 * Three things this screen is opinionated about.
 *
 * **The address must be a personal Gmail.** Not advice — a gate. Class access
 * arrives through Google Classroom, and the current form refuses institutional
 * and corporate addresses in capitals. A colegio address that stops working in
 * December is a student who loses the course they paid for.
 *
 * **A minor is the normal case.** Much of the public is under 18
 * (`CLAUDE.md` §1), so the guardian block is not an edge case bolted on — it
 * opens from the birth date and carries the consent record Ley 29733 asks for
 * (`CLAUDE.md` §8). The version, instant and IP are stamped server-side at
 * submit; the browser only records that the box was ticked.
 *
 * **Minimum age is a wall, not a warning.** A course with a floor of 13 does
 * not take a ten-year-old and sort it out in review.
 *
 * Validation runs here AND again in `apps/api`. This half is courtesy — the
 * half that counts is the one the browser cannot skip.
 */
export function StepStudent({
  catalog,
  draft,
  setDraft,
  onBack,
  onContinue,
}: {
  catalog: PublicCatalog
  draft: CheckoutDraft
  setDraft: (next: (prev: CheckoutDraft) => CheckoutDraft) => void
  onBack: () => void
  onContinue: () => void
}) {
  const t = useTranslations('enrollment')
  const [touched, setTouched] = useState(false)

  const course = courseById(catalog, draft.course.courseId)
  const minor = isMinor(draft.student.birthDate)

  const studentErrors = useMemo(
    () => validateStudent(draft.student, course),
    [draft.student, course],
  )
  const guardianErrors = useMemo(
    () => (minor ? validateGuardian(draft.guardian) : {}),
    [minor, draft.guardian],
  )

  const ready = !hasErrors(studentErrors) && !hasErrors(guardianErrors)
  /** Errors stay quiet until the reader tries to move on — nobody wants to be
      told their name is invalid after typing one letter of it. */
  const show = touched

  function patchStudent(patch: Partial<CheckoutDraft['student']>) {
    setDraft((prev) => ({ ...prev, student: { ...prev.student, ...patch } }))
  }

  function patchGuardian(patch: Partial<CheckoutDraft['guardian']>) {
    setDraft((prev) => ({ ...prev, guardian: { ...prev.guardian, ...patch } }))
  }

  function submit() {
    setTouched(true)
    if (ready) onContinue()
  }

  const err = (key: string | undefined) => (show && key ? t(`error.${key}`) : undefined)

  return (
    <div className="flex flex-col gap-5">
      <StepHeading
        eyebrow={t('step.student.eyebrow')}
        title={t('step.student.title')}
        subtitle={t('step.student.subtitle')}
      />

      <Card className="p-5">
        <AutoGrid min="15rem" gap="gap-4">
          {/* One field, as the current form asks. Full width: a name with two
              surnames does not fit a half column, and it is the one value that
              gets printed on a certificate exactly as typed. */}
          <div className={fullRowClass}>
            <FieldGroup
              label={t('field.full_name')}
              htmlFor="full-name"
              error={err(studentErrors.fullName)}
              hint={t('step.student.full_name_hint')}
            >
              <TextInput
                id="full-name"
                autoComplete="name"
                value={draft.student.fullName}
                invalid={Boolean(err(studentErrors.fullName))}
                onChange={(e) => patchStudent({ fullName: e.target.value })}
              />
            </FieldGroup>
          </div>

          <FieldGroup label={t('field.national_id_type')} htmlFor="id-type">
            <SelectInput
              id="id-type"
              value={draft.student.nationalIdType}
              onChange={(e) =>
                patchStudent({ nationalIdType: e.target.value as NationalIdType })
              }
            >
              {ID_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`national_id_type.${type}`)}
                </option>
              ))}
            </SelectInput>
          </FieldGroup>

          <FieldGroup
            label={t('field.national_id')}
            htmlFor="national-id"
            error={err(studentErrors.nationalId)}
          >
            <TextInput
              id="national-id"
              inputMode="numeric"
              value={draft.student.nationalId}
              invalid={Boolean(err(studentErrors.nationalId))}
              onChange={(e) => patchStudent({ nationalId: e.target.value })}
            />
          </FieldGroup>

          <FieldGroup
            label={t('field.phone')}
            htmlFor="phone"
            error={err(studentErrors.phone)}
            hint={t('step.student.phone_hint')}
          >
            <TextInput
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={draft.student.phone}
              invalid={Boolean(err(studentErrors.phone))}
              onChange={(e) => patchStudent({ phone: e.target.value })}
            />
          </FieldGroup>

          <FieldGroup
            label={t('field.birth_date')}
            htmlFor="birth-date"
            error={err(studentErrors.birthDate) ?? err(studentErrors.minAge)}
            hint={
              course ? t('step.student.min_age_hint', { age: course.minAge }) : undefined
            }
          >
            <TextInput
              id="birth-date"
              type="date"
              value={draft.student.birthDate}
              invalid={Boolean(
                err(studentErrors.birthDate) ?? err(studentErrors.minAge),
              )}
              onChange={(e) => patchStudent({ birthDate: e.target.value })}
            />
          </FieldGroup>

          <FieldGroup
            label={t('field.email')}
            htmlFor="email"
            error={err(studentErrors.email)}
            hint={t('step.student.email_hint')}
          >
            <TextInput
              id="email"
              type="email"
              autoComplete="email"
              value={draft.student.email}
              invalid={Boolean(err(studentErrors.email))}
              onChange={(e) => patchStudent({ email: e.target.value })}
            />
          </FieldGroup>
        </AutoGrid>
      </Card>

      {minor && (
        <Card className="p-5">
          <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
            <CheckoutIcon name="user" size={16} className="text-brand-blue" />
            {t('step.student.guardian_title')}
          </p>
          <p className="mb-4 text-xs text-muted-foreground">
            {t('step.student.guardian_subtitle')}
          </p>

          <AutoGrid min="15rem" gap="gap-4">
            <div className={fullRowClass}>
              <FieldGroup
                label={t('field.full_name')}
                htmlFor="guardian-full-name"
                error={err(guardianErrors.fullName)}
              >
                <TextInput
                  id="guardian-full-name"
                  value={draft.guardian.fullName}
                  invalid={Boolean(err(guardianErrors.fullName))}
                  onChange={(e) => patchGuardian({ fullName: e.target.value })}
                />
              </FieldGroup>
            </div>

            <FieldGroup label={t('field.relationship')} htmlFor="relationship">
              <SelectInput
                id="relationship"
                value={draft.guardian.relationship}
                onChange={(e) =>
                  patchGuardian({
                    relationship: e.target.value as GuardianRelationship,
                  })
                }
              >
                {RELATIONSHIPS.map((value) => (
                  <option key={value} value={value}>
                    {t(`relationship.${value}`)}
                  </option>
                ))}
              </SelectInput>
            </FieldGroup>

            <FieldGroup label={t('field.national_id_type')} htmlFor="guardian-id-type">
              <SelectInput
                id="guardian-id-type"
                value={draft.guardian.nationalIdType}
                onChange={(e) =>
                  patchGuardian({ nationalIdType: e.target.value as NationalIdType })
                }
              >
                {ID_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`national_id_type.${type}`)}
                  </option>
                ))}
              </SelectInput>
            </FieldGroup>

            <FieldGroup
              label={t('field.national_id')}
              htmlFor="guardian-national-id"
              error={err(guardianErrors.nationalId)}
            >
              <TextInput
                id="guardian-national-id"
                inputMode="numeric"
                value={draft.guardian.nationalId}
                invalid={Boolean(err(guardianErrors.nationalId))}
                onChange={(e) => patchGuardian({ nationalId: e.target.value })}
              />
            </FieldGroup>

            <FieldGroup
              label={t('field.phone')}
              htmlFor="guardian-phone"
              error={err(guardianErrors.phone)}
            >
              <TextInput
                id="guardian-phone"
                type="tel"
                inputMode="tel"
                value={draft.guardian.phone}
                invalid={Boolean(err(guardianErrors.phone))}
                onChange={(e) => patchGuardian({ phone: e.target.value })}
              />
            </FieldGroup>

            {/* No Gmail rule on this one: Classroom belongs to the student.
                This address is where the Asociación reaches a responsible
                adult, and forcing a provider on it only loses that contact. */}
            <FieldGroup
              label={t('field.email')}
              htmlFor="guardian-email"
              error={err(guardianErrors.email)}
              hint={t('step.student.guardian_email_hint')}
            >
              <TextInput
                id="guardian-email"
                type="email"
                value={draft.guardian.email}
                invalid={Boolean(err(guardianErrors.email))}
                onChange={(e) => patchGuardian({ email: e.target.value })}
              />
            </FieldGroup>

            <div className={fullRowClass}>
              <label className="flex items-start gap-3 rounded-xl border border-line bg-sky-soft p-4">
                <input
                  type="checkbox"
                  checked={draft.guardian.consentAccepted}
                  onChange={(e) =>
                    patchGuardian({ consentAccepted: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-brand-blue focus:ring-brand-blue"
                />
                <span className="min-w-0 text-sm text-ink">
                  {t('step.student.consent_label')}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {t('step.student.consent_version', {
                      version: catalog.settings.consentVersion,
                    })}
                  </span>
                </span>
              </label>
              {err(guardianErrors.consentAccepted) && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600">
                  <CheckoutIcon name="alert" size={14} />
                  {err(guardianErrors.consentAccepted)}
                </p>
              )}
            </div>
          </AutoGrid>
        </Card>
      )}

      {show && !ready && <Note tone="danger">{t('error.fix_fields')}</Note>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <GhostButton onClick={onBack}>
          <CheckoutIcon name="arrow-left" size={16} />
          {t('action.back')}
        </GhostButton>
        <PrimaryButton onClick={submit}>
          {t('action.continue')}
          <CheckoutIcon name="arrow-right" size={16} />
        </PrimaryButton>
      </div>
    </div>
  )
}
