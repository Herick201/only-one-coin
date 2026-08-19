'use server'

import { getLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'

/**
 * Stub de frontend — sem provedor de auth (decisão em aberto). Só volta ao
 * login do backoffice preservando o locale; o signOut real (e a invalidação de
 * sessão MFA) entra quando o provedor for escolhido.
 */
export async function logoutStaff() {
  const locale = await getLocale()
  redirect({ href: '/backoffice', locale })
}
