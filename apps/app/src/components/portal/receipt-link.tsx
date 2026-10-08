'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Icon } from './icons'

/**
 * Opens the student's own receipt. The bucket is private, so there is no link
 * to render ahead of time: the click asks the API for a 5-minute URL scoped to
 * this student (`GET /portal/payments/:id/receipt`), and every opening lands
 * in the audit log (CLAUDE.md §8).
 *
 * The tab is opened before the request, inside the click itself — a tab
 * opened after an `await` is a popup to Safari on the iPhone, and blocked.
 */
export function ReceiptLink({ paymentId }: { paymentId: string }) {
  const t = useTranslations('portal')
  const [state, setState] = useState<'idle' | 'loading' | 'failed'>('idle')

  async function open() {
    const tab = window.open('', '_blank')
    if (tab) tab.opener = null
    setState('loading')
    try {
      const response = await fetch(
        `/api/v1/portal/payments/${encodeURIComponent(paymentId)}/receipt`,
      )
      if (!response.ok) throw new Error(`receipt ${response.status}`)
      const { url } = (await response.json()) as { url: string }
      if (tab) tab.location.href = url
      else window.location.href = url
      setState('idle')
    } catch {
      tab?.close()
      setState('failed')
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void open()}
        disabled={state === 'loading'}
        className="inline-flex min-h-tap items-center gap-1.5 text-xs font-semibold text-brand-blue transition hover:text-brand-blue-deep disabled:opacity-60"
      >
        <Icon name="doc" size={14} />
        {t('enrollments.view_receipt')}
      </button>
      {state === 'failed' && (
        <span role="alert" className="text-xs font-medium text-red-600">
          {t('enrollments.receipt_error')}
        </span>
      )}
    </span>
  )
}
