'use server'

import { getLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'
import { signOutSession } from '@/lib/auth/sign-out'

// Ends the portal session for real (Better Auth's sign-out + the cookie) and
// goes back to the login, keeping the locale.
export async function logout() {
  await signOutSession()
  const locale = await getLocale()
  redirect({ href: '/login', locale })
}
