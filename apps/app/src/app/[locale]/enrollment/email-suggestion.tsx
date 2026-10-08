'use client'

import { useTranslations } from 'next-intl'
import { suggestEmailDomain } from '@ooc/domain/fields'

/** "Did you mean …@gmail.com?" — one click fixes the domain typo. Never a
 * refusal: the list is short on purpose (fields.ts, suggestEmailDomain). */
export function EmailSuggestion({ email, onApply }: { email: string; onApply: (email: string) => void }) {
  const t = useTranslations('enrollment')
  const suggestion = suggestEmailDomain(email)
  if (!suggestion) return null
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-ink">
      <span>{t('step.student.email_suggestion', { email: suggestion })}</span>
      <button
        type="button"
        onClick={() => onApply(suggestion)}
        className="inline-flex min-h-tap items-center font-semibold text-brand-blue underline underline-offset-2"
      >
        {t('step.student.email_suggestion_apply')}
      </button>
    </p>
  )
}
