import type { IReceiptExtractor } from "@ooc/domain";
import { GeminiReceiptExtractor, OpenRouterReceiptExtractor } from "@ooc/ocr";
import type { ReceiptOcrEnv } from "./receiptOcrEnv.js";

/**
 * The tier-1 extractor the env asks for, or `null` when the chosen provider
 * has no key. Imported only by `index.ts` (next to the workers) and the
 * `ocr:eval` script — never by the container, which the routes load.
 */
export function createReceiptExtractor(env: ReceiptOcrEnv): IReceiptExtractor | null {
  switch (env.RECEIPT_OCR_PROVIDER) {
    case "gemini":
      return env.GEMINI_API_KEY
        ? new GeminiReceiptExtractor({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_RECEIPT_MODEL })
        : null;
    case "openrouter":
      return env.OPENROUTER_API_KEY
        ? new OpenRouterReceiptExtractor({ apiKey: env.OPENROUTER_API_KEY, model: env.OPENROUTER_RECEIPT_MODEL })
        : null;
  }
}

/** The variable whose absence turned extraction off — for the boot warning. */
export function missingReceiptOcrKey(env: ReceiptOcrEnv): string {
  return env.RECEIPT_OCR_PROVIDER === "openrouter" ? "OPENROUTER_API_KEY" : "GEMINI_API_KEY";
}
