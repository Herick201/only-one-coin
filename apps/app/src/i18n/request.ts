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
  // As mensagens do portal ficam em arquivos próprios (messages/portal/*) e
  // entram por merge aditivo — mantém os namespaces do portal desacoplados dos
  // demais (login/backoffice), evitando colisão de edição entre frentes.
  const [base, portal] = await Promise.all([
    import(`../messages/${file}.json`),
    import(`../messages/portal/${file}.json`),
  ])
  return {
    locale,
    messages: { ...base.default, ...portal.default },
  }
})
