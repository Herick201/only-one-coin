'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CheckoutDraft, PublicCatalog, SeatHold, StepId } from './types'
import { STEP_ORDER } from './types'
import { groupById, hasSeat } from './checkout'

/**
 * Where a half-filled checkout survives a reload. `sessionStorage`, not
 * `localStorage`: the draft carries a document number and a birth date, and a
 * shared machine in a cabina should not hand the next person the previous
 * person's form. Closing the tab is meant to end it.
 */
const DRAFT_KEY = 'ooc.enrollment.draft'
const HOLD_KEY = 'ooc.enrollment.hold'

/** How often the countdown redraws. One second — it is a clock on screen. */
const TICK_MS = 1000

type StoredDraft = Omit<CheckoutDraft, 'payment'> & {
  payment: Omit<CheckoutDraft['payment'], 'receipt'> & {
    receipt: { fileName: string; sizeBytes: number } | null
  }
}

function readStored<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    // A private-mode browser that refuses storage costs the reader their
    // draft on reload; it must never cost them the page.
    return null
  }
}

function writeStored(key: string, value: unknown): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* see readStored */
  }
}

function clearStored(key: string): void {
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    /* see readStored */
  }
}

export interface CheckoutController {
  draft: CheckoutDraft
  setDraft: (next: CheckoutDraft | ((prev: CheckoutDraft) => CheckoutDraft)) => void
  step: StepId
  goTo: (step: StepId) => void
  /** Seconds left on the checkout hold, or null when no seat is held. */
  holdSecondsLeft: number | null
  /** True from the moment a hold ran out until the reader picks again. */
  holdExpired: boolean
  startHold: (classGroupId: string) => void
  releaseHold: () => void
  /** Freezes the hold once the receipt is in — the 5-day clock takes over. */
  settleHold: () => void
}

/**
 * The wizard's state: the draft, the step and the seat hold.
 *
 * Two things it is careful about.
 *
 * The **draft persists** (Sessão 20 of the roadmap): step 3 sends the reader
 * out to their banking app, and on a phone that often means the tab is
 * reloaded on return. Losing twenty fields at that exact moment is losing the
 * enrollment.
 *
 * The **hold is the server's**, not this hook's. Here it is simulated for the
 * mockup, and the countdown on screen is comfort — when this talks to
 * `apps/api`, `expiresAt` arrives from the seat reservation and expiry is
 * decided there. A clock the client owns is a clock the client can stop
 * (`docs/MATRICULA-CHECKOUT.md` §3).
 */
