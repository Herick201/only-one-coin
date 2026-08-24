import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getStaffSession, listEmailFlows } from '@/lib/backoffice/mock-data'
import { canManageEmail } from '@/lib/backoffice/permissions'
import { buildEmailJourney } from '@/lib/backoffice/email-journey'
import { Card, MockNotice, PageHeader, StatusBadge } from '@/components/backoffice/ui'
import { SectionTabs } from '@/components/backoffice/section-tabs'
import { BoIcon } from '@/components/backoffice/icons'
import { AutoGrid } from '@/components/layout/auto-grid'

/**
 * The whole journey, in the order the student lives it: what arrives when the
 * form is submitted, what arrives while the money is being settled, what lets
 * them in, and what closes the course.
 *
 * The catalog answers "which e-mails exist"; this answers the question nobody
 * can answer from a table — *when* each one fires, which of them are branches
 * the case may never take, and where a paused flow leaves a silence in the
 * middle of somebody's enrollment.
 *
 * A static route, so it wins over `[template]` — and the template ids are a
 * closed union with nothing named `journey` in it (CLAUDE.md §4).
 */
export default async function EmailJourneyPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('bo')

  const staff = getStaffSession()
  if (!canManageEmail(staff.role)) notFound()

  const journey = buildEmailJourney(listEmailFlows())

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('emails.journey_title')}
        /* The section's action stays put across its tabs — a button that
           appears and disappears as you switch reads as two different pages. */
        actions={
          <Link
            href="/backoffice/emails/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-deep"
          >
            <BoIcon name="plus" size={16} />
            {t('emails.new')}
          </Link>
        }
      />
      <SectionTabs
        tabs={[
          { href: '/backoffice/emails', label: t('emails.tab_catalog'), exact: true },
          { href: '/backoffice/emails/journey', label: t('emails.tab_journey') },
        ]}
      />
      <MockNotice label={t('common.mock_notice')} />

      <ol className="flex flex-col">
        {journey.map((step, index) => {
          const last = index === journey.length - 1
          return (
            <li key={step.stage} className="relative flex gap-4 pb-7 last:pb-0">
              {/* The rail. It stops at the last marker: a line running past the
                  end reads as a stage somebody forgot to fill in. */}
              {!last && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-4 top-9 w-px -translate-x-1/2 bg-line"
                />
              )}
              <span className="relative grid size-8 shrink-0 place-items-center rounded-full border border-line bg-white text-sm font-semibold text-brand-blue">
                {index + 1}
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-ink">
                    {t(`email_stage.${step.stage}.name`)}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t(`email_stage.${step.stage}.detail`)}
                  </p>
                </div>

                {step.flows.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line bg-sky-soft px-3 py-2 text-xs text-muted-foreground">
                    {t('emails.journey_empty')}
                  </p>
                ) : (
                  <AutoGrid min="17rem" gap="gap-3">
                    {step.flows.map((flow) => (
                      <Card key={flow.template} as="article" className="flex flex-col gap-2 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/backoffice/emails/${flow.template}`}
                            className="text-sm font-semibold text-ink transition hover:text-brand-blue"
                          >
                            {t(`email_template.${flow.template}`)}
                          </Link>
                          {!flow.enabled && (
                            <StatusBadge
                              tone="warning"
                              label={t('emails.state_off')}
                            />
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {t(`email_trigger.${flow.template}`)}
                        </p>

                        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                          {/* The recipient is only worth saying when it is not
                              the student — every other card would carry the
                              same word. */}
                          {flow.audience === 'guardian' && (
                            <span className="rounded-full bg-sky px-2 py-0.5 text-[11px] font-semibold text-brand-blue-deep">
                              {t('email_audience.guardian')}
                            </span>
                          )}
                          {flow.conditional && (
                            <span
                              title={t('emails.conditional_hint')}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
                            >
                              {t('emails.conditional')}
                            </span>
                          )}
                        </div>

                        {!flow.enabled && (
                          <p className="flex items-start gap-1.5 text-xs font-medium text-amber-700">
                            <BoIcon name="alert" size={13} className="mt-0.5 shrink-0" />
                            {t('emails.journey_paused')}
                          </p>
                        )}
                      </Card>
                    ))}
                  </AutoGrid>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <BoIcon name="guardian" size={14} className="mt-0.5 shrink-0" />
        {t('emails.journey_note')}
      </p>
    </div>
  )
}
