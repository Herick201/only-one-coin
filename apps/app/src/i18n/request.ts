import { getRequestConfig } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { routing } from './routing'

// Código de rota curto -> arquivo de locale completo (es-PE padrão).
const messageFiles = {
  es: 'es-PE',
  en: 'en',
  pt: 'pt-BR',
} as const

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  const file = messageFiles[locale]
  return {
    locale,
    messages: (await import(`../messages/${file}.json`)).default,
  }
})
