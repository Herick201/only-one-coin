import type { ReactNode } from 'react'
import type { Viewport } from 'next'
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

/**
 * Viewport — o app é operado no celular de ponta a ponta.
 *
 * `viewportFit: 'cover'` deixa a página pintar sob o notch e a barra de
 * gestos; sem isso o `env(safe-area-inset-*)` devolve 0 e a barra de abas do
 * portal fica com o rodapé do sistema por cima. Quem paga por isso é quem
 * desenha: todo elemento fixo no rodapé soma a safe area (`pb-safe-b`).
 *
 * `maximumScale`/`userScalable` ficam de fora de propósito: bloquear o zoom é
 * a forma mais rápida de tornar um app inacessível, e boa parte do público
 * aqui é apoderado lendo termo de consentimento no celular.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f6f9ff',
}

// CSP com nonce por request (middleware.ts, CLAUDE.md §8) exige rendering
// dinâmico em toda rota — sem isso, o nonce embutido no HTML pré-renderizado
// no build nunca bateria com o nonce (novo a cada request) do header CSP, e
// os scripts do próprio Next seriam bloqueados no browser.
export const dynamic = 'force-dynamic'

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
