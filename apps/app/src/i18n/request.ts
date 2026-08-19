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
  // Cada frente tem seu arquivo de mensagens e entra por merge aditivo — os
  // namespaces ficam desacoplados (base = login/backoffice login, `portal`, `bo`),
  // evitando colisão de edição entre frentes. O merge é raso de propósito: cada
  // arquivo é dono de namespaces próprios e nunca reabre os do outro.
  const [base, portal, backoffice] = await Promise.all([
    import(`../messages/${file}.json`),
    import(`../messages/portal/${file}.json`),
    import(`../messages/backoffice/${file}.json`),
  ])
  return {
    locale,
    messages: {
      ...base.default,
      ...portal.default,
      ...backoffice.default,
    },
  }
})
