import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { BoIcon, type BoIconName } from './icons'

/**
 * Presentational backoffice primitives. They never hold UI copy — every label
 * arrives already translated from the caller (i18n hard rule, CLAUDE.md §4).
 *
 * Denser and more neutral than the portal set on purpose: this is a work tool
 * used all day, not the student-facing brand surface.
 */

export type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

/**
 * Filter bar above a table: a search field that takes the slack and controls
 * that wrap under it instead of squeezing. Wrapping is the breakpoint here —
 * it fires off the real width, not off a window size.
 */
export function Toolbar({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>{children}</div>
  )
}

/** Search field inside a `Toolbar`: grows into the slack, wraps before it starves. */
export const toolbarSearchClass = 'relative min-w-60 max-w-sm flex-1'

const toneClasses: Record<Tone, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  danger: 'bg-red-50 text-red-700 ring-red-600/15',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-500/15',
  info: 'bg-sky text-brand-blue-deep ring-brand-blue/20',
}

const dotClasses: Record<Tone, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  neutral: 'bg-slate-400',
  info: 'bg-brand-blue',
}

export function StatusBadge({
  tone,
  label,
  dot = true,
  title,
}: {
  tone: Tone
  label: string
  dot?: boolean
  /** Hover text for the rule behind the badge — never for the badge's meaning. */
  title?: string
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${toneClasses[tone]}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotClasses[tone]}`} />}
      {label}
    </span>
  )
}

export function Card({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'article' | 'li'
}) {
  return (
    <Tag className={`rounded-xl border border-line bg-white shadow-card ${className}`}>
      {children}
    </Tag>
  )
}

/**
 * The title of a screen, on its own. There used to be a line of support copy
 * under it on every page; it said what the section was to somebody who already
 * knew — the sidebar entry that got them here said the same thing — and it
 * pushed the work down the page on all of them.
 */
export function PageHeader({
  title,
  actions,
}: {
  title: string
  actions?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-72 flex-1">
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          {title}
        </h1>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}

export function SectionTitle({
  children,
  icon,
}: {
  children: ReactNode
  icon?: BoIconName
}) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {icon && <BoIcon name={icon} size={16} />}
      {children}
    </h2>
  )
}

/** Label / value stack used across the student file. */
export function Field({
  label,
  children,
  wrap = false,
}: {
  label: string
  children: ReactNode
  /**
   * Let the value run onto a second line. Off by default — a grid of fields
   * keeps its rhythm only while every cell is one line tall — and on for the
   * few values that are a sentence, like a street address, where a cut-off
   * ending is worse than an uneven row.
   */
  wrap?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-sm font-medium text-ink ${wrap ? 'break-words' : 'truncate'}`}
      >
        {children}
      </dd>
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'info',
}: {
  label: string
  value: string
  hint?: string
  icon: BoIconName
  tone?: Tone
}) {
  const iconTone: Record<Tone, string> = {
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-red-50 text-red-600',
    neutral: 'bg-slate-100 text-slate-500',
    info: 'bg-sky text-brand-blue',
  }
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${iconTone[tone]}`}
        >
          <BoIcon name={icon} size={18} />
        </span>
      </div>
    </Card>
  )
}

export function EmptyState({
  title,
  body,
  icon,
}: {
  title: string
  body: string
  icon?: BoIconName
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-sky-soft px-6 py-12 text-center">
      {icon && (
        <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-brand-blue shadow-card">
          <BoIcon name={icon} size={20} />
        </span>
      )}
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
    </div>
  )
}

/** Table shell — horizontal scroll is on the wrapper, never on the page. */
export function TableShell({
  children,
  fixed = false,
}: {
  children: ReactNode
  /**
   * Locks the column widths to the caller's `<colgroup>`. Auto layout sizes a
   * column by its widest cell, so a table whose rows appear and disappear —
   * anything folded — reflows its headers on every toggle.
   */
  fixed?: boolean
}) {
  return (
    // A table that does not fit has to say so. Overlay scrollbars stay hidden
    // until you already scrolled, so a clipped last column reads as a bug
    // rather than as "there is more to the right" — `scrollbar-width: thin`
    // keeps the track drawn.
    <div className="overflow-x-auto [scrollbar-width:thin]">
      <table
        className={`w-full min-w-[46rem] border-collapse text-left text-sm ${
          fixed ? 'table-fixed' : ''
        }`}
      >
        {children}
      </table>
    </div>
  )
}

export const thClass =
  'whitespace-nowrap border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground'
export const tdClass = 'border-b border-line/70 px-4 py-3 align-middle text-ink'

/**
 * The action that ends a table row — "open this one". Blue at rest so it reads
 * as the live thing on the line, amber the moment it is touched, because that
 * is the colour the panel uses for something waiting on a human.
 *
 * Shared rather than copied: two lists that send the reader to the same review
 * queue must not offer it as two different-looking controls.
 */
export const rowActionClass =
  'inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-line px-2.5 py-1.5 text-sm font-semibold text-brand-blue transition hover:border-brand-yellow hover:bg-cream hover:text-ink focus-visible:border-brand-yellow focus-visible:bg-cream focus-visible:text-ink active:border-brand-yellow active:bg-cream active:text-ink'

/** Small progress meter used for seat pressure. */
export function Meter({ value, max, tone }: { value: number; max: number; tone: Tone }) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100))
  const barTone: Record<Tone, string> = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    neutral: 'bg-slate-400',
    info: 'bg-brand-blue',
  }
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full rounded-full ${barTone[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

/**
 * Page control for long tables. Copy arrives translated from the caller (i18n
 * hard rule, CLAUDE.md §4) and the component owns no state: the page lives with
 * whoever slices the rows, so a filter change can reset it.
 */
export function Pager({
  page,
  pageCount,
  status,
  prevLabel,
  nextLabel,
  onChange,
}: {
  /** Zero-based. */
  page: number
  pageCount: number
  status: string
  prevLabel: string
  nextLabel: string
  onChange: (page: number) => void
}) {
  const button =
    'inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-muted-foreground transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-muted-foreground'
  return (
    <nav className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
      <span className="text-xs text-muted-foreground">{status}</span>
      <span className="flex items-center gap-2">
        <button
          type="button"
          className={button}
          disabled={page <= 0}
          onClick={() => onChange(page - 1)}
        >
          <BoIcon name="chevron-down" size={14} className="rotate-90" />
          {prevLabel}
        </button>
        <button
          type="button"
          className={button}
          disabled={page >= pageCount - 1}
          onClick={() => onChange(page + 1)}
        >
          {nextLabel}
          <BoIcon name="chevron-down" size={14} className="-rotate-90" />
        </button>
      </span>
    </nav>
  )
}

/** Banner reminding that the screen is a mock with no backend behind it. */
export function MockNotice({ label }: { label: string }) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-dashed border-line bg-sky-soft px-3 py-2 text-xs text-muted-foreground">
      <BoIcon name="alert" size={14} className="mt-0.5 shrink-0" />
      {label}
    </p>
  )
}

/**
 * The mark that says a field has to be filled in. An asterisk carries no
 * meaning on its own — a screen reader announces "star" — so the word rides
 * along invisibly, translated like everything else (CLAUDE.md §4).
 */
export function RequiredMark({ label }: { label: string }) {
  return (
    <>
      <span aria-hidden="true" className="ml-0.5 text-red-500">
        *
      </span>
      <span className="sr-only">{` ${label}`}</span>
    </>
  )
}

/**
 * Its counterpart, spelled out rather than marked: on a form where nearly
 * everything is required, the exception is what needs saying.
 */
export function OptionalMark({ label }: { label: string }) {
  return (
    <span className="ml-1 font-normal normal-case text-muted-foreground">
      {`(${label})`}
    </span>
  )
}
