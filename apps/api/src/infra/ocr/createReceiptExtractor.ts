import {
  RECEIPT_EXTRACTION_TIER_PRIMARY,
  RECEIPT_EXTRACTION_TIER_SECONDARY,
  type IReceiptExtractor,
  type ReceiptExtractionTier,
} from "@ooc/domain";
import { OpenRouterReceiptExtractor, modelFamily } from "@ooc/ocr";
import type { ReceiptOcrEnv } from "./receiptOcrEnv.js";

/** The configured model id for a tier, or `null` when that tier has none. */
export function receiptOcrModelFor(env: ReceiptOcrEnv, tier: ReceiptExtractionTier): string | null {
  switch (tier) {
    case RECEIPT_EXTRACTION_TIER_PRIMARY:
      return env.RECEIPT_OCR_TIER1_MODEL;
    case RECEIPT_EXTRACTION_TIER_SECONDARY:
      return env.RECEIPT_OCR_TIER2_MODEL ?? null;
  }
}

/**
 * The extractor for a tier of the OCR ladder — the same OpenRouter adapter
 * with that tier's model — or `null` without the key or without a model for
 * the tier. Imported only by `index.ts` (next to the workers) and the
 * `ocr:eval` script — never by the container, which the routes load.
 *
 * Throws when tier 2 is configured with a model of the same family as tier
 * 1: a second reading by the same vendor's model shares its blind spots, and
 * "concordância é o critério" only means something across families
 * (apps/api/CLAUDE.md). A config error, caught at boot rather than in a
 * reviewer's queue months later.
 */
export function createReceiptExtractor(env: ReceiptOcrEnv, tier: ReceiptExtractionTier): IReceiptExtractor | null {
  assertTiersOfDifferentFamilies(env);

  const model = receiptOcrModelFor(env, tier);
  if (!env.OPENROUTER_API_KEY || !model) {
    return null;
  }
  return new OpenRouterReceiptExtractor({ apiKey: env.OPENROUTER_API_KEY, model });
}

function assertTiersOfDifferentFamilies(env: ReceiptOcrEnv): void {
  if (!env.RECEIPT_OCR_TIER2_MODEL) {
    return;
  }
  const tier1 = modelFamily(env.RECEIPT_OCR_TIER1_MODEL);
  const tier2 = modelFamily(env.RECEIPT_OCR_TIER2_MODEL);
  if (!tier1 || !tier2 || tier1 === tier2) {
    throw new Error(
      `RECEIPT_OCR_TIER2_MODEL must be an OpenRouter "vendor/model" id of another family than RECEIPT_OCR_TIER1_MODEL (got ${tier2 ?? "no vendor"} for tier 2, ${tier1 ?? "no vendor"} for tier 1)`,
    );
  }
}
