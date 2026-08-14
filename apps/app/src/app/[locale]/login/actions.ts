'use server'

import { getLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'

export type LoginState = {
  ok: boolean
  errorId: string | null
}

/**
 * Stub de frontend — sem provedor de auth (decisão em aberto). Por enquanto
 * qualquer submit apenas navega ao portal mockado. A verificação real de
 * credenciais entra quando o provedor for escolhido; o desenho anti-enumeração
 * (mesma resposta genérica + error_id, detalhe só no log do servidor, sem PII)
 * já está reservado no shape do estado.
 */
export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  void formData

  const locale = await getLocale()
  redirect({ href: '/portal', locale })
  // redirect() lança NEXT_REDIRECT — inalcançável, mas fecha o control-flow do TS.
  return { ok: true, errorId: null }
}
