import type { ReactNode } from 'react'
import { Fredoka, Inter, Poppins } from 'next/font/google'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import '../globals.css'

/**
 * Duas tipografias, por público.
 *
 * Inter é a do trabalho: portal e backoffice são ferramenta (tabelas, valores
 * em PEN, sessões longas), e a personalidade fica na paleta e no logo.
 *
 * Fredoka + Poppins são as da landing, e entram nas telas que o visitante
 * alcança direto do site — hoje a de login do aluno, que é a primeira coisa
 * depois de clicar no botão do header. Trocar de tipografia no meio de um
 * clique faz parecer outro produto, e é justamente aí que a pessoa decide se
 * ainda está no lugar certo para digitar a senha.
 *
 * As variáveis entram no <html> de propósito: os tokens (`--font-sans`,
 * `--font-display`, `--font-body`) são declarados no :root (globals.css) e o
 * var() é substituído lá. Injetar a variável num wrapper mais abaixo deixa o
 * token inválido e derruba a página no serif padrão.
 */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-fredoka',
  display: 'swap',
})

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }
  setRequestLocale(locale)

  const messages = await getMessages()

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${fredoka.variable} ${poppins.variable}`}
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
