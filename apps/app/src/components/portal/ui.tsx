import type { ReactNode } from 'react'

/**
 * Presentational portal primitives. They never hold UI copy — every label is
 * passed in already translated by the caller (i18n hard rule, CLAUDE.md §4).
 */

export type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

const toneClasses: Record<Tone, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  warning: 'bg-brand-yellow/15 text-brand-yellow-deep ring-brand-yellow-deep/20',
  danger: 'bg-red-50 text-red-700 ring-red-600/15',
  neutral: 'bg-sky text-muted-foreground ring-ink/10',
  info: 'bg-sky text-brand-blue-deep ring-brand-blue/20',
}

const dotClasses: Record<Tone, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-brand-yellow-deep',
  danger: 'bg-red-500',
  neutral: 'bg-muted',
  info: 'bg-brand-blue',
}

export function StatusBadge({
  tone,
  label,
  dot = false,
}: {
  tone: Tone
  label: string
  /** Off by default — the colored pill already says it; the dot reads as boilerplate. */
  dot?: boolean
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${toneClasses[tone]}`}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full ${dotClasses[tone]}`} />
      )}
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
    <Tag
      className={`rounded-2xl border border-line bg-white shadow-card ${className}`}
    >
      {children}
    </Tag>
  )
}

export function PageHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        {title}
      </h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </header>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-lg font-semibold text-ink">{children}</h2>
  )
}

/** Label / value stack used across enrollment + profile. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-ink">{children}</dd>
    </div>
  )
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div>
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>{label}</span>
          <span className="text-ink">{clamped}%</span>
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-sky"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-brand-blue transition-[width]"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}

export function EmptyState({
  title,
  body,
  icon,
}: {
  title: string
  body: string
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-sky-soft px-6 py-14 text-center">
      {icon && (
        <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-brand-blue shadow-card">
          {icon}
        </div>
      )}
      <p className="text-lg font-semibold text-ink">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
    </div>
  )
}