export function useCheckout(
  catalog: PublicCatalog,
  initialDraft: CheckoutDraft,
): CheckoutController {
  const [draft, setDraftState] = useState<CheckoutDraft>(initialDraft)
  const [step, setStep] = useState<StepId>(
    initialDraft.course.classGroupId ? 'student' : 'course',
  )
  const [hold, setHold] = useState<SeatHold | null>(null)
  const [now, setNow] = useState<number | null>(null)
  const [holdExpired, setHoldExpired] = useState(false)
  const [restored, setRestored] = useState(false)
  const bootstrapped = useRef(false)
  /** The arrival as the server resolved it — frozen at first render. */
  const arrival = useRef(initialDraft)

  /**
   * Restore after mount, never during render: the server rendered the arrival
   * draft, and reading storage while rendering hands React a different tree
   * than the HTML it is hydrating.
   *
   * The merge is where the two ways in meet. A stored draft is somebody's
   * unfinished session in this tab; the URL is what they just clicked. When
   * both have an opinion about the course, **the link wins** — opening a
   * seller's link and landing on the course you abandoned an hour ago is worse
   * than losing a half-made choice. Everything the link says nothing about
   * (name, document, receipt) is restored as it was.
   */
  useEffect(() => {
    const incoming = arrival.current
    const stored = readStored<StoredDraft>(DRAFT_KEY)
    const linkChose = incoming.course.courseId !== null

    if (stored) {
      const course = linkChose ? incoming.course : stored.course
      setDraftState({
        ...stored,
        course,
        // The object URL from the previous page life is dead; the file
        // description survives so the reader sees what they attached.
        payment: {
          ...stored.payment,
          receipt: stored.payment.receipt
            ? { ...stored.payment.receipt, previewUrl: null }
            : null,
        },
        // The link that brought them here decided the channel, and a reload is
        // not a new arrival — the restored value wins over the fresh one only
        // when the fresh one is the default.
        source: incoming.source === 'web' ? stored.source : incoming.source,
        campaign:
          Object.keys(incoming.campaign).length > 0
            ? incoming.campaign
            : stored.campaign,
      })
      // The invariant that keeps the wizard coherent: no step past the first
      // without a class group behind it. Everything downstream reads the class
      // group for the price, the schedule and the seat.
      setStep(course.classGroupId ? 'student' : 'course')
    }

    const storedHold = readStored<SeatHold>(HOLD_KEY)
    // A hold that belongs to a class group nobody is buying any more is not a
    // hold — it is a countdown against the wrong seat.
    if (storedHold) {
      const target = linkChose
        ? incoming.course.classGroupId
        : (stored?.course.classGroupId ?? null)
      if (storedHold.classGroupId === target) setHold(storedHold)
      else clearStored(HOLD_KEY)
    }

    setNow(Date.now())
    setRestored(true)
  }, [])

  /**
   * Persist — but never before the restore has actually landed in state.
   *
   * Gating this on a ref was a bug with teeth. Effects run in declaration
   * order within one commit, so the restore effect flipped the ref and queued
   * `setDraftState(stored)`, and then THIS effect ran in the same commit with
   * `draft` still holding the empty initial value — writing the empty draft
   * over the good one. A second remount before the corrective write (a locale
   * switch does exactly that) then read the emptied draft back.
   *
   * `restored` is state, not a ref: the first render where it is true is the
   * render where `draft` is already the restored one.
   */
  useEffect(() => {
    if (restored) writeStored(DRAFT_KEY, draft)
  }, [draft, restored])

  /** The countdown only runs while a seat is actually being held. */
  useEffect(() => {
    if (!hold) return
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS)
    return () => window.clearInterval(id)
  }, [hold])

  const holdSecondsLeft = useMemo(() => {
    if (!hold || now === null) return null
    return Math.max(0, Math.round((Date.parse(hold.expiresAt) - now) / 1000))
  }, [hold, now])

  const releaseHold = useCallback(() => {
    setHold(null)
    clearStored(HOLD_KEY)
  }, [])

  /** Ran out: the seat went back, and the reader has to choose again. */
  useEffect(() => {
    if (holdSecondsLeft === 0) {
      setHoldExpired(true)
      setDraftState((prev) => ({
        ...prev,
        course: { ...prev.course, classGroupId: null },
      }))
      releaseHold()
      setStep('course')
    }
  }, [holdSecondsLeft, releaseHold])

  const startHold = useCallback(
    (classGroupId: string) => {
      const group = groupById(catalog, classGroupId)
      if (!group || !hasSeat(group)) return
      const next: SeatHold = {
        classGroupId,
        expiresAt: new Date(
          Date.now() + catalog.settings.holdMinutes * 60_000,
        ).toISOString(),
      }
      setHold(next)
      setHoldExpired(false)
      setNow(Date.now())
      writeStored(HOLD_KEY, next)
    },
    [catalog],
  )

  /**
   * The receipt landed. The seat stays `reserved` — sending proof is not the
   * same as having it approved (`CLAUDE.md` §5) — but it stops racing the short
   * clock and starts waiting on the review window instead.
   */
  const settleHold = useCallback(() => {
    setHold(null)
    setHoldExpired(false)
    clearStored(HOLD_KEY)
  }, [])

  /**
   * Somebody arriving on the seller's link lands past step 1 with the class
   * group already settled, so nothing ever pressed "continue" to claim the
   * seat. They still need one held: they have usually already paid, and a seat
   * filling up while they type their name is the exact failure the hold exists
   * to prevent. Runs once, and only when no hold came back from a reload.
   */
  useEffect(() => {
    if (!restored || bootstrapped.current) return
    bootstrapped.current = true
    if (!hold && draft.course.classGroupId && step !== 'course') {
      startHold(draft.course.classGroupId)
    }
  }, [restored, hold, draft.course.classGroupId, step, startHold])

  const setDraft = useCallback(
    (next: CheckoutDraft | ((prev: CheckoutDraft) => CheckoutDraft)) => {
      setDraftState((prev) => (typeof next === 'function' ? next(prev) : next))
    },
    [],
  )

  const goTo = useCallback((target: StepId) => {
    if (!STEP_ORDER.includes(target)) return
    setStep(target)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  }, [])

  return {
    draft,
    setDraft,
    step,
    goTo,
    holdSecondsLeft,
    holdExpired,
    startHold,
    releaseHold,
    settleHold,
  }
}

/** Wipes the draft once it has been submitted — nothing left to resume. */
export function clearCheckoutStorage(): void {
  clearStored(DRAFT_KEY)
  clearStored(HOLD_KEY)
}
