'use client'

import { CheckoutIcon } from './icons'

/** Below this the bar turns urgent — two minutes is when people start rushing. */
const URGENT_SECONDS = 120

/**
 * The countdown on the held seat.
 *
 * It reports; it does not decide. The seat is held by the server and expires
 * there (`docs/MATRICULA-CHECKOUT.md` §3) — this only tells the reader how long
 * they have, so that "I paid and lost the seat" never happens silently.
 *
 * Rendered `aria-live="off"` on purpose: a screen reader announcing a ticking
 * clock every second makes the form unusable. The label carries the remaining
 * time, and the expiry itself is announced by the step that replaces this.
 */
export function HoldTimer({
  secondsLeft,
  label,
  timeLabel,
}: {
  secondsLeft: number
  /** "Tu vacante está reservada" — already translated. */
  label: string
  /** Accessible sentence carrying the same minutes, already interpolated. */
  timeLabel: string
}) {
  const urgent = secondsLeft <= URGENT_SECONDS
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 ${
        urgent
          ? 'border-red-600/20 bg-red-50 text-red-800'
          : 'border-brand-yellow-deep/25 bg-brand-yellow/10 text-ink'
      }`}
    >
      <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
        <CheckoutIcon name="seat" size={16} className="shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      <span
        aria-live="off"
        title={timeLabel}
        className={`flex shrink-0 items-center gap-1.5 font-mono text-sm font-bold tabular-nums ${
          urgent ? 'text-red-700' : 'text-ink'
        }`}
      >
        <CheckoutIcon name="clock" size={15} />
        <span className="sr-only">{timeLabel}</span>
        <span aria-hidden="true">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </span>
    </div>
  )
}
