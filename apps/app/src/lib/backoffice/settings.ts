import type { GeneralSettings } from './types'
import { CONTRACT_ALERT_DAYS } from './contract'
import { CERTIFICATE_DEADLINE_BUSINESS_DAYS } from './certificates'
import {
  CONSTANCIA_FEE_CENTS,
  PASSING_GRADE,
  getPaymentSettings,
} from './mock-data'

/**
 * The numbers the platform runs on, gathered in one place.
 *
 * None of this is new: every value here is already fixed somewhere in the repo
 * — the passing grade and the constancia fee in `mock-data`, the contract
 * warning in `contract.ts`, the certificate deadline in `certificates.ts`, the
 * receipt parameters in `getPaymentSettings`. Each of them carries a comment
 * saying it belongs in the backoffice rather than in the code, for the reason
 * CLAUDE.md §5 gives about the payment tolerance: the Asociación changing what
 * a rule means must not require a deploy.
 *
 * So this module reads those constants instead of re-typing them. It is a leaf
 * on purpose — it imports from the rule modules, never the other way round —
 * and when the API exists it becomes one `GET /settings` and the constants go
 * away, without any screen changing.
 */
export function getGeneralSettings(): GeneralSettings {
  return {
    academic: {
      passingGrade: PASSING_GRADE,
      certificateDeadlineBusinessDays: CERTIFICATE_DEADLINE_BUSINESS_DAYS,
      constanciaFeeCents: CONSTANCIA_FEE_CENTS,
      contractAlertDays: CONTRACT_ALERT_DAYS,
    },
    receipts: getPaymentSettings(),
  }
}
