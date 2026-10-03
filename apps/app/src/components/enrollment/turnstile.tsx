'use client'

import { useEffect, useRef } from 'react'
import type { Locale } from '@/lib/format'

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string
      language: string
      callback: (token: string) => void
      'expired-callback': () => void
      'error-callback': () => void
    },
  ): string
  reset(widgetId: string): void
  remove(widgetId: string): void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

// The widget speaks these; our route codes are shorter.
const turnstileLanguage: Record<Locale, string> = { es: 'es', pt: 'pt-br', en: 'en' }

let scriptLoad: Promise<TurnstileApi> | null = null

/**
 * One script tag per page, however many times the step mounts. Inserted by
 * the (nonced) bundle, which is what `strict-dynamic` lets through the CSP
 * (`src/middleware.ts`). A failed load is forgotten, so the next mount tries
 * again.
 */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  scriptLoad ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile missing')))
    script.onerror = () => reject(new Error('turnstile failed to load'))
    document.head.appendChild(script)
  }).catch((err: unknown) => {
    scriptLoad = null
    throw err
  })
  return scriptLoad
}

/**
 * Cloudflare Turnstile (OOC-24). Hands its token up through `onToken` — and
 * `null` whenever there is no usable one (expired, errored, or reset).
 *
 * A token is good for one submit: bump `resetKey` after every attempt that
 * reached the server and the widget issues a fresh one.
 */
export function Turnstile({
  siteKey,
  locale,
  resetKey,
  onToken,
  onUnavailable,
}: {
  siteKey: string
  locale: Locale
  resetKey: number
  onToken: (token: string | null) => void
  onUnavailable: () => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const widget = useRef<{ api: TurnstileApi; id: string } | null>(null)
  // The callbacks change identity every render; the widget is rendered once.
  const handlers = useRef({ onToken, onUnavailable })
  handlers.current = { onToken, onUnavailable }

  useEffect(() => {
    let cancelled = false
    loadTurnstile()
      .then((api) => {
        if (cancelled || !container.current) return
        const id = api.render(container.current, {
          sitekey: siteKey,
          language: turnstileLanguage[locale],
          callback: (token) => handlers.current.onToken(token),
          'expired-callback': () => handlers.current.onToken(null),
          'error-callback': () => handlers.current.onToken(null),
        })
        widget.current = { api, id }
      })
      .catch(() => {
        if (!cancelled) handlers.current.onUnavailable()
      })

    return () => {
      cancelled = true
      if (widget.current) widget.current.api.remove(widget.current.id)
      widget.current = null
    }
  }, [siteKey, locale])

  useEffect(() => {
    if (resetKey === 0 || !widget.current) return
    handlers.current.onToken(null)
    widget.current.api.reset(widget.current.id)
  }, [resetKey])

  return <div ref={container} className="min-h-[65px]" />
}
