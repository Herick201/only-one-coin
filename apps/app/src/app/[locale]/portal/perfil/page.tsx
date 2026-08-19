import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getPortalSession } from '@/lib/portal/mock-data'
import { formatDate } from '@/lib/portal/format'
import type { Locale } from '@/lib/portal/types'
import { Card, Field, PageHeader, SectionTitle } from '@/components/portal/ui'
import { Icon } from '@/components/portal/icons'

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = raw as Locale
  setRequestLocale(raw)
  const t = await getTranslations('portal')

  const { student } = getPortalSession()
  const { guardian } = student

  return (
    <div>
      <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal details */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <SectionTitle>{t('profile.personal_title')}</SectionTitle>
            {student.isMinor && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-yellow/15 px-2.5 py-1 text-xs font-semibold text-brand-yellow-deep ring-1 ring-inset ring-brand-yellow-deep/20">
                <Icon name="shield" size={14} />
                {t('profile.minor_badge')}
              </span>
            )}
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('profile.full_name')}>
              {student.firstName} {student.lastName}
            </Field>
            <Field label={t('profile.id_label')}>
              {student.nationalIdType} {student.nationalId}
            </Field>
            <Field label={t('profile.email_label')}>{student.email}</Field>
            <Field label={t('profile.phone_label')}>{student.phone}</Field>
            <Field label={t('profile.birth_date_label')}>
              {formatDate(student.birthDate, locale)}
            </Field>
          </dl>
        </Card>

        {/* Guardian */}
        <Card className="p-5 sm:p-6">
          <SectionTitle>{t('profile.guardian_title')}</SectionTitle>
          {guardian ? (
            <>
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t('profile.full_name')}>
                  {guardian.firstName} {guardian.lastName}
                </Field>
                <Field label={t('profile.relationship_label')}>
                  {t(`relationship.${guardian.relationship}`)}
                </Field>
                <Field label={t('profile.id_label')}>
                  {guardian.nationalIdType} {guardian.nationalId}
                </Field>
                <Field label={t('profile.email_label')}>{guardian.email}</Field>
                <Field label={t('profile.phone_label')}>{guardian.phone}</Field>
              </dl>

              <div className="mt-5 rounded-xl bg-sky-soft p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <span className="text-brand-blue">
                    <Icon name="shield" size={18} />
                  </span>
                  {t('profile.consent_title')}
                </div>
                {guardian.consent ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {t('profile.consent_accepted', {
                      date: formatDate(guardian.consent.acceptedAt, locale),
                    })}{' '}
                    ·{' '}
                    {t('profile.consent_version', {
                      version: guardian.consent.version,
                    })}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {t('profile.consent_none')}
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">{t('profile.guardian_none')}</p>
          )}
        </Card>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        {t('profile.edit_note')}
      </p>
    </div>
  )
}
