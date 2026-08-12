import type { Locale } from './types'

/**
 * Locale-aware formatters. Money is PEN from integer cents (never float).
 * Dates are stored UTC and rendered in America/Lima (CLAUDE.md §6).
 * These emit numbers/dates only — never UI words, which stay in i18n files.
 */

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

export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: LIMA_TZ,
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

/** Student initials for the avatar chip. */
export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}
