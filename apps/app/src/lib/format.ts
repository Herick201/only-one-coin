/**
 * Locale-aware formatters shared by portal and backoffice.
 *
 * Money is PEN from integer cents (never float — CLAUDE.md §5). Dates are
 * stored UTC and rendered in America/Lima (CLAUDE.md §6). These emit
 * numbers/dates only — never UI words, which stay in the locale files.
 */

export type Locale = 'es' | 'en' | 'pt'

const intlLocale: Record<Locale, string> = {
  es: 'es-PE',
  en: 'en-US',
  pt: 'pt-BR',
}

const LIMA_TZ = 'America/Lima'

export function formatMoney(
  amountCents: number,
  currency: string,
  locale: Locale,
): string {
  return new Intl.NumberFormat(intlLocale[locale], {
    style: 'currency',
    currency,
  }).format(amountCents / 100)
}

/** `2026-04-07` — a calendar date with no time, so no timezone to convert. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * A date-only value (birth date, course start/end) is rendered as written: it
 * is a calendar date, not an instant. Shifting it into America/Lima would parse
 * it as UTC midnight and print the previous day. Timestamps keep the Lima
 * conversion (CLAUDE.md §6).
 */
export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: DATE_ONLY.test(iso) ? 'UTC' : LIMA_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

export function formatDateTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: LIMA_TZ,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function formatWeekdayTime(
  iso: string,
  locale: Locale,
): { weekday: string; time: string } {
  const d = new Date(iso)
  return {
    weekday: new Intl.DateTimeFormat(intlLocale[locale], {
      timeZone: LIMA_TZ,
      weekday: 'long',
    }).format(d),
    time: new Intl.DateTimeFormat(intlLocale[locale], {
      timeZone: LIMA_TZ,
      hour: '2-digit',
      minute: '2-digit',
    }).format(d),
  }
}

/** Initials for an avatar chip. */
export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

/** Age in whole years, from an ISO date of birth. */
export function ageFrom(birthDateIso: string, now = new Date()): number {
  const born = new Date(birthDateIso)
  let age = now.getUTCFullYear() - born.getUTCFullYear()
  const monthDiff = now.getUTCMonth() - born.getUTCMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < born.getUTCDate())) {
    age -= 1
  }
  return age
}
