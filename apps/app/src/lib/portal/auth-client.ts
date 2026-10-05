import type { Locale } from '@/lib/format'

/** apps/api and the e-mails speak the full locale names (`LocaleSchema`). */
const EMAIL_LOCALE: Record<Locale, 'es-PE' | 'pt-BR' | 'en'> = { es: 'es-PE', pt: 'pt-BR', en: 'en' }

export type NationalIdType = 'DNI' | 'CE' | 'passport'
export type SignInMethod = 'email' | 'national_id'

export interface IdentifierInput {
  method: SignInMethod
  identifier: string
  nationalIdType?: NationalIdType
}

/** Through the same-origin proxy, so the Set-Cookie lands on this origin.
 * `ok: false` is every refusal alike; `errorId` only on a server failure. */
export async function signInStudent(
  input: IdentifierInput & { password: string },
): Promise<{ ok: true } | { ok: false; errorId: string | null }> {
  try {
    const response = await fetch('/api/v1/portal/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (response.ok) return { ok: true }
    const body = (await response.json().catch(() => null)) as { errorId?: string } | null
    return { ok: false, errorId: response.status >= 500 ? (body?.errorId ?? null) : null }
  } catch {
    return { ok: false, errorId: null }
  }
}

/** `true` when the API answered at all — it answers 202 whatever it did. */
export async function requestPortalReset(
  input: IdentifierInput & { captchaToken: string; locale: Locale },
): Promise<boolean> {
  try {
    const response = await fetch('/api/v1/portal/password-resets/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, locale: EMAIL_LOCALE[input.locale] }),
    })
    return response.ok
  } catch {
    return false
  }
}

export type CompleteAccessResult = { ok: true } | { ok: false; error: 'link_invalid' | 'weak' | 'server' }

export async function completePortalAccess(token: string, password: string): Promise<CompleteAccessResult> {
  try {
    const response = await fetch(`/api/v1/portal/access-tokens/${encodeURIComponent(token)}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (response.ok) return { ok: true }
    const body = (await response.json().catch(() => null)) as { reason?: string } | null
    if (body?.reason === 'portal_access.link_invalid') return { ok: false, error: 'link_invalid' }
    if (body?.reason === 'portal_access.weak_password') return { ok: false, error: 'weak' }
    return { ok: false, error: 'server' }
  } catch {
    return { ok: false, error: 'server' }
  }
}
