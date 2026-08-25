import { Fragment } from 'react'
import type { StepId } from '@/lib/enrollment/types'
import { STEP_ORDER } from '@/lib/enrollment/types'
import { CheckoutIcon } from './icons'

/**
 * The four steps, and where the reader is in them.
 *
 * The label sits **under** its circle rather than beside it: with four steps
 * side by side, a label to the right of each dot pushes the whole rail wide and
 * the connectors end up as slivers. Stacked, the rail reads as four stations on
 * one line, and the label has room to be large enough to actually read.
 *
 * Three states, and the colour carries the meaning on its own:
 * **blue** is where you are, **yellow** is behind you, grey is ahead.
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
      <div className="@lg/checkout:hidden">
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
      <ol className="hidden items-start @lg/checkout:flex">
        {STEP_ORDER.map((step, i) => {
          const done = i < index
          const active = i === index
          return (
            <Fragment key={step}>
              {i > 0 && (
                /* `mt-4` puts the line on the circle's centre line — half of
                   the 2rem circle — so it stays aligned while the labels grow
                   downward. */
                <li
                  aria-hidden="true"
                  className={`mt-4 h-0.5 flex-1 rounded-full ${
                    done || active ? 'bg-brand-yellow' : 'bg-line'
                  }`}
                />
              )}
              <li className="flex flex-col items-center gap-2 px-2">
                <span
                  aria-current={active ? 'step' : undefined}
                  className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold transition ${
                    done
                      ? 'bg-brand-yellow text-ink'
                      : active
                        ? 'bg-brand-blue text-white ring-4 ring-brand-blue/15'
                        : 'bg-sky text-muted-foreground'
                  }`}
                >
                  {done ? <CheckoutIcon name="check" size={16} /> : i + 1}
                </span>
                <span
                  className={`whitespace-nowrap text-sm ${
                    active
                      ? 'font-semibold text-ink'
                      : done
                        ? 'font-medium text-ink'
                        : 'font-medium text-muted-foreground'
                  }`}
                >
                  {labels[step]}
                </span>
              </li>
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
