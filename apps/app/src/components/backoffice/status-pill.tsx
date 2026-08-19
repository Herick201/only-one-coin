import type { Tone } from './ui'
import { Badge } from '@/components/ui/badge'

/**
 * Domain status shown as a shadcn Badge. The library ships four variants; the
 * backoffice needs a tone per domain state, so the palette lives here (one
 * place) instead of in each screen. Never holds copy — `label` arrives
 * translated (CLAUDE.md §4).
 */

const toneClasses: Record<Tone, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
  danger: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15',
  neutral: 'bg-secondary text-muted-foreground ring-1 ring-inset ring-border',
  info: 'bg-sky text-brand-blue-deep ring-1 ring-inset ring-brand-blue/20',
}

const dotClasses: Record<Tone, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  neutral: 'bg-slate-400',
  info: 'bg-brand-blue',
}

/** Bar fill per tone — used by the seat meter. */
export const toneBar: Record<Tone, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  neutral: 'bg-slate-400',
  info: 'bg-brand-blue',
}

export function StatusPill({
  tone,
  label,
  dot = true,
}: {
  tone: Tone
  label: string
  dot?: boolean
}) {
  return (
    <Badge className={`gap-1.5 font-semibold ${toneClasses[tone]}`}>
      {dot && <span className={`size-1.5 rounded-full ${dotClasses[tone]}`} />}
      {label}
    </Badge>
  )
}
