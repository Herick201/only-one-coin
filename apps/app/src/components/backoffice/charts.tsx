'use client'

import { useState, type ReactNode } from 'react'
import { BoIcon } from '@/components/backoffice/icons'
import {
  Tooltip as HintTooltip,
  TooltipContent as HintTooltipContent,
  TooltipTrigger as HintTooltipTrigger,
} from '@/components/ui/tooltip'

/**
 * The panel's chart marks. Presentational only — every label arrives already
 * translated or already formatted from the caller (i18n hard rule,
 * CLAUDE.md §4), and nothing here knows what a matrícula is.
 *
 * Two colour jobs, kept apart on purpose:
 *
 * - A chart with **one** series (matrículas per month, a ranking) is drawn in
 *   brand blue. The title says what it is; a second hue would claim a second
 *   meaning that is not there.
 * - A chart where colour **is** the identity (the donut's slices, the trend's
 *   lines) draws from `CATEGORICAL` below, in slot order.
 *
 * `CATEGORICAL` is validated, not chosen by eye: blue → orange → aqua → violet
 * clears the lightness band, the chroma floor, and the colour-vision-deficiency
 * and normal-vision separation floors on **every** pair, not just neighbours —
 * which is what a donut needs, since every slice is compared with every other.
 * Slot 1 is the brand blue (`--color-brand-blue`). The brand's own `--chart-*`
 * tokens do not clear it (both yellows sit above the lightness band and under
 * 3:1 against white), so they are deliberately not used here.
 *
 * A fifth slice is never a fifth hue: the tail folds into "others", in neutral
 * slate — a non-colour, for a non-category.
 */
export const CATEGORICAL = ['#2f6bff', '#eb6834', '#1baf7a', '#4a3aa7'] as const

/** The tail of the donut. Neutral, because "others" is not one thing. */
export const OTHERS_COLOR = '#94a3b8'

/** How many real slices a donut draws, and how many lines a trend carries. */
export const DONUT_SLICES = CATEGORICAL.length

const SERIES_COLOR = 'var(--color-brand-blue)'

/** Plot height. Enough for the marks to have shape without the card ballooning. */
const PLOT_HEIGHT = 'h-44'

export interface SeriesPoint {
  key: string
  /** Axis label, already formatted in the reader's locale. */
  label: string
  value: number
  /** The point's own number, as the reader's locale writes it. */
  caption: string
  /** Full sentence for the pointer tooltip — already translated. */
  hint: string
}

/**
 * A round number at or above the series maximum, so the top gridline is a
 * number somebody would say out loud — 30, not 26. Without it the axis reads
 * like a measurement of the data instead of a scale to read it against.
 */
function niceMax(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const steps = [1, 2, 2.5, 5, 10]
  for (const step of steps) {
    const candidate = step * magnitude
    if (value <= candidate) return candidate
  }
  return 10 * magnitude
}

/**
 * The frame every time-series in the panel is drawn on: three hairline
 * gridlines and the scale beside them.
 *
 * Marks floating on white are the thing that makes a chart read as decoration —
 * there is nothing to measure them against. The grid is deliberately recessive
 * (solid hairlines one shade off the surface, never dashed) and the scale shows
 * three values, not one per line: top, middle and zero is all a reader needs to
 * place a mark.
 */
