import { ReceiptExtractionError } from "@ooc/domain";
import { describe, expect, it } from "vitest";
import { parseModelReading } from "../src/GeminiReceiptExtractor.js";
import { parseAmountToCents, toExtractedFields, toPaidAt, type ModelReceiptReading } from "../src/receiptReading.js";

describe("parseAmountToCents", () => {
  it.each([
    ["25.00", 2500],
    ["S/ 25.00", 2500],
    ["S/. 25", 2500],
    ["25.5", 2550],
    ["1,250.50", 125050],
    ["1.250,50", 125050],
    ["1,250", 125000],
    ["2,500,000.00", 250000000],
    ["0.10", 10],
  ])("%s → %d cents", (printed, cents) => {
    expect(parseAmountToCents(printed)).toBe(cents);
  });

  it.each(["", "S/", "abc", "0.00", "0"])("refuses %j", (printed) => {
    expect(parseAmountToCents(printed)).toBeNull();
  });
});

describe("toPaidAt", () => {
  it("converts Lima local time to UTC", () => {
    expect(toPaidAt("2026-10-02", "21:15")).toBe("2026-10-03T02:15:00.000Z");
  });

  it("keeps the bare date when no time is printed", () => {
    expect(toPaidAt("2026-10-02", null)).toBe("2026-10-02");
  });

  it("refuses a date that is not YYYY-MM-DD", () => {
    expect(toPaidAt("02/10/2026", "10:00")).toBeNull();
    expect(toPaidAt(null, "10:00")).toBeNull();
  });

  it("falls back to the date when the time is unreadable", () => {
    expect(toPaidAt("2026-10-02", "10 pm")).toBe("2026-10-02");
  });
});

function reading(overrides: Partial<ModelReceiptReading> = {}): ModelReceiptReading {
  return {
    amount: { value: "120.00", confidence: 0.98 },
    operation_number: { value: "12345678", confidence: 0.95 },
    payment_method: { value: "yape", detail: null, confidence: 0.99 },
    payer_name: { value: null, confidence: 0 },
    paid_at: { date: "2026-10-02", time: "09:30", confidence: 0.9 },
    ...overrides,
  };
}

describe("toExtractedFields", () => {
  it("returns the five fields with their confidence", () => {
    expect(toExtractedFields(reading())).toEqual([
      { field: "amount_cents", value: 12000, confidence: 0.98 },
      { field: "operation_number", value: "12345678", confidence: 0.95 },
      { field: "payment_method", value: "yape", detail: null, confidence: 0.99 },
      { field: "payer_name", value: null, confidence: 0 },
      { field: "paid_at", value: "2026-10-02T14:30:00.000Z", confidence: 0.9 },
    ]);
  });

  it("zeroes the confidence of a value that could not be converted", () => {
    const fields = toExtractedFields(reading({ amount: { value: "S/", confidence: 0.9 } }));
    expect(fields[0]).toEqual({ field: "amount_cents", value: null, confidence: 0 });
  });

  it("drops `other` without its label", () => {
    const fields = toExtractedFields(reading({ payment_method: { value: "other", detail: "  ", confidence: 0.8 } }));
    expect(fields[2]).toEqual({ field: "payment_method", value: null, detail: null, confidence: 0 });
  });

  it("keeps the label of `other`, and only of `other`", () => {
    expect(toExtractedFields(reading({ payment_method: { value: "other", detail: "BBVA", confidence: 0.8 } }))[2]).toEqual({
      field: "payment_method",
      value: "other",
      detail: "BBVA",
      confidence: 0.8,
    });
    expect(toExtractedFields(reading({ payment_method: { value: "bcp", detail: "BCP", confidence: 0.8 } }))[2]).toEqual({
      field: "payment_method",
      value: "bcp",
      detail: null,
      confidence: 0.8,
    });
  });
});

describe("parseModelReading", () => {
  it("parses the model's JSON", () => {
    expect(parseModelReading(JSON.stringify(reading()))).toHaveLength(5);
  });

  it.each([
    ["no text", undefined],
    ["not JSON", "here is the receipt: {"],
    ["wrong shape", JSON.stringify({ amount: "25.00" })],
    ["confidence out of range", JSON.stringify(reading({ amount: { value: "25", confidence: 7 } }))],
    ["unknown method", JSON.stringify(reading({ payment_method: { value: "paypal" as never, detail: null, confidence: 1 } }))],
  ])("refuses %s as invalid_response", (_label, text) => {
    expect(() => parseModelReading(text)).toThrow(ReceiptExtractionError);
    try {
      parseModelReading(text);
    } catch (error) {
      expect((error as ReceiptExtractionError).reason).toBe("invalid_response");
    }
  });
});
