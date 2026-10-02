import { ApiError, GoogleGenAI } from "@google/genai";
import {
  ReceiptExtractionError,
  type IReceiptExtractor,
  type ReceiptExtraction,
  type ReceiptImage,
} from "@ooc/domain";
import { RECEIPT_EXTRACTION_PROMPT } from "./receiptPrompt.js";
import { MODEL_RECEIPT_READING_JSON_SCHEMA, ModelReceiptReadingSchema, toExtractedFields } from "./receiptReading.js";

/** Level 1 of the OCR ladder (CLAUDE.md §3). Overridable by env so a
 * provider rename does not need a deploy of code. */
export const DEFAULT_GEMINI_RECEIPT_MODEL = "gemini-3.1-flash-lite";

/** A single receipt is one small image and a short JSON answer; anything
 * slower than this is a stuck call, and the worker's retry (level 1r) is the
 * better use of the time. */
const REQUEST_TIMEOUT_MS = 30_000;

export interface GeminiReceiptExtractorOptions {
  apiKey: string;
  model?: string;
}

/**
 * `IReceiptExtractor` over the Gemini API, with the output constrained to a
 * JSON schema. Retrying is not done here — the worker owns the attempts
 * (BullMQ backoff), so a failure is classified and thrown as
 * `ReceiptExtractionError`, never swallowed.
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
          httpOptions: { timeout: REQUEST_TIMEOUT_MS },
        },
      });
    } catch (error) {
      throw new ReceiptExtractionError(classifyProviderError(error), error instanceof ApiError ? error.status : null);
    }

    return {
      modelName: this.modelName,
      modelVersion: response.modelVersion ?? null,
      fields: parseModelReading(response.text),
    };
  }
}

/** The model's JSON text as the domain's fields — `invalid_response` for
 * anything that is not the asked-for shape (including an empty answer from
 * a safety block). */
export function parseModelReading(text: string | undefined): ReceiptExtraction["fields"] {
  if (!text) {
    throw new ReceiptExtractionError("invalid_response");
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ReceiptExtractionError("invalid_response");
  }

  const parsed = ModelReceiptReadingSchema.safeParse(json);
  if (!parsed.success) {
    throw new ReceiptExtractionError("invalid_response");
  }
  return toExtractedFields(parsed.data);
}

/** Any answer from the API that is an error (429, 5xx — and also a bad key
 * or model id) or a transport failure counts as the provider being
 * unavailable: from the payment's point of view that is what happened, and
 * the worker logs the status for whoever has to fix a config error. */
function classifyProviderError(error: unknown): "provider_unavailable" | "unexpected_error" {
  if (error instanceof ApiError) {
    return "provider_unavailable";
  }
  if (error instanceof Error && /timeout|abort|fetch failed|ECONN|ETIMEDOUT|socket/i.test(`${error.name} ${error.message}`)) {
    return "provider_unavailable";
  }
  return "unexpected_error";
}
