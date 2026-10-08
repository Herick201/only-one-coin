'use server'

import { getLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'
import { signOutSession } from '@/lib/auth/sign-out'

/**
 * Signs the staff session out — see `signOutSession` (Better Auth's own
 * sign-out plus the cookie) — and goes back to the backoffice login.
 */
export async function logoutStaff() {
  await signOutSession()
  const locale = await getLocale()
  redirect({ href: '/backoffice', locale })
}

/** Same sign-out, landing back on the docente portal's own login. */
export async function logoutTeacher() {
  await signOutSession()
  const locale = await getLocale()
  redirect({ href: '/docente', locale })
}
