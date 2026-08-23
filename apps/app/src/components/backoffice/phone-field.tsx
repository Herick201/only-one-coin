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

const fieldClass =
  'rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted-foreground focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15'

/**
 * Whether a stored phone carries an actual number, or only the dial code the
 * field starts out with. `joinPhone('PE', '')` is `"+51"`, which is not a phone
 * — every form that requires one has to ask this, not `phone !== ''`.
 */
export function hasPhoneNumber(phone: string): boolean {
  return splitPhone(phone).number.trim() !== ''
}

/**
 * A phone, as the institution actually receives them: a flag and a dial code
 * picked from a list, then the local number. Roughly a fifth of the people on
 * file are not in Peru — teachers hired abroad, students who moved — and a bare
 * text box gets "+51", "51", "0051" and nothing at all typed into it, which is
 * four formats to reconcile later against zero the field could have prevented.
 *
 * The split is the component's; the caller keeps one string, which is what the
 * domain stores (`joinPhone`). The dial code is seeded from the stored value on
 * mount and then belongs to whoever is typing — it does not chase the address
 * country around, because a field that rewrites itself while you fill the form
 * reads as a bug.
 *
 * The number is grouped the way the chosen country writes it, and the empty
 * field shows that shape in zeros. Changing the dial code regroups what is
 * already typed: a Peruvian `951 220 447` switched to Brazil becomes
 * `95 12204 47`, which is the honest reading of those digits there — the field
 * is telling you the number is short for Brazil, not silently keeping a shape
 * that no longer applies.
 *
 * Grouping happens on blur and on a country change, never on every keystroke:
 * rewriting the value under a caret that is mid-string sends it to the end, and
 * a field that jumps while you correct a digit is worse than one that tidies up
 * a moment later.
 */
export function PhoneField({
  value,
  onChange,
  required = false,
}: {
  /** The single stored string, dial code included. */
  value: string
  onChange: (phone: string) => void
  required?: boolean
}) {
  const t = useTranslations('bo')
  const [country, setCountry] = useState(
    () => splitPhone(value, DEFAULT_COUNTRY).country,
  )
  const [number, setNumber] = useState(() => splitPhone(value).number)

  function set(nextCountry: string, nextNumber: string) {
    setCountry(nextCountry)
    setNumber(nextNumber)
    onChange(joinPhone(nextCountry, nextNumber))
  }

  function pickCountry(next: string) {
    set(next, formatNationalNumber(next, number))
  }

  return (
    <span className="flex gap-2">
      <select
        value={country}
        onChange={(event) => pickCountry(event.target.value)}
        aria-label={t('student_file.field_dial_code')}
        className={`${fieldClass} w-28 shrink-0`}
      >
        {COUNTRIES.map((item) => (
          <option key={item.code} value={item.code}>
            {`${flagEmoji(item.code)} ${item.dial}`}
          </option>
        ))}
      </select>
      <input
        type="tel"
        inputMode="tel"
        value={number}
        onChange={(event) => set(country, event.target.value)}
        onBlur={() => set(country, formatNationalNumber(country, number))}
        placeholder={phoneHint(country)}
        required={required}
        className={`${fieldClass} min-w-0 flex-1`}
      />
    </span>
  )
}
