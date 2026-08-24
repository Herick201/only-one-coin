import type { EmailDeliveryIssue, EmailDeliveryReason } from './types'

/**
 * What to do about a delivery that did not land.
 *
 * A wrong address is not a retry: resending it bounces again, and what has to
 * change is the file. A full mailbox or a provider error is exactly what a
 * resend is for — and the resend is an audited exception, never a routine
 * button (`docs/DOCUMENTOS-E-CERTIFICADOS.md` §4).
 */
export function deliveryAction(
  reason: EmailDeliveryReason,
): 'resend' | 'fix_address' {
  return reason === 'address_unknown' || reason === 'domain_invalid'
    ? 'fix_address'
    : 'resend'
}

/** Split by state, for the header and the quick action that leads here. */
export function countDeliveryIssues(issues: EmailDeliveryIssue[]): {
  bounced: number
  failed: number
  total: number
} {
  const bounced = issues.filter((item) => item.state === 'bounced').length
  return { bounced, failed: issues.length - bounced, total: issues.length }
}
