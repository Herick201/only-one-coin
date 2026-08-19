'use client'

import { useEffect } from 'react'
import { BoIcon } from './icons'

/**
 * Interactive primitives that need browser state, kept out of `ui.tsx` so that
 * file stays importable from server components.
 *
 * Copy never lives here — every label arrives already translated from the
 * caller (i18n hard rule, CLAUDE.md §4).
 */

/**
 * A switch, for a setting that takes effect as a setting: on or off, no third
 * state. Deliberately not used for confirmations ("I confirm the fee was
 * paid") — those stay checkboxes, because a switch reads as a preference and a
 * confirmation is an assertion about the world.
 */
export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="flex flex-col gap-0.5">
        <span className="text-sm text-ink">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 ${
          checked ? 'bg-brand-blue' : 'bg-slate-300'
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

/**
 * Small confirmation that a change landed. It dismisses itself: a save that
 * needs an OK button turns a one-click action into two.
 *
 * `key`ing this on the message from the caller is what makes a second save
 * restart the timer instead of inheriting the first one's.
 */
export function Toast({
  message,
  onDismiss,
  duration = 2600,
}: {
  message: string | null
  onDismiss: () => void
  duration?: number
}) {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [message, duration, onDismiss])

  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-ink px-3.5 py-2.5 text-sm font-medium text-white shadow-lg"
    >
      <BoIcon name="check" size={16} className="text-emerald-300" />
      {message}
    </div>
  )
}
