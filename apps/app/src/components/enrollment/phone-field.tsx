'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  flagEmoji,
  formatNationalNumber,
  joinPhone,
  phoneHint,
  splitPhone,
} from '@/lib/geo'

/**
 * A phone, in the same shape the backoffice collects it: a flag and a dial code
 * from a list, then the local number, grouped the way the chosen country writes
 * it.
 *
 * The behaviour and every rule behind it live in `lib/geo` and in
 * `components/backoffice/phone-field.tsx` — this is that field wearing the
 * checkout's clothes. It is a copy of the markup, not of the logic: the two
 * surfaces size and colour their inputs differently and pull labels from
 * different namespaces, and importing the panel's component into the one page
 * a stranger opens would drag the backoffice's i18n namespace onto it.
 *
 * Grouping happens on blur, never on every keystroke: rewriting the value under
 * a caret that is mid-string sends it to the end, and a field that jumps while
 * you fix a digit is worse than one that tidies up a moment later.
 */
export function PhoneField({
  id,
  value,
  onChange,
  invalid = false,
}: {
  id: string
  /** The single stored string, dial code included. */
  value: string
  onChange: (phone: string) => void
  invalid?: boolean
}) {
  const t = useTranslations('enrollment')
  const [country, setCountry] = useState(
    () => splitPhone(value, DEFAULT_COUNTRY).country,
  )
  const [number, setNumber] = useState(() => splitPhone(value).number)

  const base =
    'rounded-lg border bg-white px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted-foreground/70 focus:ring-2'
  const tone = invalid
    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15'
    : 'border-line focus:border-brand-blue focus:ring-brand-blue/15'

  function set(nextCountry: string, nextNumber: string) {
    setCountry(nextCountry)
    setNumber(nextNumber)
    onChange(joinPhone(nextCountry, nextNumber))
  }

  return (
    <span className="flex gap-2">
      <select
        value={country}
        onChange={(event) =>
          // Regroup what is already typed for the new country: a Peruvian
          // `951 220 447` read as Brazilian is `95 12204 47`, and showing that
          // is the field saying the number is short there.
          set(event.target.value, formatNationalNumber(event.target.value, number))
        }
        aria-label={t('field.dial_code')}
        className={`${base} ${tone} w-28 shrink-0`}
      >
        {COUNTRIES.map((item) => (
          <option key={item.code} value={item.code}>
            {`${flagEmoji(item.code)} ${item.dial}`}
          </option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={number}
        aria-invalid={invalid || undefined}
        onChange={(event) => set(country, event.target.value)}
        onBlur={() => set(country, formatNationalNumber(country, number))}
        placeholder={phoneHint(country)}
        className={`${base} ${tone} min-w-0 flex-1`}
      />
    </span>
  )
}
