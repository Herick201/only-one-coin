'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type {
  CheckoutDraft,
  PublicCatalog,
  StepId,
} from '@/lib/enrollment/types'
import { clearCheckoutStorage, useCheckout } from '@/lib/enrollment/use-checkout'
import { Stepper } from '@/components/enrollment/stepper'
import { HoldTimer } from '@/components/enrollment/hold-timer'
import { StepCourse } from './step-course'
import { StepStudent } from './step-student'
import { StepPayment } from './step-payment'
import { StepReview } from './step-review'
import { Submitted } from './submitted'

/**
 * The public checkout — one wizard, two ways in.
 *
 * Somebody arriving from the landing picks a course; somebody arriving on the
 * seller's link (`?course=…&group=…&src=whatsapp`) finds step 1 already
 * answered and starts at step 2. It is deliberately not two screens: that would
 * be the enrollment form maintained twice, diverging at the first new field,
 * and the channel metric it would buy is bought instead by one attribution
 * field (`docs/MATRICULA-CHECKOUT.md` §1).
 *
 * Everything here is mockup state. The write is a usecase in `packages/domain`
 * behind `apps/api`, never the browser (`CLAUDE.md` §8).
 */
export function Checkout({
  catalog,
  initialDraft,
}: {
  catalog: PublicCatalog
  initialDraft: CheckoutDraft
}) {
  const t = useTranslations('enrollment')
  const [reference, setReference] = useState<string | null>(null)

  const {
    draft,
    setDraft,
    step,
    goTo,
    holdSecondsLeft,
    holdExpired,
    startHold,
    settleHold,
  } = useCheckout(catalog, initialDraft)

  const stepLabels: Record<StepId, string> = {
    course: t('step.course.short'),
    student: t('step.student.short'),
    payment: t('step.payment.short'),
    review: t('step.review.short'),
  }

  function leaveCourseStep() {
    // The seat is taken the moment the class group is settled — before the
    // money, on purpose. The reader is about to be sent to their banking app,
    // and coming back to a full class group has no remedy in a business with
    // no refund flow (`docs/MATRICULA-CHECKOUT.md` §3).
    if (draft.course.classGroupId) startHold(draft.course.classGroupId)
    goTo('student')
  }

  function submit() {
    // Proof is in: the short clock stops and the five-day review window takes
    // over. The seat stays `reserved` — it becomes `confirmed` only when the
    // payment is approved (`CLAUDE.md` §5).
    settleHold()
    setReference(referenceFrom(draft))
    clearCheckoutStorage()
    window.scrollTo({ top: 0 })
  }

  if (reference) {
    return (
      <Shell>
        <Submitted catalog={catalog} draft={draft} reference={reference} />
      </Shell>
    )
  }

  return (
    <Shell>
      <Stepper
        current={step}
        labels={stepLabels}
        positionLabel={t('step.position', {
          current: ['course', 'student', 'payment', 'review'].indexOf(step) + 1,
          total: 4,
        })}
      />

      {holdSecondsLeft !== null && (
        <div className="mb-5">
          <HoldTimer
            secondsLeft={holdSecondsLeft}
            label={t('hold.active')}
            timeLabel={t('hold.remaining', {
              minutes: Math.floor(holdSecondsLeft / 60),
              seconds: holdSecondsLeft % 60,
            })}
          />
        </div>
      )}

      {step === 'course' && (
        <StepCourse
          catalog={catalog}
          draft={draft}
          setDraft={setDraft}
          onContinue={leaveCourseStep}
          holdExpired={holdExpired}
        />
      )}

      {step === 'student' && (
        <StepStudent
          catalog={catalog}
          draft={draft}
          setDraft={setDraft}
          onBack={() => goTo('course')}
          onContinue={() => goTo('payment')}
        />
      )}

      {step === 'payment' && (
        <StepPayment
          catalog={catalog}
          draft={draft}
          setDraft={setDraft}
          onBack={() => goTo('student')}
          onContinue={() => goTo('review')}
        />
      )}

      {step === 'review' && (
        <StepReview
          catalog={catalog}
          draft={draft}
          onEdit={goTo}
          onBack={() => goTo('payment')}
          onSubmit={submit}
        />
      )}
    </Shell>
  )
}

/**
 * `@container/checkout` names the reading column so the stepper can collapse on
 * the space it actually got rather than on the window width (`CLAUDE.md` §5,
 * "Layout das telas").
 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="@container/checkout mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      {children}
    </div>
  )
}

/**
 * Placeholder handle for the mockup. The real one is issued by `apps/api` at
 * submit and is a readable reference, not a row id (`CLAUDE.md` §4).
 */
function referenceFrom(draft: CheckoutDraft): string {
  const digits = draft.student.nationalId.replace(/\D/g, '').slice(-4).padStart(4, '0')
  return `OOC-${new Date().getFullYear()}-${digits}`
}
