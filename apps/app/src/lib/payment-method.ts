import type { PaymentMethod, PaymentRail } from '@/lib/portal/types'

/**
 * Brand names of the payment rails — proper nouns, never translated
 * (CLAUDE.md §4 glossary). The domain keeps them lowercase; only the screen
 * capitalizes them.
 *
 * Keyed by rail, not by method: `other` has no brand to print, so it is
 * deliberately impossible to look up here.
 */
export const paymentMethodLabel: Record<PaymentRail, string> = {
  yape: 'Yape',
  plin: 'Plin',
  bcp: 'BCP',
  interbank: 'Interbank',
}

/**
 * What to print for a method. A rail prints its brand; `other` prints what the
 * person who recorded it wrote — that free text *is* the label, and the
 * translated fallback only covers the row that never carried one.
 *
 * `otherLabel` comes from the caller's locale (CLAUDE.md §4: no UI string in a
 * `.ts`), so this file still holds nothing a reader sees in their language.
 */
export function formatPaymentMethod(
  method: PaymentMethod,
  detail: string | null,
  otherLabel: string,
): string {
  if (method !== 'other') return paymentMethodLabel[method]
  const written = detail?.trim() ?? ''
  return written === '' ? otherLabel : written
}
