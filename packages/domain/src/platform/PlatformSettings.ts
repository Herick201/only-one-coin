import { z } from "zod";

/**
 * Bounds of the checkout hold, mirrored by the CHECK on
 * `platform_settings.checkout_hold_minutes` and by the backoffice input.
 * Five minutes is not enough for a bank transfer; past an hour the seat is
 * simply locked away from everybody else (docs/MATRICULA-CHECKOUT.md §3).
 */
export const CHECKOUT_HOLD_MINUTES_MIN = 5;
export const CHECKOUT_HOLD_MINUTES_MAX = 60;

export const CheckoutHoldMinutesSchema = z
  .number()
  .int()
  .min(CHECKOUT_HOLD_MINUTES_MIN)
  .max(CHECKOUT_HOLD_MINUTES_MAX);

/**
 * How far ABOVE the expected amount a receipt is still green — it only
 * validates, a person approves
 * (OOC-21). Never below: "Sem descontos. Nunca." (CLAUDE.md §1). Mirrored by
 * the CHECK on `platform_settings.receipt_amount_tolerance_cents`; S/50 is
 * the ceiling the backoffice input already had.
 */
export const RECEIPT_AMOUNT_TOLERANCE_CENTS_MIN = 0;
export const RECEIPT_AMOUNT_TOLERANCE_CENTS_MAX = 5000;

export const ReceiptAmountToleranceCentsSchema = z
  .number()
  .int()
  .min(RECEIPT_AMOUNT_TOLERANCE_CENTS_MIN)
  .max(RECEIPT_AMOUNT_TOLERANCE_CENTS_MAX);

/**
 * Below this percentage of the expected amount the traffic light suggests
 * rejecting (OOC-21). 50 is provisional (owner, 03/10/2026) — changed here,
 * on the panel, never in code. Mirrored by
 * `platform_settings.receipt_reject_below_percent`'s CHECK.
 */
export const RECEIPT_REJECT_BELOW_PERCENT_MIN = 1;
export const RECEIPT_REJECT_BELOW_PERCENT_MAX = 99;

export const ReceiptRejectBelowPercentSchema = z
  .number()
  .int()
  .min(RECEIPT_REJECT_BELOW_PERCENT_MIN)
  .max(RECEIPT_REJECT_BELOW_PERCENT_MAX);

/**
 * The numbers the backoffice may change without a deploy. Only what something
 * server-side actually reads lives here — the rest of the settings screen is
 * still screen-only.
 */
export interface PlatformSettings {
  checkoutHoldMinutes: number;
  receiptAmountToleranceCents: number;
  receiptRejectBelowPercent: number;
}
