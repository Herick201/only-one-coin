'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { login, type LoginState } from './actions'

// Estado inicial vive no client: um módulo 'use server' só exporta funções
// async, então importar uma const dele chega undefined no bundle do cliente.
const initialState: LoginState = { ok: true, errorId: null }

export function LoginForm() {
  const t = useTranslations('login')
  const [state, action, pending] = useActionState(login, initialState)

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {!state.ok && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <p>{t('generic_error')}</p>
          {state.errorId && (
            <p className="mt-1 text-xs text-red-500">
              {t('error_reference', { errorId: state.errorId })}
            </p>
          )}
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        {t('email_label')}
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder={t('email_placeholder')}
          className="rounded-lg border border-slate-300 px-3 py-2 text-base font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        {t('password_label')}
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          placeholder={t('password_placeholder')}
          className="rounded-lg border border-slate-300 px-3 py-2 text-base font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? t('submitting') : t('submit')}
      </button>
    </form>
  )
}
