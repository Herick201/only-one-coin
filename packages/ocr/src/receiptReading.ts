import { PaymentMethodSchema, PaymentRailSchema, type ReceiptExtractedField } from "@ooc/domain";
import { z } from "zod";

/**
 * What the model is asked to return, field by field. Every field is
 * `{ value, confidence }` so the confidence is per field (apps/api/CLAUDE.md),
 * and every value is text as printed: the amount comes back as the decimal
 * the receipt shows, never a JSON number, so it reaches cents without ever
 * being a float (CLAUDE.md §6).
 */
const confidence = z.number().min(0).max(1);
const textField = z.object({ value: z.string().nullable(), confidence });

export const ModelReceiptReadingSchema = z.object({
  amount: textField,
  operation_number: textField,
  payment_method: z.object({
    value: PaymentMethodSchema.nullable(),
    detail: z.string().nullable(),
    confidence,
  }),
  payer_name: textField,
  paid_at: z.object({
    date: z.string().nullable(),
    time: z.string().nullable(),
    confidence,
  }),
});

export type ModelReceiptReading = z.infer<typeof ModelReceiptReadingSchema>;

const jsonText = { type: ["string", "null"] } as const;
const jsonConfidence = { type: "number", minimum: 0, maximum: 1 } as const;

/** The same shape as `ModelReceiptReadingSchema`, as the JSON Schema the
 * provider constrains its output to. Kept by hand next to the zod schema —
 * the zod parse is what actually guards the worker, this only steers the
 * model. */
export const MODEL_RECEIPT_READING_JSON_SCHEMA = {
  type: "object",
  properties: {
    amount: {
      type: "object",
      properties: { value: jsonText, confidence: jsonConfidence },
      required: ["value", "confidence"],
    },
    operation_number: {
      type: "object",
      properties: { value: jsonText, confidence: jsonConfidence },
      required: ["value", "confidence"],
    },
    payment_method: {
      type: "object",
      properties: {
        value: { type: ["string", "null"], enum: [...PaymentRailSchema.options, "other", null] },
        detail: jsonText,
        confidence: jsonConfidence,
      },
      required: ["value", "detail", "confidence"],
    },
    payer_name: {
      type: "object",
      properties: { value: jsonText, confidence: jsonConfidence },
      required: ["value", "confidence"],
    },
    paid_at: {
      type: "object",
      properties: { date: jsonText, time: jsonText, confidence: jsonConfidence },
      required: ["date", "time", "confidence"],
    },
  },
  required: ["amount", "operation_number", "payment_method", "payer_name", "paid_at"],
} as const;

/**
 * The printed amount as cents, or `null` when it is not an amount. Peruvian
 * receipts print `S/ 1,250.50`: `.` is the decimal separator and `,` groups
 * thousands — but a phone set to another locale prints `1.250,50`, so the
 * rule is positional: a final separator followed by one or two digits is
 * the decimal point, any other separator groups thousands.
 */
export function parseAmountToCents(printed: string): number | null {
  // "S/. 25" leaves a leading dot once the symbol is gone.
  const compact = printed.replace(/[^\d.,]/g, "").replace(/^[.,]+|[.,]+$/g, "");
  if (!/\d/.test(compact)) {
    return null;
  }

  const decimal = /[.,](\d{1,2})$/.exec(compact);
  const integerPart = (decimal ? compact.slice(0, decimal.index) : compact).replace(/[.,]/g, "");
  const fraction = decimal ? decimal[1].padEnd(2, "0") : "00";
  if (!/^\d+$/.test(integerPart)) {
    return null;
  }

  const cents = Number(integerPart) * 100 + Number(fraction);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

/** Peru has kept UTC−5 with no daylight saving since 1994. */
const LIMA_OFFSET = "-05:00";

/**
 * The receipt's printed Lima date (and time, when there is one) as ISO 8601
 * in UTC — or the bare date when the receipt prints no time, since inventing
 * midnight would put the payment on the wrong day for half the comparisons.
 */
export function toPaidAt(date: string | null, time: string | null): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }
  if (!time) {
    return Number.isNaN(Date.parse(date)) ? null : date;
  }

  const hhmm = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time);
  if (!hhmm) {
    return date;
  }
  const instant = new Date(`${date}T${hhmm[1]}:${hhmm[2]}:${hhmm[3] ?? "00"}${LIMA_OFFSET}`);
  return Number.isNaN(instant.getTime()) ? date : instant.toISOString();
}

function trimmed(value: string | null): string | null {
  const text = value?.trim();
  return text ? text : null;
}

/**
 * The model's reading as the domain's field list. A value that came back but
 * could not be converted (an "amount" with no digits) becomes `null` with
 * confidence 0 — a field the pipeline cannot use is never reported as
 * confidently read.
 */
export function toExtractedFields(reading: ModelReceiptReading): ReceiptExtractedField[] {
  const amountText = trimmed(reading.amount.value);
  const amountCents = amountText ? parseAmountToCents(amountText) : null;

  const operationNumber = trimmed(reading.operation_number.value);
  const payerName = trimmed(reading.payer_name.value);

  const method = reading.payment_method.value;
  const methodDetail = method === "other" ? trimmed(reading.payment_method.detail) : null;
  // `other` without its label never reaches a screen (CLAUDE.md §4).
  const usableMethod = method === "other" && !methodDetail ? null : method;

  const paidAt = toPaidAt(trimmed(reading.paid_at.date), trimmed(reading.paid_at.time));

  return [
    { field: "amount_cents", value: amountCents, confidence: amountCents === null ? 0 : reading.amount.confidence },
    {
      field: "operation_number",
      value: operationNumber,
      confidence: operationNumber === null ? 0 : reading.operation_number.confidence,
    },
    {
      field: "payment_method",
      value: usableMethod,
      detail: methodDetail,
      confidence: usableMethod === null ? 0 : reading.payment_method.confidence,
    },
    { field: "payer_name", value: payerName, confidence: payerName === null ? 0 : reading.payer_name.confidence },
    { field: "paid_at", value: paidAt, confidence: paidAt === null ? 0 : reading.paid_at.confidence },
  ];
}
