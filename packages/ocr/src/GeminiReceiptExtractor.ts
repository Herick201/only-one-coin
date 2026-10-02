import { ApiError, GoogleGenAI } from "@google/genai";
import {
  ReceiptExtractionError,
  type IReceiptExtractor,
  type ReceiptExtraction,
  type ReceiptImage,
} from "@ooc/domain";
import { RECEIPT_REQUEST_TIMEOUT_MS, isTransportError } from "./providerCall.js";
import { RECEIPT_EXTRACTION_PROMPT } from "./receiptPrompt.js";
import { MODEL_RECEIPT_READING_JSON_SCHEMA, parseModelReading } from "./receiptReading.js";

/** Level 1 of the OCR ladder (CLAUDE.md §3). Overridable by env so a
 * provider rename does not need a deploy of code. */
export const DEFAULT_GEMINI_RECEIPT_MODEL = "gemini-3.1-flash-lite";

export interface GeminiReceiptExtractorOptions {
  apiKey: string;
  model?: string;
}

/**
 * `IReceiptExtractor` over the Gemini API directly (Google AI Studio key),
 * with the output constrained to a JSON schema. Retrying is not done here —
 * the worker owns the attempts (BullMQ backoff), so a failure is classified
 * and thrown as `ReceiptExtractionError`, never swallowed.
 *
 * Nothing read off the image is logged here or put in an error message:
 * the reading is PII (CLAUDE.md §6) and only ever goes to the database.
 */
export class GeminiReceiptExtractor implements IReceiptExtractor {
  readonly modelName: string;
  private readonly client: GoogleGenAI;

  constructor(options: GeminiReceiptExtractorOptions) {
    this.modelName = options.model ?? DEFAULT_GEMINI_RECEIPT_MODEL;
    this.client = new GoogleGenAI({ apiKey: options.apiKey });
  }

  async extract(image: ReceiptImage): Promise<ReceiptExtraction> {
    let response;
    try {
      response = await this.client.models.generateContent({
        model: this.modelName,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: image.contentType, data: Buffer.from(image.bytes).toString("base64") } },
              { text: RECEIPT_EXTRACTION_PROMPT },
            ],
          },
        ],
        config: {
          temperature: 0,
          responseMimeType: "application/json",
          responseJsonSchema: MODEL_RECEIPT_READING_JSON_SCHEMA,
          httpOptions: { timeout: RECEIPT_REQUEST_TIMEOUT_MS },
        },
      });
    } catch (error) {
      // Any error answer from the API (429, 5xx — and also a bad key or
      // model id) counts as the provider being unavailable: from the
      // payment's point of view that is what happened, and the worker logs
      // the status for whoever has to fix a config error.
      if (error instanceof ApiError) {
        throw new ReceiptExtractionError("provider_unavailable", error.status);
      }
      throw new ReceiptExtractionError(isTransportError(error) ? "provider_unavailable" : "unexpected_error");
    }

    return {
      modelName: this.modelName,
      modelVersion: response.modelVersion ?? null,
      fields: parseModelReading(response.text),
    };
  }
}
