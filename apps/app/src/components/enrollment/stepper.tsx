import type { StepId } from '@/lib/enrollment/types'
import { STEP_ORDER } from '@/lib/enrollment/types'
import { CheckoutIcon } from './icons'

/**
 * The four steps, and where the reader is in them.
 *
 * It is deliberately not clickable forward. Jumping to "payment" before a class
 * group is chosen produces a screen asking for money against nothing — the
 * steps unlock by being completed, and going back is what the step's own
 * "back" does.
 *
 * Sizing is by container, not viewport: the full rail shows when the column can
 * hold it, and below that it collapses to "step 2 of 4" plus a progress bar,
 * which is what actually fits on a phone.
 */
export function Stepper({
  current,
  labels,
  positionLabel,
}: {
  current: StepId
  /** Short label per step, already translated. */
  labels: Record<StepId, string>
  /** "Paso 2 de 4", already interpolated — the compact form. */
  positionLabel: string
}) {
  const index = STEP_ORDER.indexOf(current)
  const pct = ((index + 1) / STEP_ORDER.length) * 100

  return (
    <nav aria-label={positionLabel} className="mb-6">
      {/* Compact: the only thing that fits next to a thumb. */}
      <div className="@2xl/checkout:hidden">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {positionLabel}
          </span>
          <span className="text-sm font-semibold text-ink">{labels[current]}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-sky">
          <div
            className="h-full rounded-full bg-brand-blue transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Full rail. */}
      <ol className="hidden items-center gap-2 @2xl/checkout:flex">
        {STEP_ORDER.map((step, i) => {
          const done = i < index
          const active = i === index
          return (
            <li key={step} className="flex min-w-0 flex-1 items-center gap-2">
              <span
                aria-current={active ? 'step' : undefined}
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition ${
                  done
                    ? 'bg-brand-blue text-white'
                    : active
                      ? 'bg-brand-blue text-white ring-4 ring-brand-blue/15'
                      : 'bg-sky text-muted-foreground'
                }`}
              >
                {done ? <CheckoutIcon name="check" size={14} /> : i + 1}
              </span>
              <span
                className={`truncate text-xs font-semibold ${
                  active ? 'text-ink' : 'text-muted-foreground'
                }`}
              >
                {labels[step]}
              </span>
              {i < STEP_ORDER.length - 1 && (
                <span
                  className={`h-px min-w-3 flex-1 ${done ? 'bg-brand-blue' : 'bg-line'}`}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
