'use client'

import { useTranslations } from 'next-intl'
import { Card, DotGrid, PrimaryButton } from '@/components/enrollment/ui'
import { CheckoutIcon } from '@/components/enrollment/icons'

/**
 * The hold ran out, and the attempt is over.
 *
 * A screen of its own rather than a warning above a half-filled form. The seat
 * has gone back to the class group and everything typed has been discarded, so
 * leaving the form standing would be offering a wizard that no longer holds
 * anything — the reader would fill it in again anyway, only later and more
 * annoyed.
 *
 * The one thing it must not do is dead-end somebody who **already paid** and
 * came back late. That person's money is out and they have no enrolment, which
 * no button on this page can fix — so the copy points them at the help channel
 * explicitly, and the WhatsApp button in the footer is the way there.
 */
export function Expired({ onRestart }: { onRestart: () => void }) {
  const t = useTranslations('enrollment')

  return (
    <Card className="relative overflow-hidden p-6 text-center sm:p-10">
      <DotGrid className="-bottom-6 -right-6" />
      <span className="relative mx-auto grid size-16 place-items-center rounded-full bg-red-50 text-red-600">
        <CheckoutIcon name="clock" size={32} />
      </span>

      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        {t('expired.title')}
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {t('expired.body')}
      </p>

      <div className="mt-6 flex justify-center">
        <PrimaryButton onClick={onRestart}>
          {t('expired.action')}
          <CheckoutIcon name="arrow-right" size={16} />
        </PrimaryButton>
      </div>

      {/* Somebody who paid and came back late cannot be helped by a fresh
          form. Say so here, where they are looking. */}
      <p className="mx-auto mt-6 max-w-md rounded-2xl border border-brand-yellow-deep/25 bg-brand-yellow/10 px-4 py-3 text-sm text-ink">
        {t('expired.already_paid')}
      </p>
    </Card>
  )
}
