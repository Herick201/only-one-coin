import { ReceiptExtractionError } from "@ooc/domain";
import { describe, expect, it } from "vitest";
import { OpenRouterReceiptExtractor } from "../src/OpenRouterReceiptExtractor.js";

const TIER1 = "google/gemini-3.1-flash-lite";

const IMAGE = { bytes: new Uint8Array([0xff, 0xd8, 0xff]), contentType: "image/jpeg" };

const READING = {
  amount: { value: "120.00", confidence: 0.98 },
  operation_number: { value: "12345678", confidence: 0.95 },
  payment_method: { value: "yape", detail: null, confidence: 0.99 },
  payer_name: { value: null, confidence: 0 },
  paid_at: { date: "2026-10-02", time: "09:30", confidence: 0.9 },
};

interface Call {
  url: string;
  init: RequestInit;
}

function fakeFetch(respond: () => Response | Promise<Response>): { fetch: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const impl = (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return Promise.resolve(respond());
  };
  return { fetch: impl as typeof fetch, calls };
}

function completion(content: string | null, extra: Record<string, unknown> = {}): Response {
  return Response.json({
    model: "google/gemini-3.1-flash-lite-20260507",
    provider: "Google",
    choices: [{ message: { content } }],
    ...extra,
  });
}

async function reasonOf(promise: Promise<unknown>): Promise<{ reason: string; providerStatus: number | null }> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ReceiptExtractionError);
    const { reason, providerStatus } = error as ReceiptExtractionError;
    return { reason, providerStatus };
  }
  throw new Error("expected the extraction to fail");
}

describe("OpenRouterReceiptExtractor", () => {
  it("sends the image, the strict schema and the zero-retention routing", async () => {
    const { fetch, calls } = fakeFetch(() => completion(JSON.stringify(READING)));
    await new OpenRouterReceiptExtractor({ apiKey: "sk-or-test", model: TIER1, fetch }).extract(IMAGE);

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect((calls[0]!.init.headers as Record<string, string>).Authorization).toBe("Bearer sk-or-test");

    const body = JSON.parse(calls[0]!.init.body as string);
    expect(body.model).toBe("google/gemini-3.1-flash-lite");
    expect(body.temperature).toBe(0);
    expect(body.provider).toEqual({ zdr: true, data_collection: "deny", require_parameters: true });
    expect(body.messages[0].content[0]).toEqual({ type: "image_url", image_url: { url: "data:image/jpeg;base64,/9j/" } });
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.strict).toBe(true);
    // Strict mode: every object closed, nested ones included.
    expect(body.response_format.json_schema.schema.additionalProperties).toBe(false);
    expect(body.response_format.json_schema.schema.properties.amount.additionalProperties).toBe(false);
  });

  it("returns the fields, the requested model and the version + upstream that served it", async () => {
    const { fetch } = fakeFetch(() => completion(JSON.stringify(READING)));
    const extraction = await new OpenRouterReceiptExtractor({ apiKey: "k", model: TIER1, fetch }).extract(IMAGE);

    expect(extraction.modelName).toBe("google/gemini-3.1-flash-lite");
    expect(extraction.modelVersion).toBe("google/gemini-3.1-flash-lite-20260507 via Google");
    expect(extraction.fields[0]).toEqual({ field: "amount_cents", value: 12000, confidence: 0.98 });
  });

  it("a tier-2 model differs only in the model id — same prompt, schema and routing", async () => {
    const tier1 = fakeFetch(() => completion(JSON.stringify(READING)));
    const tier2 = fakeFetch(() => completion(JSON.stringify(READING)));
    await new OpenRouterReceiptExtractor({ apiKey: "k", model: TIER1, fetch: tier1.fetch }).extract(IMAGE);
    const extractor = new OpenRouterReceiptExtractor({ apiKey: "k", model: "anthropic/claude-haiku-4.5", fetch: tier2.fetch });
    await extractor.extract(IMAGE);

    const { model: model1, ...rest1 } = JSON.parse(tier1.calls[0]!.init.body as string);
    const { model: model2, ...rest2 } = JSON.parse(tier2.calls[0]!.init.body as string);
    expect(extractor.modelName).toBe("anthropic/claude-haiku-4.5");
    expect([model1, model2]).toEqual([TIER1, "anthropic/claude-haiku-4.5"]);
    expect(rest2).toEqual(rest1);
  });

  it.each([429, 402, 401, 503])("an HTTP %d is provider_unavailable with the status", async (status) => {
    const { fetch } = fakeFetch(() => new Response("{}", { status }));
    expect(await reasonOf(new OpenRouterReceiptExtractor({ apiKey: "k", model: TIER1, fetch }).extract(IMAGE))).toEqual({
      reason: "provider_unavailable",
      providerStatus: status,
    });
  });

  it("an error body on a 200 is provider_unavailable", async () => {
    const { fetch } = fakeFetch(() => Response.json({ error: { code: 502, message: "upstream" } }));
    expect(await reasonOf(new OpenRouterReceiptExtractor({ apiKey: "k", model: TIER1, fetch }).extract(IMAGE))).toEqual({
      reason: "provider_unavailable",
      providerStatus: 502,
    });
  });

  it("a network failure is provider_unavailable", async () => {
    const fetch = (() => Promise.reject(new TypeError("fetch failed"))) as typeof globalThis.fetch;
    expect((await reasonOf(new OpenRouterReceiptExtractor({ apiKey: "k", model: TIER1, fetch }).extract(IMAGE))).reason).toBe(
      "provider_unavailable",
    );
  });

  it.each([
    ["no content", () => completion(null)],
    ["not JSON content", () => completion("Here is the receipt")],
    ["no choices", () => Response.json({ model: "m" })],
    ["a body that is not JSON", () => new Response("<html>", { status: 200 })],
  ])("%s is invalid_response", async (_label, respond) => {
    const { fetch } = fakeFetch(respond);
    expect((await reasonOf(new OpenRouterReceiptExtractor({ apiKey: "k", model: TIER1, fetch }).extract(IMAGE))).reason).toBe(
      "invalid_response",
    );
  });
});
