import { apiFetch } from './api-client'

/** What `GET /settings` returns — the settings something server-side reads. */
export interface PlatformSettingsRow {
  checkoutHoldMinutes: number
}

/**
 * The settings `apps/api` actually enforces. Null when the API cannot be
 * reached or refuses the session: the screen then keeps what it already shows
 * rather than inventing a value that looks saved.
 */
export async function getPlatformSettings(): Promise<PlatformSettingsRow | null> {
  const response = await apiFetch('/api/v1/settings')
  if (!response.ok) return null
  return (await response.json()) as PlatformSettingsRow
}
