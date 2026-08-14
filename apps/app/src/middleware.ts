import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

// Só roteamento de locale por enquanto. O refresh de sessão do provedor de auth
// entra aqui quando existirem rotas protegidas (portal/backoffice).
export default createMiddleware(routing)

export const config = {
  // Tudo menos api, assets do Next e arquivos com extensão.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
