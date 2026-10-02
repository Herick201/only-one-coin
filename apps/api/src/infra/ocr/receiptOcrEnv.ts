import { z } from "zod";

/** An empty value (`KEY=` straight from .env.example) counts as unset. */
const optionalString = z
  .string()
  .optional()
  .transform((val) => val || undefined);

/** Level 1 of the OCR ladder (CLAUDE.md §3), by OpenRouter id. */
export const DEFAULT_RECEIPT_OCR_TIER1_MODEL = "google/gemini-3.1-flash-lite";

/**
 * The OCR variables — shared by `config.ts` (the API's boot validation) and
 * the `ocr:eval` script, which needs nothing else. zod only: `config.ts` is
 * loaded by the container the routes use, so this module must never pull in
 * `@ooc/ocr` (apps/api/CLAUDE.md, "o módulo de IA não entra no container").
 *
 * Every tier goes through OpenRouter (decision of 02/10/2026): one key, and
 * a tier is just a model id. Without the key there is no extraction — the
 * worker does not start, the API still boots. The tier-2 model has no
 * default on purpose: which family reads second is a decision still to be
 * made (ROADMAP Sessão 29), and `createReceiptExtractor` refuses one from
 * the same family as tier 1.
 */
export const receiptOcrEnvShape = {
  OPENROUTER_API_KEY: optionalString,
  RECEIPT_OCR_TIER1_MODEL: optionalString.transform((val) => val ?? DEFAULT_RECEIPT_OCR_TIER1_MODEL),
  RECEIPT_OCR_TIER2_MODEL: optionalString,
};

export const ReceiptOcrEnvSchema = z.object(receiptOcrEnvShape);

export type ReceiptOcrEnv = z.infer<typeof ReceiptOcrEnvSchema>;
