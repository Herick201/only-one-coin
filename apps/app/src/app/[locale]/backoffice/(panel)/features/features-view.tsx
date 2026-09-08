'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, SectionTitle } from '@/components/backoffice/ui'
import { Toast } from '@/components/backoffice/controls'
import { BoIcon } from '@/components/backoffice/icons'

export interface FlagRow {
  key: string
  surface: 'portal' | 'backoffice' | 'teacher'
  parent: string | null
  envVar: string
  codeDefault: boolean
  envValue: 'on' | 'off' | null
  override: { enabled: boolean; byName: string | null; at: string } | null
  /** What this flag alone resolves to, before its parent has a say. */
  own: boolean
  /** What a reader actually gets — the parent chain applied. */
  effective: boolean
  source: 'env' | 'panel' | 'environment' | 'code'
}

const SURFACES = ['portal', 'backoffice', 'teacher'] as const

/**
 * A flag key is `portal.payments`; a translation key cannot be, or `portal`
 * would have to be both a leaf and a branch of the same message tree.
 */
function messageKey(key: string): string {
  return key.replace(/\./g, '_')
}

/**
 * The switchboard.
 *
 * Two states are shown per flag and they are not the same thing: what the flag
 * itself says (the switch), and what a reader actually gets once its parent
 * has had a say. A section can be on and invisible because the surface above
 * it is off — printing only the second would make the switch look broken, and
 * only the first would be a lie.
 */
export function FeaturesView({
  rows,
  appEnv,
  unlocked,
}: {
  rows: FlagRow[]
  appEnv: string
  unlocked: boolean
}) {
  const t = useTranslations('bo')
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  async function write(key: string, enabled: boolean | null) {
    setPending(key)
    try {
      const response = await fetch(`/api/v1/feature-flags/${key}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })

      if (!response.ok) {
        setToast(t('features.write_failed'))
        return
      }

      setToast(
        enabled === null
          ? t('features.reset_done')
          : enabled
            ? t('features.turned_on')
            : t('features.turned_off'),
      )
      /* The rail, the badges and every gate on the screen read the same flags,
         so the whole panel is re-rendered rather than this list patched. */
      router.refresh()
    } catch {
      setToast(t('features.write_failed'))
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {appEnv !== 'production' && (
        <Notice icon="alert">{t('features.not_production', { env: appEnv })}</Notice>
      )}
      {unlocked && <Notice icon="eye">{t('features.internal_unlock')}</Notice>}

      {SURFACES.map((surface) => {
        const items = rows.filter((row) => row.surface === surface)
        if (items.length === 0) return null

        return (
          <section key={surface} className="flex flex-col gap-3">
            <SectionTitle>{t(`features.surface.${surface}`)}</SectionTitle>
            <Card className="divide-y divide-line">
              {items.map((row) => (
                <FlagRowItem
                  key={row.key}
                  row={row}
                  busy={pending === row.key}
                  disabled={pending !== null}
                  onToggle={(next) => write(row.key, next)}
                  onReset={() => write(row.key, null)}
                />
              ))}
            </Card>
          </section>
        )
      })}

      <Notice icon="help">{t('features.footnote')}</Notice>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}

function Notice({
  icon,
  children,
}: {
  icon: 'alert' | 'eye' | 'help'
  children: React.ReactNode
}) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-dashed border-line bg-sky-soft px-3 py-2 text-xs leading-relaxed text-muted-foreground">
      <BoIcon name={icon} size={14} className="mt-0.5 shrink-0" />
      {children}
    </p>
  )
}

function FlagRowItem({
  row,
  busy,
  disabled,
  onToggle,
  onReset,
}: {
  row: FlagRow
  busy: boolean
  disabled: boolean
  onToggle: (next: boolean) => void
  onReset: () => void
}) {
  const t = useTranslations('bo')

  /* An env var is the deploy's own word and outranks this screen (CLAUDE.md
     §5) — the switch says so instead of pretending it can move. */
  const lockedByEnv = row.envValue !== null
  /* On but invisible: the surface above it is off. */
  const hiddenByParent = row.own && !row.effective

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 p-4">
      <div className="flex min-w-64 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ink">
            {t(`features.flag.${messageKey(row.key)}`)}
          </span>
          <code className="rounded bg-sky-soft px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            {row.key}
          </code>
        </span>

        <span className="text-xs leading-relaxed text-muted-foreground">
          {t(`features.source.${row.source}`, { envVar: row.envVar })}
          {row.override && (
            <>
              {' · '}
              {t('features.changed_by', {
                who: row.override.byName ?? t('features.removed_account'),
              })}
            </>
          )}
        </span>

        {hiddenByParent && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-brand-blue">
            <BoIcon name="alert" size={13} />
            {t('features.hidden_by_parent')}
          </span>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {row.override && !lockedByEnv && (
          <button
            type="button"
            disabled={disabled}
            onClick={onReset}
            className="min-h-tap rounded-lg border border-line px-3 text-xs font-semibold text-muted-foreground transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('features.reset', { value: t(row.codeDefault ? 'features.on' : 'features.off') })}
          </button>
        )}

        <Switch
          checked={row.own}
          disabled={disabled || lockedByEnv}
          busy={busy}
          label={t(`features.flag.${messageKey(row.key)}`)}
          lockedHint={lockedByEnv ? t('features.locked_by_env', { envVar: row.envVar }) : null}
          onChange={onToggle}
        />
      </div>
    </div>
  )
}

/**
 * Written by hand rather than pulled in: the panel has no switch primitive
 * yet, and a `role="switch"` button is the whole of one. 44px of touch target,
 * because the coordination turns these from a phone like everything else
 * (CLAUDE.md §5, celular).
 */
function Switch({
  checked,
  disabled,
  busy,
  label,
  lockedHint,
  onChange,
}: {
  checked: boolean
  disabled: boolean
  busy: boolean
  label: string
  lockedHint: string | null
  onChange: (next: boolean) => void
}) {
  return (
    <span className="flex items-center gap-2">
      {lockedHint && (
        <span className="max-w-40 text-right text-[11px] leading-tight text-muted-foreground">
          {lockedHint}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex min-h-tap w-14 shrink-0 items-center rounded-full px-1 transition disabled:cursor-not-allowed disabled:opacity-40 ${
          checked ? 'bg-brand-blue' : 'bg-line'
        }`}
      >
        <span
          className={`grid size-6 place-items-center rounded-full bg-white shadow-card transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        >
          {busy && <BoIcon name="spinner" size={12} className="animate-spin text-brand-blue" />}
        </span>
      </button>
    </span>
  )
}
