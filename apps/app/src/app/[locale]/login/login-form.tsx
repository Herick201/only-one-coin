'use client'

import { useActionState, useState } from 'react'
import { useTranslations } from 'next-intl'
import { login, type LoginState } from './actions'
import { EyeIcon, EyeOffIcon, HelpIcon, IdCardIcon, LockIcon, MailIcon } from './icons'

// Estado inicial vive no client: um módulo 'use server' só exporta funções
// async, então importar uma const dele chega undefined no bundle do cliente.
const initialState: LoginState = { ok: true, errorId: null }

/**
 * Duas portas para a mesma conta: o e-mail que recebeu as credenciais e o
 * documento com que se matriculou. O documento existe porque é o dado que o
 * aluno sabe de cor — o e-mail dele é pessoal (Gmail obrigatório,
 * `CLAUDE.md` §1), mas quem se matriculou meses atrás lembra do DNI antes de
 * lembrar de qual conta usou.
 *
 * União fechada, não string solta: a tela nunca manda ao servidor um método
 * que ele não conheça (`CLAUDE.md` §4).
 */
type Method = 'email' | 'national_id'

const fieldClass =
  'peer w-full rounded-2xl border border-line bg-sky-soft py-3 pl-11 pr-3 text-base font-normal text-ink outline-none transition placeholder:text-muted-foreground/70 focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-brand-blue/15'
const adornClass =
  'pointer-events-none absolute left-3.5 text-muted-foreground transition peer-focus:text-brand-blue'

export function LoginForm() {
  const t = useTranslations('login')
  const [state, action, pending] = useActionState(login, initialState)
  const [showPassword, setShowPassword] = useState(false)
  const [method, setMethod] = useState<Method>('email')
  const [hintOpen, setHintOpen] = useState(false)

  const byEmail = method === 'email'

  return (
    <form
      action={action}
      className="rounded-[28px] border border-line bg-white p-6 shadow-float sm:p-7"
      noValidate
    >
      <h1 className="font-display text-3xl font-semibold leading-tight text-ink">
        {t('title')}
      </h1>
      <p className="mt-2 mb-5 text-sm leading-relaxed text-muted-foreground">
        {t('subtitle')}
      </p>

      {!state.ok && (
        <div
          role="alert"
          className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <p>{t('generic_error')}</p>
          {state.errorId && (
            <p className="mt-1 text-xs text-red-500">
              {t('error_reference', { errorId: state.errorId })}
            </p>
          )}
        </div>
      )}

      {/* Seletor de porta. Dois botões e não um <select>: são duas opções, e
          o que muda é o campo logo abaixo — a troca tem que ser visível. */}
      <div
        role="group"
        aria-label={t('method_legend')}
        className="mb-5 grid grid-cols-2 gap-1 rounded-full border border-line bg-sky-soft p-1"
      >
        {(['email', 'national_id'] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={method === option}
            onClick={() => {
              setMethod(option)
              setHintOpen(false)
            }}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              method === option
                ? 'bg-white text-ink shadow-card'
                : 'text-muted-foreground hover:text-ink'
            }`}
          >
            {option === 'email' ? t('method_email') : t('method_national_id')}
          </button>
        ))}
      </div>

      {/* O método viaja junto com o identificador: sem ele o servidor teria de
          adivinhar se aquilo é e-mail ou documento. */}
      <input type="hidden" name="method" value={method} />

      <div className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
          <span className="flex items-center gap-1.5">
            {byEmail ? t('email_label') : t('national_id_label')}
            {/* Botão e não tooltip: o público é de celular, e tooltip não abre
                no toque. Revelar/esconder funciona igual no dedo, no mouse e
                no teclado. */}
            {!byEmail && (
              <button
                type="button"
                onClick={() => setHintOpen((v) => !v)}
                aria-expanded={hintOpen}
                aria-controls="national-id-hint"
                aria-label={t('national_id_hint_label')}
                className={`grid h-5 w-5 place-items-center rounded-full border transition ${
                  hintOpen
                    ? 'border-brand-blue bg-brand-blue text-white'
                    : 'border-line bg-sky text-muted-foreground hover:border-brand-blue hover:text-brand-blue'
                }`}
              >
                <HelpIcon size={13} />
              </button>
            )}
          </span>
          <span className="relative flex items-center">
            <input
              // `key` força um campo novo a cada troca: sem isso o React
              // reaproveita o input e o e-mail digitado reaparece no campo de
              // documento (e vai junto no submit).
              key={method}
              type={byEmail ? 'email' : 'text'}
              name="identifier"
              inputMode={byEmail ? 'email' : 'numeric'}
              autoComplete={byEmail ? 'email' : 'username'}
              required
              placeholder={
                byEmail ? t('email_placeholder') : t('national_id_placeholder')
              }
              className={fieldClass}
            />
            {byEmail ? (
              <MailIcon size={18} className={adornClass} />
            ) : (
              <IdCardIcon size={18} className={adornClass} />
            )}
          </span>
          {!byEmail && hintOpen && (
            <span
              id="national-id-hint"
              className="rounded-2xl bg-sky px-3.5 py-2.5 text-xs font-normal leading-relaxed text-muted-foreground"
            >
              {t('national_id_hint')}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
          {t('password_label')}
          <span className="relative flex items-center">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              required
              placeholder={t('password_placeholder')}
              className={`${fieldClass} pr-12`}
            />
            <LockIcon size={18} className={adornClass} />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t('hide_password') : t('show_password')}
              className="absolute right-3 grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-sky hover:text-ink"
            >
              {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
            </button>
          </span>
        </label>
      </div>

      {/* Recuperação ainda não tem rota — fica como texto, não como link azul:
          link que não leva a lugar nenhum é pior do que a espera. Vira link
          quando o fluxo existir, com o desenho anti-enumeração (mesma resposta
          para conta existente e inexistente, CLAUDE.md §8). */}
      <p className="mt-3 text-right text-sm text-muted-foreground">
        {t('forgot_password')}
      </p>

      {/* Azul → amarelo no hover: o mesmo gesto do `.btn-primary` da landing. */}
      <button
        type="submit"
        disabled={pending}
        className="mt-6 flex w-full items-center justify-center rounded-full bg-brand-blue px-4 py-3.5 text-sm font-bold text-white shadow-[0_18px_34px_-16px_rgba(47,107,255,0.95)] transition hover:-translate-y-0.5 hover:bg-brand-yellow hover:text-ink hover:shadow-[0_20px_38px_-16px_rgba(245,166,35,0.9)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {pending ? t('submitting') : t('submit')}
      </button>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        {t('mock_notice')}
      </p>
    </form>
  )
}
