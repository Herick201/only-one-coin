import type { PaymentMethod } from '@/lib/portal/types'

/**
 * Brand names of the payment rails — proper nouns, never translated
 * (CLAUDE.md §4 glossary). The domain keeps them lowercase; only the screen
 * capitalizes them.
 */
export const paymentMethodLabel: Record<PaymentMethod, string> = {
  yape: 'Yape',
  plin: 'Plin',
  bcp: 'BCP',
  interbank: 'Interbank',
}
