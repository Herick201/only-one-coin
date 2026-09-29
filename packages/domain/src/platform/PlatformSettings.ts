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
 * The numbers the backoffice may change without a deploy. Only what something
 * server-side actually reads lives here — the rest of the settings screen is
 * still screen-only.
 */
export interface PlatformSettings {
  checkoutHoldMinutes: number;
}
