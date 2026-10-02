import {
  ReceiptExtractionError,
  type IReceiptExtractor,
  type ReceiptExtraction,
  type ReceiptImage,
} from "@ooc/domain";
import { z } from "zod";
import { RECEIPT_REQUEST_TIMEOUT_MS, isTransportError } from "./providerCall.js";
import { RECEIPT_EXTRACTION_PROMPT } from "./receiptPrompt.js";
import { MODEL_RECEIPT_READING_JSON_SCHEMA, parseModelReading, toStrictJsonSchema } from "./receiptReading.js";

/** The same model as the direct Gemini adapter, by OpenRouter's slug. */
export const DEFAULT_OPENROUTER_RECEIPT_MODEL = "google/gemini-3.1-flash-lite";

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

const STRICT_RECEIPT_READING_JSON_SCHEMA = toStrictJsonSchema(MODEL_RECEIPT_READING_JSON_SCHEMA);

/**
 * Who may see a receipt on the way through (decision of 02/10/2026). The
 * image is personal data (Ley 29733): OpenRouter only routes to endpoints
 * with zero data retention that do not collect prompts for training, and
 * only to ones that honour every parameter sent — a provider that silently
 * dropped the JSON schema would answer free text.
 */
const PROVIDER_ROUTING = {
  zdr: true,
  data_collection: "deny",
  require_parameters: true,
} as const;

const ChatCompletionSchema = z.object({
  model: z.string().optional(),
  provider: z.string().optional(),
  choices: z
    .array(z.object({ message: z.object({ content: z.string().nullable().optional() }) }))
    .optional(),
  // OpenRouter can answer 200 with an error body when the upstream failed
  // mid-stream.
  error: z.object({ code: z.union([z.number(), z.string()]).optional() }).optional(),
});

export interface OpenRouterReceiptExtractorOptions {
  apiKey: string;
  model?: string;
  /** Injected in tests; the global `fetch` otherwise. */
  fetch?: typeof fetch;
}

/**
 * `IReceiptExtractor` over OpenRouter's OpenAI-compatible chat API, with
 * strict JSON-schema output. Same prompt and same conversion as the direct
 * Gemini adapter (`parseModelReading`), so the two are measured on equal
 * terms (docs/OCR-AVALIACAO.md). Retrying belongs to the worker, as there.
 *
 * `modelVersion` records the model id OpenRouter reports having served and
 * the upstream that ran it (`google/gemini-3.1-flash-lite via Google`, as of
 * 02/10/2026 — OpenRouter does not report a dated version) — with an
 * intermediary, "which model read this receipt" includes where it ran.
 */
export class OpenRouterReceiptExtractor implements IReceiptExtractor {
  readonly modelName: string;
  private readonly apiKey: string;
  private readonly fetch: typeof fetch;

  constructor(options: OpenRouterReceiptExtractorOptions) {
    this.modelName = options.model ?? DEFAULT_OPENROUTER_RECEIPT_MODEL;
    this.apiKey = options.apiKey;
    this.fetch = options.fetch ?? fetch;
  }

  async extract(image: ReceiptImage): Promise<ReceiptExtraction> {
    const dataUrl = `data:${image.contentType};base64,${Buffer.from(image.bytes).toString("base64")}`;

    let response: Response;
    try {
      response = await this.fetch(OPENROUTER_CHAT_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.modelName,
          temperature: 0,
          messages: [
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: dataUrl } },
                { type: "text", text: RECEIPT_EXTRACTION_PROMPT },
              ],
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: "receipt_reading", strict: true, schema: STRICT_RECEIPT_READING_JSON_SCHEMA },
          },
          provider: PROVIDER_ROUTING,
        }),
        signal: AbortSignal.timeout(RECEIPT_REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new ReceiptExtractionError(isTransportError(error) ? "provider_unavailable" : "unexpected_error");
    }

    // Any error status (429, 5xx — and also a bad key, no credit or no ZDR
    // endpoint left) counts as the provider being unavailable, as in the
    // Gemini adapter; the worker logs the status for whoever has to fix it.
    if (!response.ok) {
      throw new ReceiptExtractionError("provider_unavailable", response.status);
    }

    let body: z.infer<typeof ChatCompletionSchema>;
    try {
      body = ChatCompletionSchema.parse(await response.json());
    } catch {
      throw new ReceiptExtractionError("invalid_response");
    }
    if (body.error) {
      throw new ReceiptExtractionError(
        "provider_unavailable",
        typeof body.error.code === "number" ? body.error.code : null,
      );
    }

    return {
      modelName: this.modelName,
      modelVersion: body.model ? (body.provider ? `${body.model} via ${body.provider}` : body.model) : null,
      fields: parseModelReading(body.choices?.[0]?.message.content),
    };
  }
}
