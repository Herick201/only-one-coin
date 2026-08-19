import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import '../globals.css'

/**
 * Inter para portal e backoffice: o app é ferramenta de trabalho (tabelas,
 * valores em PEN, sessões longas), não peça de marca — a personalidade fica na
 * paleta e no logo. A landing (Astro) segue com Fredoka/Poppins.
 *
 * A variável entra no <html> de propósito: `--font-sans` é declarada no :root
 * (globals.css) e o var() é substituído lá. Injetar a variável num wrapper mais
 * abaixo deixa o token inválido e derruba a página inteira no serif padrão.
 */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
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
    <html lang={locale} className={inter.variable}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
