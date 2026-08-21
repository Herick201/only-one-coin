import type { InputHTMLAttributes, ReactNode } from 'react'
import { CheckoutIcon, type CheckoutIconName } from './icons'

/**
 * Presentational primitives for the public checkout. Like the portal's, they
 * never hold copy — every label arrives already translated (`CLAUDE.md` §4).
 *
 * Sizing follows the column, not the window (`CLAUDE.md` §5, "Layout das
 * telas"). The checkout has no sidebar, but it is capped at a reading width and
 * sits inside a `@container/checkout`, so a card row wraps on the space it
 * actually got.
 */

export function Card({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'li' | 'form'
}) {
  return (
    <Tag className={`rounded-2xl border border-line bg-white shadow-card ${className}`}>
      {children}
    </Tag>
  )
}

export function StepHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string
  title: string
  subtitle?: string
}) {
  return (
    <header className="mb-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
        {eyebrow}
      </p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
      )}
    </header>
  )
}

export function FieldGroup({
  label,
  error,
  hint,
  htmlFor,
  children,
}: {
  label: string
  error?: string
  hint?: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
          <CheckoutIcon name="alert" size={14} />
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}

const inputBase =
  'w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted-foreground/70 focus:ring-2'

export function TextInput({
  invalid = false,
  className = '',
  ...props
}: { invalid?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={`${inputBase} ${
        invalid
          ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15'
          : 'border-line focus:border-brand-blue focus:ring-brand-blue/15'
      } ${className}`}
    />
  )
}

export function SelectInput({
  invalid = false,
  className = '',
  children,
  ...props
}: {
  invalid?: boolean
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      aria-invalid={invalid || undefined}
      className={`${inputBase} ${
        invalid
          ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15'
          : 'border-line focus:border-brand-blue focus:ring-brand-blue/15'
      } ${className}`}
    >
      {children}
    </select>
  )
}

/**
 * A pickable option — a language, a course, a class group, a payment rail.
 * A real `<button>` rather than a styled `<div>`: the whole first step is
 * keyboard-reachable or it is not usable on a slow phone with a cheap keyboard.
 */
export function ChoiceCard({
  selected,
  disabled = false,
  onSelect,
  title,
  meta,
  aside,
  children,
}: {
  selected: boolean
  disabled?: boolean
  onSelect: () => void
  title: string
  meta?: string
  aside?: ReactNode
  children?: ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full min-w-0 flex-col gap-1 rounded-xl border p-4 text-left transition ${
        disabled
          ? 'cursor-not-allowed border-line bg-sky-soft opacity-60'
          : selected
            ? 'border-brand-blue bg-sky ring-2 ring-brand-blue/20'
            : 'border-line bg-white hover:border-brand-blue/50 hover:bg-sky-soft'
      }`}
    >
      <span className="flex w-full items-start justify-between gap-3">
        <span className="min-w-0 text-sm font-semibold text-ink">{title}</span>
        {aside}
      </span>
      {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
      {children}
    </button>
  )
}

export type NoteTone = 'info' | 'warning' | 'danger' | 'success'

const noteStyles: Record<NoteTone, string> = {
  info: 'border-brand-blue/20 bg-sky text-brand-blue-deep',
  warning: 'border-brand-yellow-deep/25 bg-brand-yellow/10 text-ink',
  danger: 'border-red-600/20 bg-red-50 text-red-800',
  success: 'border-emerald-600/20 bg-emerald-50 text-emerald-800',
}

const noteIcons: Record<NoteTone, CheckoutIconName> = {
  info: 'alert',
  warning: 'alert',
  danger: 'alert',
  success: 'check',
}

export function Note({
  tone,
  children,
}: {
  tone: NoteTone
  children: ReactNode
}) {
  return (
    <p
      className={`flex items-start gap-2 rounded-xl border px-3.5 py-3 text-sm ${noteStyles[tone]}`}
    >
      <CheckoutIcon name={noteIcons[tone]} size={16} className="mt-0.5 shrink-0" />
      <span className="min-w-0">{children}</span>
    </p>
  )
}

export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand-blue-deep disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
    >
      {children}
    </button>
  )
}

export function GhostButton({
  children,
  onClick,
}: {
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-sky hover:text-ink"
    >
      {children}
    </button>
  )
}

/** Label / value row used by the price panel and the final review. */
export function SummaryRow({
  label,
  children,
  strong = false,
}: {
  label: string
  children: ReactNode
  strong?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd
        className={`min-w-0 text-right ${
          strong ? 'text-base font-bold text-ink' : 'text-sm font-medium text-ink'
        }`}
      >
        {children}
      </dd>
    </div>
  )
}
