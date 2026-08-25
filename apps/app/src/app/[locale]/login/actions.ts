'use server'

import { z } from 'zod'
import { getLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'

export type LoginState = {
  ok: boolean
  errorId: string | null
}

/**
 * Como a pessoa se identifica. União fechada de propósito: o valor chega do
 * formulário, e o que não estiver aqui não vira consulta — o mesmo cuidado que
 * a origem da matrícula tem com o canal (`CLAUDE.md` §5).
 */
const schema = z.object({
  method: z.enum(['email', 'national_id']),
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
})

/**
 * Stub de frontend — o wiring real do provedor de auth é a Sessão 31 do
 * ROADMAP. Por enquanto qualquer submit válido navega ao portal mockado.
 *
 * O que já é definitivo aqui é o desenho: a resposta é a mesma para credencial
 * errada, conta inexistente e payload inválido (anti-enumeração, `CLAUDE.md`
 * §8) — mensagem genérica + `error_id`, detalhe só no log do servidor. Nada do
 * que a pessoa digitou entra em log: identificador é PII (§6).
 */
export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = schema.safeParse({
    method: formData.get('method'),
    identifier: formData.get('identifier'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { ok: false, errorId: crypto.randomUUID() }
  }

  const locale = await getLocale()
  redirect({ href: '/portal', locale })
  // redirect() lança NEXT_REDIRECT — inalcançável, mas fecha o control-flow do TS.
  return { ok: true, errorId: null }
}
