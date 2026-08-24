import type { EmailFlow, EmailStage } from './types'

/**
 * The order the student lives the automatic e-mails in — the journey screen's
 * spine, and the order the catalog lists them in.
 *
 * It lives here rather than being read off the catalog array so the two screens
 * cannot drift: a template added in the middle of the list still lands in the
 * stage it belongs to.
 */
export const EMAIL_STAGES: EmailStage[] = [
  'enrollment',
  'payment',
  'access',
  'documents',
]

export interface EmailJourneyStage {
  stage: EmailStage
  /** In catalog order — which is the order they fire inside the stage. */
  flows: EmailFlow[]
}

/**
 * The catalog, cut into the four moments. A stage with nothing in it is kept:
 * a silent stretch of the journey is worth seeing, not hiding.
 */
export function buildEmailJourney(flows: EmailFlow[]): EmailJourneyStage[] {
  return EMAIL_STAGES.map((stage) => ({
    stage,
    flows: flows.filter((flow) => flow.stage === stage),
  }))
}
