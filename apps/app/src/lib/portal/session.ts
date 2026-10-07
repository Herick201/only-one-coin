import { cache } from 'react'
import { getLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'
import { apiFetch } from '@/lib/backoffice/api-client'
import { getPortalSession } from './mock-data'
import type { PortalSession } from './types'

export interface StudentIdentity {
  firstName: string
  lastName: string
  email: string
}

/**
 * The signed-in student, read from the real session (`GET /portal/me`) —
 * never a client choice (CLAUDE.md §8). No session, an expired one, a staff
 * session or an account with no file behind it: back to the login. Every page
 * under /portal calls this (memoized per request), not only the layout — a
 * layout is not re-run on client navigation, a page is.
 */
export const getStudentSession = cache(async (): Promise<StudentIdentity> => {
  const response = await apiFetch('/api/v1/portal/me')
  if (!response.ok) {
    const locale = await getLocale()
    redirect({ href: '/login', locale })
    throw new Error('unreachable')
  }
  return (await response.json()) as StudentIdentity
})

/**
 * The portal's data until it is wired to the API (spec 2026-10-05, decision
 * 2): the mock persona's courses, payments and documents, under the real
 * student's name and e-mail.
 */
export async function getPortalView(): Promise<PortalSession> {
  const identity = await getStudentSession()
  const mock = getPortalSession()
  return {
    ...mock,
    student: { ...mock.student, firstName: identity.firstName, lastName: identity.lastName, email: identity.email },
  }
}
