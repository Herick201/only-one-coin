import type { ReactNode } from 'react'
import { BoIcon, type BoIconName } from './icons'

/**
 * Presentational backoffice primitives. They never hold UI copy — every label
 * arrives already translated from the caller (i18n hard rule, CLAUDE.md §4).
 *
 * Denser and more neutral than the portal set on purpose: this is a work tool
 * used all day, not the student-facing brand surface.
 */

export type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

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
}: {
  tone: Tone
  label: string
  dot?: boolean
}) {
  return (
    <span
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

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
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
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-ink">{children}</dd>
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
export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  )
}

export const thClass =
  'whitespace-nowrap border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground'
export const tdClass = 'border-b border-line/70 px-4 py-3 align-middle text-ink'

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
