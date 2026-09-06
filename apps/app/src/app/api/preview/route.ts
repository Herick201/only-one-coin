import { NextResponse, type NextRequest } from 'next/server'
import {
  PREVIEW_COOKIE,
  PREVIEW_MAX_AGE_SECONDS,
  isPreviewTokenValid,
  isPreviewUnlockConfigured,
} from '@/lib/feature-flags/preview'
import { featureEnv } from '@/lib/feature-flags/env'

/**
 * The internal unlock, in and out.
 *
 *   /api/preview?token=<secret>&next=/backoffice/home   opens it
 *   /api/preview?off=1                                  closes it
 *
 * With the unlock open every feature flag resolves on for this browser, in
 * production included — which is what "desativado fica só pra nós" means
 * (CLAUDE.md §5). A badge stays on screen the whole time, so nobody mistakes
 * an internal screen for one the student can reach.
 *
 * Everything that is not a valid unlock answers 404, the same as a path that
 * does not exist: a wrong token must not tell the person guessing that there
 * was something to guess.
 */

/** Only a path inside this app, never an absolute URL: no open redirect. */
function safeNext(raw: string | null): string {
  if (!raw) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) {
    return '/'
  }
  return raw
}

function notFound(): NextResponse {
  return new NextResponse(null, { status: 404 })
}

export function GET(request: NextRequest): NextResponse {
  const params = request.nextUrl.searchParams
  const destination = new URL(safeNext(params.get('next')), request.url)

  if (params.get('off') !== null) {
    const closed = NextResponse.redirect(destination)
    closed.cookies.delete(PREVIEW_COOKIE)
    return closed
  }

  if (!isPreviewUnlockConfigured()) return notFound()

  const token = params.get('token')
  if (!token || !isPreviewTokenValid(token)) return notFound()

  // Redirecting immediately is what keeps the secret from sitting in the
  // address bar — and out of the referrer of everything the next page loads.
  const response = NextResponse.redirect(destination)
  response.cookies.set(PREVIEW_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: featureEnv.APP_ENV !== 'development',
    path: '/',
    maxAge: PREVIEW_MAX_AGE_SECONDS,
  })
  return response
}
