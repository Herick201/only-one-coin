import createMiddleware from 'next-intl/middleware'
import type { NextRequest } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

// CSP com nonce por request (CLAUDE.md §8). Exige rendering dinâmico em toda
// rota — natural aqui, porque apps/app inteiro fica atrás de login (portal +
// backoffice, sem página pública indexada). O nonce só nonça os scripts que o
// próprio Next injeta (framework, hydration, bundle da rota); se algum dia
// entrar um <Script> de terceiro (analytics, etc.), o valor também precisa
// ser encaminhado via header de request (`x-nonce`) pro Server Component ler
// com `headers()` — não precisa disso ainda, nada aqui usa script inline.
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development'
  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''};
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' data:;
    font-src 'self';
    connect-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request)

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  response.headers.set('Content-Security-Policy', buildCsp(nonce))
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')

  return response
}

export const config = {
  // Tudo menos api, assets do Next e arquivos com extensão.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
