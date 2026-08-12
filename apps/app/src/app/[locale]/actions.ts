'use server'

import { getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from '@/i18n/navigation'

// Encerra a sessão e volta ao login, preservando o locale. Usado pelo portal.
export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const locale = await getLocale()
  redirect({ href: '/login', locale })
}
