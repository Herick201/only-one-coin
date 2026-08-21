import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getPublicCatalog } from '@/lib/enrollment/mock-data'
import {
  emptyDraft,
  resolveCampaign,
  resolvePrefill,
  resolveSource,
  QUERY_KEYS,
} from '@/lib/enrollment/checkout'
import { Checkout } from './checkout'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'enrollment' })
  return {
    title: t('meta.title'),
    description: t('meta.description'),
  }
}

/**
 * `/enrollment` — the public front door of the funnel.
 *
 * Arrival is resolved here, on the server, once: the channel that brought the
 * visitor, the campaign tags, and whatever the seller's link preselected. The
 * client wizard receives a draft and never parses a URL itself — a value that
 * ends up on an enrollment row should be decided in one place, and validated
 * against the catalog rather than trusted (`CLAUDE.md` §5).
 *
 * The query string is prefill and attribution, never a token (`CLAUDE.md` §2):
 * no secret, no session, no price. Opening somebody else's link gets you an
 * empty form with a course preselected.
 */
export default async function EnrollmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const raw = await searchParams
  // A repeated key arrives as an array; the first value is the answer, and the
  // rest is somebody testing what the parser does.
  const query: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(raw)) {
    query[key] = Array.isArray(value) ? value[0] : value
  }

  const catalog = getPublicCatalog()
  const draft = {
    ...emptyDraft(resolveSource(query[QUERY_KEYS.source])),
    course: resolvePrefill(catalog, query),
    campaign: resolveCampaign(query),
  }

  return <Checkout catalog={catalog} initialDraft={draft} />
}
