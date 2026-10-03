import { RECEIPT_EXTRACTION_TIER_PRIMARY, RECEIPT_EXTRACTION_TIER_SECONDARY } from "@ooc/domain";
import { describe, expect, it } from "vitest";
import { createReceiptExtractor } from "@/infra/ocr/createReceiptExtractor.js";
import { DEFAULT_RECEIPT_OCR_TIER1_MODEL, ReceiptOcrEnvSchema } from "@/infra/ocr/receiptOcrEnv.js";

/**
 * Which extractor each tier of the OCR ladder gets (OOC-20): one OpenRouter
 * adapter, a model id per tier, and tier 2 refused when it is the same
 * family as tier 1. No network — building an extractor makes no call.
 */

function env(vars: Record<string, string>) {
  return ReceiptOcrEnvSchema.parse(vars);
}

describe("ReceiptOcrEnvSchema", () => {
  it("defaults tier 1 to Gemini 3.1 Flash-Lite and leaves tier 2 unset", () => {
    expect(env({})).toEqual({ RECEIPT_OCR_TIER1_MODEL: DEFAULT_RECEIPT_OCR_TIER1_MODEL });
    expect(DEFAULT_RECEIPT_OCR_TIER1_MODEL).toBe("google/gemini-3.1-flash-lite");
  });

  it("treats empty values from .env.example as unset", () => {
    expect(env({ OPENROUTER_API_KEY: "", RECEIPT_OCR_TIER1_MODEL: "", RECEIPT_OCR_TIER2_MODEL: "" })).toEqual({
      RECEIPT_OCR_TIER1_MODEL: DEFAULT_RECEIPT_OCR_TIER1_MODEL,
    });
  });
});

describe("createReceiptExtractor", () => {
  it("builds tier 1 with its model", () => {
    const extractor = createReceiptExtractor(env({ OPENROUTER_API_KEY: "sk-or-x" }), RECEIPT_EXTRACTION_TIER_PRIMARY);
    expect(extractor?.modelName).toBe("google/gemini-3.1-flash-lite");
  });

  it("builds tier 2 with its own model when one is configured", () => {
    const vars = { OPENROUTER_API_KEY: "sk-or-x", RECEIPT_OCR_TIER2_MODEL: "anthropic/claude-haiku-4.5" };
    expect(createReceiptExtractor(env(vars), RECEIPT_EXTRACTION_TIER_SECONDARY)?.modelName).toBe("anthropic/claude-haiku-4.5");
    expect(createReceiptExtractor(env(vars), RECEIPT_EXTRACTION_TIER_PRIMARY)?.modelName).toBe("google/gemini-3.1-flash-lite");
  });

  it("is null without the key, for every tier", () => {
    const vars = env({ RECEIPT_OCR_TIER2_MODEL: "anthropic/claude-haiku-4.5" });
    expect(createReceiptExtractor(vars, RECEIPT_EXTRACTION_TIER_PRIMARY)).toBeNull();
    expect(createReceiptExtractor(vars, RECEIPT_EXTRACTION_TIER_SECONDARY)).toBeNull();
  });

  it("is null for tier 2 while no model is chosen for it", () => {
    expect(createReceiptExtractor(env({ OPENROUTER_API_KEY: "sk-or-x" }), RECEIPT_EXTRACTION_TIER_SECONDARY)).toBeNull();
  });

  it.each([
    ["google/gemini-3.5-flash-lite", "same vendor as tier 1"],
    ["gemini-2.5-flash", "no vendor prefix"],
  ])("refuses %s as tier 2 (%s) — for every tier, so the boot fails", (tier2) => {
    const vars = env({ OPENROUTER_API_KEY: "sk-or-x", RECEIPT_OCR_TIER2_MODEL: tier2 });
    expect(() => createReceiptExtractor(vars, RECEIPT_EXTRACTION_TIER_PRIMARY)).toThrow(/another family/);
    expect(() => createReceiptExtractor(vars, RECEIPT_EXTRACTION_TIER_SECONDARY)).toThrow(/another family/);
  });
});
