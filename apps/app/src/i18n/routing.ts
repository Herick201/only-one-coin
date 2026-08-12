import { defineRouting } from 'next-intl/routing'

/**
 * es-PE é padrão e não leva prefixo; /en e /pt prefixados (CLAUDE.md §4).
 * Os códigos de rota são curtos (es/en/pt); os arquivos de locale mantêm o
 * nome completo (es-PE/pt-BR/en) — ver ./request.ts. Um 4º idioma (ex.: quechua)
 * é só mais uma entrada aqui + mais um arquivo de mensagens.
 */
export const routing = defineRouting({
  locales: ['es', 'en', 'pt'],
  defaultLocale: 'es',
  localePrefix: 'as-needed',
})
