import { z } from "zod";

/** An empty value (`KEY=` straight from .env.example) counts as unset. */
const optionalSecret = z
  .string()
  .optional()
  .transform((val) => val || undefined);

/**
 * The OCR provider's variables — shared by `config.ts` (the API's boot
 * validation) and the `ocr:eval` script, which needs nothing else. zod only:
 * `config.ts` is loaded by the container the routes use, so this module must
 * never pull in `@ooc/ocr` (apps/api/CLAUDE.md, "o módulo de IA não entra no
 * container").
 *
 * `RECEIPT_OCR_PROVIDER` picks the adapter (decision of 02/10/2026:
 * OpenRouter added next to the direct Gemini call). Each provider has its own
 * key and optional model id; a provider without its key means no extraction
 * — the worker does not start, the API still boots.
 */
export const receiptOcrEnvShape = {
  RECEIPT_OCR_PROVIDER: z.enum(["gemini", "openrouter"]).default("gemini"),
  GEMINI_API_KEY: optionalSecret,
  GEMINI_RECEIPT_MODEL: optionalSecret,
  OPENROUTER_API_KEY: optionalSecret,
  OPENROUTER_RECEIPT_MODEL: optionalSecret,
};

export const ReceiptOcrEnvSchema = z.object(receiptOcrEnvShape);

export type ReceiptOcrEnv = z.infer<typeof ReceiptOcrEnvSchema>;
