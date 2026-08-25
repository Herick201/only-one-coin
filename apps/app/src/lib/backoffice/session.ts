import { getLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'
import { apiFetch } from './api-client'
import type { StaffUser } from './types'

/**
 * The signed-in staff member, read from the real session — never a client
 * choice (CLAUDE.md §8).
 *
 * No session, or a session `apps/api` rejects (expired, wrong role — a
 * `student`/`guardian` account has no business here): redirected to the
 * backoffice login rather than returned as null, so every call site below
 * can keep assuming a `StaffUser` exists, same as when this read a mock.
 */
export async function getStaffSession(): Promise<StaffUser> {
  const response = await apiFetch('/api/v1/me')

  if (!response.ok) {
    const locale = await getLocale()
    redirect({ href: '/backoffice', locale })
    // redirect() throws NEXT_REDIRECT — unreachable, closes TS control flow.
    throw new Error('unreachable')
  }

  return response.json() as Promise<StaffUser>
}
