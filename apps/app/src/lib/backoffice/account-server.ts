import { apiFetch } from './api-client'

/**
 * When the signed-in account's password last changed — null while it is
 * still the one the account was created with. A failed read degrades to
 * that same null: the line is informative, never worth breaking the page for.
 */
export async function getPasswordChangedAt(): Promise<string | null> {
  const response = await apiFetch('/api/v1/me/password')
  if (!response.ok) return null
  const body = (await response.json()) as { changedAt: string | null }
  return body.changedAt
}
