import type { PaymentMethod } from "./Payment.js";
import { normalizeOperationNumber } from "./ReceiptScreening.js";

/**
 * The receipt traffic light (OOC-21, ROADMAP Sessão 27): what the OCR level 1
 * reading means for the payment. Pure and integer-only — cents and a whole
 * percentage, never a float near money.
 *
 * - `approve`: the pipeline settles the payment on its own (only out of
 *   `pending` — see `ValidateReceiptUseCase`).
 * - `review`: a person decides, as before the traffic light existed.
 * - `reject_suggested`: far below the price. Still a person who rejects —
 *   an OCR reading 15 where 150 is printed must not hand back the seat of
 *   someone who paid in full (owner's decision, 03/10/2026).
 */
export const RECEIPT_VERDICTS = ["approve", "review", "reject_suggested"] as const;
export type ReceiptVerdict = (typeof RECEIPT_VERDICTS)[number];

export const RECEIPT_VERDICT_REASONS = [
  /** approve — read equals expected. */
  "exact",
  /** approve — above expected, by no more than the tolerance. */
  "within_tolerance",
  /** review — above expected, past the tolerance. There is no refund flow,
   * and whoever paid more must not lose the seat over it. */
  "overpaid",
  /** review — below expected but at or above the red line. The tolerance
   * never covers a shortfall: "Sem descontos. Nunca." (CLAUDE.md §1). */
  "underpaid",
  /** reject_suggested — below `rejectBelowPercent` of expected. */
  "far_below",
  /** review — the reading failed, or found no amount. */
  "amount_unread",
  /** review — amount green, but no operation number was read. */
  "operation_number_unread",
  /** review — amount green, but the operation number read is not the one
   * the person typed. Without this, a screenshot of another payment for the
   * same price would be approved unseen. */
  "operation_number_mismatch",
  /** review — amount and number green, but no usable payment method was
   * read. */
  "payment_method_unread",
  /** review — the method read is not the one declared — the operation-number
   * guard is unique per method, so a screenshot of another method's payment
   * would otherwise pass. */
  "payment_method_mismatch",
] as const;
export type ReceiptVerdictReason = (typeof RECEIPT_VERDICT_REASONS)[number];

export function isReceiptVerdict(value: unknown): value is ReceiptVerdict {
  return (RECEIPT_VERDICTS as readonly unknown[]).includes(value);
}

export function isReceiptVerdictReason(value: unknown): value is ReceiptVerdictReason {
  return (RECEIPT_VERDICT_REASONS as readonly unknown[]).includes(value);
}

export interface ReceiptVerdictOutcome {
  verdict: ReceiptVerdict;
  reason: ReceiptVerdictReason;
}

/** Read from `platform_settings` at validation time — changing them never
 * revisits a verdict already recorded. */
export interface ReceiptValidationSettings {
  /** How far ABOVE the expected amount still approves, in cents. */
  toleranceCents: number;
  /** Below this percentage of the expected amount, rejection is suggested. */
  rejectBelowPercent: number;
}

export function classifyReceiptAmount(
  params: { expectedCents: number; readCents: number } & ReceiptValidationSettings,
): ReceiptVerdictOutcome {
  const { expectedCents, readCents, toleranceCents, rejectBelowPercent } = params;

  if (readCents === expectedCents) {
    return { verdict: "approve", reason: "exact" };
  }
  if (readCents > expectedCents) {
    return readCents - expectedCents <= toleranceCents
      ? { verdict: "approve", reason: "within_tolerance" }
      : { verdict: "review", reason: "overpaid" };
  }
  // Strictly below the line: exactly the percentage is still a review.
  return readCents * 100 < expectedCents * rejectBelowPercent
    ? { verdict: "reject_suggested", reason: "far_below" }
    : { verdict: "review", reason: "underpaid" };
}

/**
 * The whole verdict for one receipt. The amount speaks first; only a green
 * amount goes on to the operation-number and then the payment-method check,
 * so a reviewer always sees the money problem before anything else. `other`
 * compares by enum only — the free-text detail is not compared.
 */
export function decideReceiptVerdict(params: {
  expectedCents: number;
  declaredOperationNumber: string | null;
  readAmountCents: number | null;
  readOperationNumber: string | null;
  declaredMethod: PaymentMethod;
  readMethod: PaymentMethod | null;
  settings: ReceiptValidationSettings;
}): ReceiptVerdictOutcome {
  if (params.readAmountCents === null) {
    return { verdict: "review", reason: "amount_unread" };
  }

  const amount = classifyReceiptAmount({
    expectedCents: params.expectedCents,
    readCents: params.readAmountCents,
    ...params.settings,
  });
  if (amount.verdict !== "approve") {
    return amount;
  }

  const read = params.readOperationNumber === null ? "" : normalizeOperationNumber(params.readOperationNumber);
  if (read === "") {
    return { verdict: "review", reason: "operation_number_unread" };
  }
  const declared = params.declaredOperationNumber === null ? "" : normalizeOperationNumber(params.declaredOperationNumber);
  if (read !== declared) {
    return { verdict: "review", reason: "operation_number_mismatch" };
  }

  if (params.readMethod === null) {
    return { verdict: "review", reason: "payment_method_unread" };
  }
  if (params.readMethod !== params.declaredMethod) {
    return { verdict: "review", reason: "payment_method_mismatch" };
  }

  return amount;
}
