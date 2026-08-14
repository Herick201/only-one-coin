'use server'

import { getLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'

// Encerra a "sessão" e volta ao login, preservando o locale. Stub de frontend:
// sem provedor de auth ainda (decisão em aberto), só navega. O signOut real
// entra quando o provedor for escolhido.
export async function logout() {
  const locale = await getLocale()
  redirect({ href: '/login', locale })
}