function Plot({
  max,
  formatTick,
  children,
}: {
  max: number
  formatTick: (value: number) => string
  children: ReactNode
}) {
  const ticks = [max, max / 2, 0]

  return (
    <div className="flex gap-2">
      <ul
        aria-hidden="true"
        className={`flex ${PLOT_HEIGHT} shrink-0 flex-col justify-between text-right text-[11px] leading-none text-muted-foreground`}
      >
        {ticks.map((tick) => (
          <li key={tick}>{formatTick(tick)}</li>
        ))}
      </ul>

      <div className="min-w-0 flex-1">
        <div className={`relative ${PLOT_HEIGHT}`}>
          <div
            aria-hidden="true"
            className="absolute inset-0 flex flex-col justify-between"
          >
            {ticks.map((tick, index) => (
              <span
                key={tick}
                /* The baseline is the one line the marks sit on, so it is a
                   shade stronger than the two it shares the frame with. */
                className={`h-px w-full ${
                  index === ticks.length - 1 ? 'bg-slate-300' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * The number, on the mark you asked about.
 *
 * The browser's own `title` was doing this job and doing it badly: it waits a
 * second, it never fires on a touchscreen, and it renders in the OS's chrome
 * rather than the panel's. This one answers on hover, on focus and on tap.
 *
 * It leans away from the edges instead of centring blindly — a bubble centred
 * on the first point of a series hangs half outside the card.
 */
function Tooltip({
  left,
  bottom,
  text,
}: {
  /** Percent across the plot, and up it, of the mark being explained. */
  left: number
  bottom: number
  text: string
}) {
  const lean =
    left < 20 ? 'translate-x-0' : left > 80 ? '-translate-x-full' : '-translate-x-1/2'
  /* The plot sits in a horizontal scroller, and a scroller clips both ways: a
     bubble drawn above a full-height bar is a bubble nobody sees. Near the
     ceiling it flips under the mark and stays inside the box. */
  const below = bottom > 70
  return (
    <span
      role="status"
      className={`pointer-events-none absolute z-10 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium text-white shadow-lg ${lean} ${
        below ? 'mt-2' : 'mb-2'
      }`}
      style={{
        left: `${left}%`,
        ...(below ? { top: `${100 - bottom}%` } : { bottom: `${bottom}%` }),
      }}
    >
      {text}
    </span>
  )
}

export interface TooltipRow {
  key: string
  /** Null for a single-series chart, where the title already names it. */
  color: string | null
  label: string | null
  caption: string
}

/**
 * The tooltip of a column: the period, and every series that has a value in it.
 *
 * Per-mark tooltips were the first try and they were wrong for a line chart —
 * two series that cross, or that both sit at zero, put one dot on top of the
 * other, and only the one on top could ever answer. A column answers for all of
 * them at once, which is also the only version that works with a finger.
 */
function ColumnTooltip({
  left,
  title,
  rows,
}: {
  /** Percent across the plot of the column being explained. */
  left: number
  title: string
  rows: TooltipRow[]
}) {
  const lean =
    left < 25 ? 'translate-x-0' : left > 75 ? '-translate-x-full' : '-translate-x-1/2'
  return (
    <span
      role="status"
      className={`pointer-events-none absolute top-0 z-10 flex min-w-36 flex-col gap-1 rounded-lg bg-ink px-2.5 py-2 text-xs text-white shadow-lg ${lean}`}
      style={{ left: `${left}%` }}
    >
      <span className="font-semibold">{title}</span>
      {rows.map((row) => (
        <span key={row.key} className="flex items-center gap-2 whitespace-nowrap">
          {row.color && (
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: row.color }}
            />
          )}
          {row.label && <span className="flex-1 text-slate-300">{row.label}</span>}
          <span className="ml-auto font-semibold tabular-nums">{row.caption}</span>
        </span>
      ))}
    </span>
  )
}

/** The vertical rule tying the tooltip to the column it is reading. */
function Crosshair({ left }: { left: number }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 w-px bg-slate-300"
      style={{ left: `${left}%` }}
    />
  )
}

/**
 * The invisible hit areas that make a column answer — one per period, full
 * height, so the target is a band the width of a month rather than an 8px dot.
 */
function ColumnTargets({
  points,
  active,
  onChange,
}: {
  points: { key: string; label: string }[]
  active: number | null
  onChange: (index: number | null) => void
}) {
  return (
    <ul className="absolute inset-0 flex">
      {points.map((point, index) => (
        <li key={point.key} className="min-w-11 flex-1">
          <button
            type="button"
            aria-label={point.label}
            onMouseEnter={() => onChange(index)}
            onMouseLeave={() => onChange(null)}
            onFocus={() => onChange(index)}
            onBlur={() => onChange(null)}
            onClick={() => onChange(active === index ? null : index)}
            className="h-full w-full outline-none"
          />
        </li>
      ))}
    </ul>
  )
}

/** The row of period labels under a plot, one per point. */
function AxisLabels({ points }: { points: SeriesPoint[] }) {
  return (
    <ul className="mt-2 flex">
      {points.map((point) => (
        <li
          key={point.key}
          className="min-w-11 flex-1 whitespace-nowrap text-center text-xs text-muted-foreground"
        >
          {point.label}
        </li>
      ))}
    </ul>
  )
}

/**
 * Bars for a value per period. One series, thin marks with 4px rounded tops
 * anchored to the baseline, and no number printed on each one: the scale on the
 * left already says how big a bar is, and a label on every mark is the fastest
 * way to make a small chart unreadable. The exact value is one hover away.
 */
export function BarSeries({
  points,
  formatTick,
}: {
  points: SeriesPoint[]
  formatTick: (value: number) => string
}) {
  const max = niceMax(Math.max(...points.map((point) => point.value)))
  const [active, setActive] = useState<number | null>(null)
  const at = (index: number) => ((index + 0.5) / points.length) * 100

  return (
    <div className="overflow-x-auto [scrollbar-width:thin]">
      <div className="min-w-full">
        <Plot max={max} formatTick={formatTick}>
          <ul className="absolute inset-0 flex items-end gap-2">
            {points.map((point, index) => (
              <li
                key={point.key}
                className="group flex h-full min-w-11 max-w-20 flex-1 items-end"
              >
                {/* The whole column is the target, not the bar: a month with
                    one enrollment is a 4px mark, and nobody hits that. */}
                <button
                  type="button"
                  aria-label={point.hint}
                  onMouseEnter={() => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                  onClick={() => setActive(active === index ? null : index)}
                  className="flex h-full w-full items-end outline-none"
                >
                  <span
                    aria-hidden="true"
                    className={`w-full rounded-t transition-opacity ${
                      active === index ? 'opacity-70' : ''
                    }`}
                    style={{
                      height: `${(point.value / max) * 100}%`,
                      backgroundColor: SERIES_COLOR,
                    }}
                  />
                </button>
              </li>
            ))}
          </ul>
          {active !== null && (
            <Tooltip
              left={at(active)}
              bottom={(points[active].value / max) * 100}
              text={points[active].hint}
            />
          )}
        </Plot>
        <AxisLabels points={points} />
      </div>
    </div>
  )
}

/**
 * A line for the same shape of data, when the question is the movement rather
 * than each period's size.
 *
 * The line and its area are one SVG stretched to the box — `non-scaling-stroke`
 * keeps the stroke 2px however wide the card ends up — and the markers are an
 * HTML layer on top, so a dot stays a circle instead of turning into an ellipse
 * when the column is wide. That layer is also what carries the tooltip and a
 * hit target bigger than the mark.
 */
export function LineSeries({
  points,
  formatTick,
}: {
  points: SeriesPoint[]
  formatTick: (value: number) => string
}) {
  const max = niceMax(Math.max(...points.map((point) => point.value)))
  const [active, setActive] = useState<number | null>(null)
  /* A point sits at the centre of its period's column, not at the edge of the
     box: the labels underneath are evenly divided columns, and a line that ran
     edge to edge would print every label half a column off its own dot. */
  const at = (index: number) => ((index + 0.5) / points.length) * 100
  const heightPct = (value: number) => (value / max) * 100

  const coords = points.map(
    (point, index) => `${at(index)},${100 - heightPct(point.value)}`,
  )
  // The area closes onto the baseline under the first and last point — not the
  // corners of the box, which would draw periods that are not in the series.
  const area = `${at(0)},100 ${coords.join(' ')} ${at(points.length - 1)},100`

  return (
    <div className="overflow-x-auto [scrollbar-width:thin]">
      <div className="min-w-full">
        <Plot max={max} formatTick={formatTick}>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full"
          >
            <polygon points={area} fill={SERIES_COLOR} opacity={0.1} />
            {points.length > 1 && (
              <polyline
                points={coords.join(' ')}
                fill="none"
                stroke={SERIES_COLOR}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>

          {active !== null && <Crosshair left={at(active)} />}

          <ul aria-hidden="true" className="absolute inset-0">
            {points.map((point, index) => (
              <li
                key={point.key}
                className="absolute flex size-6 -translate-x-1/2 translate-y-1/2 items-center justify-center"
                style={{ left: `${at(index)}%`, bottom: `${heightPct(point.value)}%` }}
              >
                <span
                  className={`rounded-full ring-2 ring-white transition-all ${
                    active === index ? 'size-3' : 'size-2'
                  }`}
                  style={{ backgroundColor: SERIES_COLOR }}
                />
              </li>
            ))}
          </ul>

          <ColumnTargets points={points} active={active} onChange={setActive} />

          {active !== null && (
            <ColumnTooltip
              left={at(active)}
              title={points[active].label}
              rows={[
                {
                  key: points[active].key,
                  color: null,
                  label: null,
                  caption: points[active].caption,
                },
              ]}
            />
          )}
        </Plot>
        <AxisLabels points={points} />
      </div>
    </div>
  )
}

export interface TrendLine {
  key: string
  label: string
  points: SeriesPoint[]
}

/**
 * Several lines on one plot — how each course moved from one ciclo to the next.
 *
 * One scale for all of them, never one per line: two y-axes on a plot make up a
 * correlation that is not in the data. Colour carries identity here, so the
 * legend is part of the chart and not decoration.
 */
export function TrendChart({
  lines,
  formatTick,
  emptyLabel,
}: {
  lines: TrendLine[]
  formatTick: (value: number) => string
  emptyLabel: string
}) {
  const [active, setActive] = useState<number | null>(null)

  if (lines.length === 0 || lines[0].points.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
  }

  const max = niceMax(
    Math.max(...lines.flatMap((line) => line.points.map((point) => point.value))),
  )
  const count = lines[0].points.length
  const at = (index: number) => ((index + 0.5) / count) * 100
  const heightPct = (value: number) => (value / max) * 100

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto [scrollbar-width:thin]">
        <div className="min-w-full">
          <Plot max={max} formatTick={formatTick}>
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
              className="absolute inset-0 h-full w-full"
            >
              {lines.map((line, index) => (
                <polyline
                  key={line.key}
                  points={line.points
                    .map(
                      (point, position) =>
                        `${at(position)},${100 - heightPct(point.value)}`,
                    )
                    .join(' ')}
                  fill="none"
                  stroke={CATEGORICAL[index % CATEGORICAL.length]}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>

            {active !== null && <Crosshair left={at(active)} />}

            {lines.map((line, index) => (
              <ul key={line.key} aria-hidden="true" className="absolute inset-0">
                {line.points.map((point, position) => (
                  <li
                    key={point.key}
                    className="absolute flex size-6 -translate-x-1/2 translate-y-1/2 items-center justify-center"
                    style={{
                      left: `${at(position)}%`,
                      bottom: `${heightPct(point.value)}%`,
                    }}
                  >
                    <span
                      className={`rounded-full ring-2 ring-white transition-all ${
                        active === position ? 'size-3' : 'size-2'
                      }`}
                      style={{
                        backgroundColor: CATEGORICAL[index % CATEGORICAL.length],
                      }}
                    />
                  </li>
                ))}
              </ul>
            ))}

            {/* One target per ciclo, not per dot: two courses sitting at the
                same value put one dot exactly on top of the other, and only the
                one on top could ever be hovered — which is why some lines
                looked like they had no numbers at all. */}
            <ColumnTargets
              points={lines[0].points}
              active={active}
              onChange={setActive}
            />

            {active !== null && (
              <ColumnTooltip
                left={at(active)}
                title={lines[0].points[active].label}
                rows={lines.map((line, index) => ({
                  key: line.key,
                  color: CATEGORICAL[index % CATEGORICAL.length],
                  label: line.label,
                  caption: line.points[active].caption,
                }))}
              />
            )}
          </Plot>
          <AxisLabels points={lines[0].points} />
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {lines.map((line, index) => (
          <li key={line.key} className="flex items-center gap-2 text-sm text-ink">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: CATEGORICAL[index % CATEGORICAL.length] }}
            />
            {line.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

export interface RankedItem {
  key: string
  label: string
  value: number
  /** The number as the reader's locale writes it. */
  caption: string
}

/**
 * A ranking, as bars rather than as a sentence: the point of "which course
 * freezes most" is the distance between the first and the second, and a card
 * that spells out the winner hides exactly that.
 *
 * Horizontal, with the name on its own line above its bar — a name beside a bar
 * has to be cut to fit, and the name is the whole identity of the row.
 */
export function RankedBars({
  items,
  emptyLabel,
}: {
  items: RankedItem[]
  emptyLabel: string
}) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
  }

  const max = Math.max(...items.map((item) => item.value))

  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item.key} className="flex flex-col gap-1">
          <span className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 leading-snug text-ink">{item.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-ink">
              {item.caption}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
          >
            <span
              className="block h-full rounded-full"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: SERIES_COLOR,
              }}
            />
          </span>
        </li>
      ))}
    </ul>
  )
}

export interface DonutSlice {
  key: string
  label: string
  value: number
  /** The slice's own number, as the reader's locale writes it. */
  caption: string
  /** Share of the whole, 0–100, already rounded. */
  pct: number
  /** Full sentence for the pointer tooltip — already translated. */
  hint: string
  /** True for the folded tail, which is drawn neutral. */
  others?: boolean
}

/**
 * Part-to-whole at a glance, for at most five slices — past that a donut stops
 * being readable and the table next to it is the honest answer.
 *
 * The legend is not decoration: it carries the label and the share of every
 * slice, so identity never rests on colour alone, and the slot that sits under
 * 3:1 against white is relieved by a visible label, as the palette rule
 * requires.
 *
 * One documented deviation: the slots are handed out by size, so a filter that
 * reorders the slices does repaint them. The rule against that protects a
 * reader who learned "Acme is blue" across a series of charts; a ranked
 * part-to-whole is read together with the legend beside it, every time, and the
 * alternative — hashing a name into a slot — would scatter the four hues that
 * were validated as an ordered set. The tail is always neutral, whatever it
 * holds.
 */
export function DonutChart({
  slices,
  total,
  totalLabel,
  emptyLabel,
}: {
  slices: DonutSlice[]
  /** The hero number in the hole, already formatted. */
  total: string
  totalLabel: string
  emptyLabel: string
}) {
  const [active, setActive] = useState<number | null>(null)
  const sum = slices.reduce((value, slice) => value + slice.value, 0)
  if (sum === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
  }

  // The donut is drawn as one circle per slice: a dash as long as the slice,
  // then a gap for everything else, rotated to where the slice starts. `GAP`
  // is the 2px of surface between fills — never a border around them.
  const RADIUS = 40
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const GAP = 1.2

  let offset = 0

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative size-36 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          {slices.map((slice, index) => {
            const length = (slice.value / sum) * CIRCUMFERENCE
            const dash = Math.max(0, length - GAP)
            const circle = (
              <circle
                key={slice.key}
                cx={50}
                cy={50}
                r={RADIUS}
                fill="none"
                strokeWidth={active === index ? 17 : 14}
                stroke={colorOf(slice, index)}
                strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                strokeDashoffset={-offset}
                className="cursor-pointer transition-[stroke-width]"
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                onClick={() => setActive(active === index ? null : index)}
              />
            )
            offset += length
            return circle
          })}
        </svg>
        {/* The hole answers instead of a bubble: the slice's own number where
            the total was, so nothing overlaps the ring and no name has to be
            cut to fit — the legend row lighting up says which slice it is. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tracking-tight text-ink">
            {active === null ? total : slices[active].caption}
          </span>
          <span className="text-xs text-muted-foreground">
            {active === null ? totalLabel : `${slices[active].pct}%`}
          </span>
        </div>
      </div>

      {/* Wide enough for a course name, and the whole legend drops under the
          ring rather than squeezing one: a cut-off name is the one thing a
          legend cannot afford, since it is what carries identity. */}
      <ul className="flex min-w-52 flex-1 flex-col gap-0.5">
        {slices.map((slice, index) => (
          <li key={slice.key}>
            <button
              type="button"
              aria-label={slice.hint}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(active === index ? null : index)}
              className={`flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left text-sm outline-none transition ${
                active === index ? 'bg-sky' : ''
              }`}
            >
              <span
                aria-hidden="true"
                className="mt-1.5 size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: colorOf(slice, index) }}
              />
              <span className="min-w-0 flex-1 leading-snug text-ink">
                {slice.label}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-muted-foreground">
                {`${slice.pct}%`}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function colorOf(slice: DonutSlice, index: number): string {
  return slice.others ? OTHERS_COLOR : CATEGORICAL[index % CATEGORICAL.length]
}

/**
 * Card header shared by every chart. The hint is optional and stays out unless
 * it says something the chart cannot: a scale, an axis and a legend already
 * explain most of them. When there is one it hides behind a ? next to the
 * title rather than sitting under it — a sentence under every card turns a
 * page of charts back into a page of text.
 */
export function ChartHeading({
  title,
  hint,
  hintLabel,
}: {
  title: string
  hint?: ReactNode
  /** Accessible name for the ? button. Arrives translated (i18n hard rule). */
  hintLabel?: string
}) {
  // Controlled instead of Radix's default hover-only: on a touch screen there
  // is no hover, and a legend nobody can reach is worse than no legend.
  const [open, setOpen] = useState(false)
  return (
    <div className="flex items-center gap-1.5">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {hint && (
        <HintTooltip open={open} onOpenChange={setOpen}>
          <HintTooltipTrigger
            type="button"
            aria-label={hintLabel}
            onClick={() => setOpen((v) => !v)}
            className="text-muted-foreground transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-full"
          >
            <BoIcon name="help" size={14} />
          </HintTooltipTrigger>
          <HintTooltipContent side="top">{hint}</HintTooltipContent>
        </HintTooltip>
      )}
    </div>
  )
}
