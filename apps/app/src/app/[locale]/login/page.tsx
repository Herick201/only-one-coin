import Image from 'next/image'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { env } from '@/env'
import { LanguageGlobe } from '@/components/language-globe'
import { Link } from '@/i18n/navigation'
import { LoginForm } from './login-form'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  CertificateIcon,
  ReceiptIcon,
} from './icons'

/**
 * Login do aluno — a porta pública do portal, alcançada pelo botão do header da
 * landing (`CLAUDE.md` §8: pontos de entrada separados; o backoffice tem a sua,
 * discreta). Por isso ela veste o sistema visual da landing — azul + amarelo
 * sobre lavado claro, blobs, tipografia Fredoka no display e Poppins no corpo —
 * em vez do Inter que o resto do painel usa: quem clica no botão amarelo está a
 * um clique de distância, e a tela onde se digita senha é o pior lugar para
 * parecer outro produto.
 *
 * Sem auto-cadastro: as credenciais chegam por e-mail depois da matrícula
 * aprovada. O bloco "ainda não tem conta" leva à matrícula, não a um registro.
 */
export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('login')

  const siteUrl = env.NEXT_PUBLIC_LANDING_URL ?? '/'

  const highlights = [
    { icon: CalendarIcon, label: t('highlight_1') },
    { icon: ReceiptIcon, label: t('highlight_2') },
    { icon: CertificateIcon, label: t('highlight_3') },
  ]

  return (
    <div className="grid min-h-dvh bg-sky-soft font-body lg:grid-cols-[0.95fr_1.05fr]">
      {/* Painel de marca — só no desktop; no telefone a tela é o formulário. */}
      <aside className="relative hidden overflow-hidden bg-brand-blue px-12 py-14 lg:flex lg:flex-col lg:justify-center">
        {/* Decoração emprestada do herói da landing: blobs suaves + grade de pontos. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full bg-brand-yellow/30 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-brand-blue-deep/60 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 2.2px, transparent 2.2px)',
            backgroundSize: '22px 22px',
          }}
        />

        <div className="absolute left-12 top-14">
          <Image
            src="/brand/logo.png"
            alt="Only One Coin"
            width={768}
            height={127}
            priority
            className="h-9 w-auto"
          />
        </div>

        <div className="relative max-w-md">
          <h2 className="font-display text-4xl font-semibold leading-[1.1] text-white">
            {t('brand_title')}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/80">
            {t('brand_body')}
          </p>

          <ul className="mt-9 flex flex-col gap-4">
            {highlights.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-yellow text-ink">
                  <Icon size={19} />
                </span>
                <span className="text-sm font-medium text-white">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Lado do formulário */}
      <main className="relative flex flex-col overflow-hidden px-6 py-8 sm:px-10 lg:px-16 lg:py-8">
        {/* O mesmo lavado amarelo que a landing usa atrás das seções claras. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-cream blur-3xl"
        />

        <div className="relative mb-5 flex items-center justify-between gap-4">
          <Image
            src="/brand/logo.png"
            alt="Only One Coin"
            width={768}
            height={127}
            className="h-7 w-auto lg:hidden"
          />
          <a
            href={siteUrl}
            className="hidden items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-white hover:text-ink lg:inline-flex"
          >
            <ArrowLeftIcon size={16} />
            {t('back_to_site')}
          </a>
          <LanguageGlobe />
        </div>

        <div className="relative flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">
            <LoginForm />

            {/* Sem auto-cadastro (CLAUDE.md §8): daqui só se vai à matrícula. */}
            <div className="mt-4 rounded-3xl border border-line bg-white/70 px-6 py-4">
              <p className="font-display text-base font-semibold text-ink">
                {t('no_account_title')}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('no_account_body')}
              </p>
              <Link
                href="/enrollment"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-brand-blue transition hover:gap-2.5 hover:text-brand-blue-deep"
              >
                {t('no_account_cta')}
                <ArrowRightIcon size={16} />
              </Link>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground lg:hidden">
              <a href={siteUrl} className="font-semibold transition hover:text-ink">
                ← {t('back_to_site')}
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
