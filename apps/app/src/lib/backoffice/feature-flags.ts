import { apiFetch } from './api-client'

/** One override as `apps/api` reports it — only the flags somebody moved. */
export interface FeatureFlagOverrideRow {
  key: string
  enabled: boolean
  updatedBy: string
  /** Null when the account that moved it has since been removed. */
  updatedByName: string | null
  updatedAt: string
}

/**
 * The switchboard's rows. Owners only on the API side — a panel account that
 * is not on the owners' domain gets a 403 here, and the screen that calls this
 * has already drawn the locked state for them (CLAUDE.md §5).
 */
export async function listFeatureFlagOverrides(): Promise<FeatureFlagOverrideRow[]> {
  const response = await apiFetch('/api/v1/feature-flags')
  if (!response.ok) return []
  const { items } = (await response.json()) as { items: FeatureFlagOverrideRow[] }
  return items
}
