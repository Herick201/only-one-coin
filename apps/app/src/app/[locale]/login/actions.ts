'use server'

import { getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from '@/i18n/navigation'

export type LoginState = {
  ok: boolean
  errorId: string | null
}

/**
 * Anti-enumeração: qualquer falha (senha errada, conta inexistente, bloqueio)
 * volta a MESMA resposta genérica + um error_id. O detalhe fica só no log do
 * servidor (Sentry depois), nunca no cliente, e sem PII no log.
 */
export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    const errorId = crypto.randomUUID()
    // Sem e-mail/PII no log — só o código de referência e o code do erro.
    console.error(`[login] auth_failure error_id=${errorId} code=${error.code ?? 'unknown'}`)
    return { ok: false, errorId }
  }

  const locale = await getLocale()
  redirect({ href: '/portal', locale })
  // redirect() lança NEXT_REDIRECT — inalcançável, mas fecha o control-flow do TS.
  return { ok: true, errorId: null }
}
