import { classifyReceiptAmount, decideReceiptVerdict, type ReceiptValidationSettings } from "@ooc/domain";
import { describe, expect, it } from "vitest";

/**
 * The receipt traffic light (OOC-21, ROADMAP Sessão 27), as a pure rule. The
 * expected amount is the payment's frozen price; the tolerance only goes up
 * ("Sem descontos. Nunca.", CLAUDE.md §1); far below the price is a suggested
 * rejection, never a rejection.
 */

const EXPECTED = 15000; // S/150,00
const DEFAULTS: ReceiptValidationSettings = { toleranceCents: 0, rejectBelowPercent: 50 };

function classify(readCents: number, settings: ReceiptValidationSettings = DEFAULTS) {
  return classifyReceiptAmount({ expectedCents: EXPECTED, readCents, ...settings });
}

describe("classifyReceiptAmount — the done criteria", () => {
  it("approves the exact amount", () => {
    expect(classify(15000)).toEqual({ verdict: "approve", reason: "exact" });
  });

  it("sends cents short to review — a shortfall is never green", () => {
    expect(classify(14990)).toEqual({ verdict: "review", reason: "underpaid" });
  });

  it("sends cents over to review while the tolerance is zero", () => {
    expect(classify(15010)).toEqual({ verdict: "review", reason: "overpaid" });
  });

  it("approves cents over within the tolerance", () => {
    expect(classify(15010, { ...DEFAULTS, toleranceCents: 50 })).toEqual({ verdict: "approve", reason: "within_tolerance" });
  });

  it("suggests rejecting an amount far below the price", () => {
    expect(classify(4000)).toEqual({ verdict: "reject_suggested", reason: "far_below" });
  });
});

describe("classifyReceiptAmount — edges", () => {
  it("approves exactly at the tolerance and reviews one cent past it", () => {
    const settings = { ...DEFAULTS, toleranceCents: 50 };
    expect(classify(15050, settings)).toEqual({ verdict: "approve", reason: "within_tolerance" });
    expect(classify(15051, settings)).toEqual({ verdict: "review", reason: "overpaid" });
  });

  it("never lets the tolerance cover a shortfall", () => {
    expect(classify(14999, { ...DEFAULTS, toleranceCents: 5000 })).toEqual({ verdict: "review", reason: "underpaid" });
  });

  it("reviews exactly the threshold and suggests rejection one cent below it", () => {
    expect(classify(7500)).toEqual({ verdict: "review", reason: "underpaid" });
    expect(classify(7499)).toEqual({ verdict: "reject_suggested", reason: "far_below" });
  });

  it("moves the red line with the setting", () => {
    expect(classify(10000, { ...DEFAULTS, rejectBelowPercent: 80 })).toEqual({ verdict: "reject_suggested", reason: "far_below" });
  });
});

describe("decideReceiptVerdict", () => {
  function decide(params: Partial<Parameters<typeof decideReceiptVerdict>[0]> = {}) {
    return decideReceiptVerdict({
      expectedCents: EXPECTED,
      declaredOperationNumber: "08312457",
      readAmountCents: 15000,
      readOperationNumber: "08312457",
      declaredMethod: "yape",
      readMethod: "yape",
      settings: DEFAULTS,
      ...params,
    });
  }

  it("approves when the amount and the operation number both match", () => {
    expect(decide()).toEqual({ verdict: "approve", reason: "exact" });
  });

  it("reviews a receipt whose amount was not read (failed reading or missing field)", () => {
    expect(decide({ readAmountCents: null })).toEqual({ verdict: "review", reason: "amount_unread" });
  });

  it("reviews a matching amount when the operation number was not read", () => {
    expect(decide({ readOperationNumber: null })).toEqual({ verdict: "review", reason: "operation_number_unread" });
    expect(decide({ readOperationNumber: " - " })).toEqual({ verdict: "review", reason: "operation_number_unread" });
  });

  it("reviews a matching amount when the operation number differs from the declared one", () => {
    expect(decide({ readOperationNumber: "08312458" })).toEqual({ verdict: "review", reason: "operation_number_mismatch" });
    expect(decide({ declaredOperationNumber: null })).toEqual({ verdict: "review", reason: "operation_number_mismatch" });
  });

  it("compares operation numbers normalized", () => {
    expect(decide({ declaredOperationNumber: "00-12 34", readOperationNumber: "001234" })).toEqual({
      verdict: "approve",
      reason: "exact",
    });
  });

  it("lets the amount speak first when it is not green", () => {
    expect(decide({ readAmountCents: 4000, readOperationNumber: null })).toEqual({
      verdict: "reject_suggested",
      reason: "far_below",
    });
    expect(decide({ readAmountCents: 14990, readOperationNumber: "999" })).toEqual({ verdict: "review", reason: "underpaid" });
  });

  it("reviews a green amount and number when the payment method was not read", () => {
    expect(decide({ readMethod: null })).toEqual({ verdict: "review", reason: "payment_method_unread" });
  });

  it("reviews a green amount and number when the method read is not the declared one", () => {
    expect(decide({ declaredMethod: "bcp", readMethod: "yape" })).toEqual({ verdict: "review", reason: "payment_method_mismatch" });
  });

  it("compares other by enum only", () => {
    expect(decide({ declaredMethod: "other", readMethod: "other" })).toEqual({ verdict: "approve", reason: "exact" });
  });

  it("lets the amount speak before the method", () => {
    expect(decide({ readAmountCents: 4000, declaredMethod: "bcp", readMethod: "yape" })).toEqual({
      verdict: "reject_suggested",
      reason: "far_below",
    });
  });

  it("lets the operation number speak before the method", () => {
    expect(decide({ readOperationNumber: "999", declaredMethod: "bcp", readMethod: "yape" })).toEqual({
      verdict: "review",
      reason: "operation_number_mismatch",
    });
  });
});
