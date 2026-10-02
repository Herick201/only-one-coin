// The "pronto quando" of OOC-20 / ROADMAP Sessão 26: a sample of real
// receipts read by the same pipeline production runs (normalize → model)
// and compared with what a person read off each image by hand.
//
// Usage:
//   pnpm --filter @ooc/api ocr:eval -- <sample-dir>
//
// <sample-dir> holds the receipt images and a `labels.csv` filled in by hand:
//
//   file,amount,operation_number,payment_method,payer_name,paid_at
//   yape-01.jpg,120.00,08312457,yape,,2026-09-14 21:05
//   bbva-02.png,25.00,000123456,other:BBVA,Maria Quispe,2026-09-15
//
// An empty cell means "not on the receipt" — the right answer is then for
// the model to return nothing. payment_method is yape/plin/bcp/interbank, or
// other:<name as printed>. paid_at is Lima local time, the time optional.
//
// Real receipts are personal data (CLAUDE.md §6): <sample-dir> must live
// outside the repository — the script refuses otherwise. It writes two
// files there: `ocr-eval-report.md` (accuracy and confidence only, no value
// read off any receipt — the part that goes into docs/OCR-AVALIACAO.md) and
// `ocr-eval-details.csv` (expected vs read, for the hand check; stays local).
//
// Needs only the OCR variables, the same ones the worker reads:
// RECEIPT_OCR_PROVIDER (gemini | openrouter) and that provider's key, plus
// its optional model id — no database, no bucket. Each image is one model
// call. Comparing providers is running it twice with a different
// RECEIPT_OCR_PROVIDER.
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ReceiptExtractionError,
  normalizeOperationNumber,
  type ReceiptExtractedField,
  type ReceiptExtractedFieldName,
  type ReceiptExtraction,
} from "@ooc/domain";
import { parseAmountToCents, toPaidAt } from "@ooc/ocr";
import { createReceiptExtractor, missingReceiptOcrKey } from "@/infra/ocr/createReceiptExtractor.js";
import { ReceiptOcrEnvSchema } from "@/infra/ocr/receiptOcrEnv.js";
import { normalizeReceiptImage } from "@/infra/storage/normalizeReceiptImage.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

const FIELDS: ReceiptExtractedFieldName[] = ["amount_cents", "operation_number", "payment_method", "payer_name", "paid_at"];

interface Label {
  file: string;
  amountCents: number | null;
  operationNumber: string | null;
  paymentMethod: string | null;
  payerName: string | null;
  paidAt: string | null;
}

interface FieldResult {
  field: ReceiptExtractedFieldName;
  correct: boolean;
  confidence: number;
  expected: string;
  read: string;
}

interface SampleResult {
  file: string;
  failure: string | null;
  modelVersion: string | null;
  fields: FieldResult[];
}

/** Minimal RFC 4180: commas, double-quoted cells, "" as an escaped quote. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") {
        i++;
      }
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim() !== "")) {
    rows.push(row);
  }
  return rows;
}

function blankToNull(value: string | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

function parseLabels(text: string): Label[] {
  const [header, ...rows] = parseCsv(text);
  const expected = ["file", "amount", "operation_number", "payment_method", "payer_name", "paid_at"];
  if (!header || expected.some((name, index) => header[index]?.trim() !== name)) {
    throw new Error(`labels.csv must start with the header: ${expected.join(",")}`);
  }

  return rows.map((cells, index) => {
    const file = blankToNull(cells[0]);
    if (!file) {
      throw new Error(`labels.csv row ${index + 2}: file is empty`);
    }
    const amount = blankToNull(cells[1]);
    const amountCents = amount ? parseAmountToCents(amount) : null;
    if (amount && amountCents === null) {
      throw new Error(`labels.csv row ${index + 2}: amount "${amount}" is not an amount`);
    }
    const paidAtText = blankToNull(cells[5]);
    const [date, time] = paidAtText ? paidAtText.split(/[ T]/) : [null, null];
    const paidAt = paidAtText ? toPaidAt(date ?? null, time ?? null) : null;
    if (paidAtText && !paidAt) {
      throw new Error(`labels.csv row ${index + 2}: paid_at "${paidAtText}" is not YYYY-MM-DD [HH:MM]`);
    }

    return {
      file,
      amountCents,
      operationNumber: blankToNull(cells[2]),
      paymentMethod: blankToNull(cells[3])?.toLowerCase() ?? null,
      payerName: blankToNull(cells[4]),
      paidAt,
    };
  });
}

/** Case, accents and spacing never make a name wrong. */
function foldName(name: string): string {
  return name.normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function readMethod(field: Extract<ReceiptExtractedField, { field: "payment_method" }>): string | null {
  if (field.value === "other") {
    return `other:${(field.detail ?? "").toLowerCase()}`;
  }
  return field.value;
}

function compare(label: Label, extraction: ReceiptExtraction): FieldResult[] {
  return extraction.fields.map((field): FieldResult => {
    switch (field.field) {
      case "amount_cents":
        return {
          field: field.field,
          correct: field.value === label.amountCents,
          confidence: field.confidence,
          expected: label.amountCents === null ? "" : String(label.amountCents),
          read: field.value === null ? "" : String(field.value),
        };
      case "operation_number":
        return {
          field: field.field,
          correct:
            label.operationNumber === null
              ? field.value === null
              : field.value !== null && normalizeOperationNumber(field.value) === normalizeOperationNumber(label.operationNumber),
          confidence: field.confidence,
          expected: label.operationNumber ?? "",
          read: field.value ?? "",
        };
      case "payment_method": {
        const read = readMethod(field);
        return {
          field: field.field,
          correct: read === label.paymentMethod,
          confidence: field.confidence,
          expected: label.paymentMethod ?? "",
          read: read ?? "",
        };
      }
      case "payer_name":
        return {
          field: field.field,
          correct:
            label.payerName === null
              ? field.value === null
              : field.value !== null && foldName(field.value) === foldName(label.payerName),
          confidence: field.confidence,
          expected: label.payerName ?? "",
          read: field.value ?? "",
        };
      case "paid_at":
        return {
          field: field.field,
          correct: field.value === label.paidAt,
          confidence: field.confidence,
          expected: label.paidAt ?? "",
          read: field.value ?? "",
        };
    }
  });
}

function percent(numerator: number, denominator: number): string {
  return denominator === 0 ? "—" : `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function mean(values: number[]): string {
  return values.length === 0 ? "—" : (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2);
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function buildReport(results: SampleResult[], provider: string, modelName: string): string {
  const read = results.filter((result) => !result.failure);
  const versions = [...new Set(read.map((result) => result.modelVersion ?? "?"))].join(", ");
  const allFieldsRight = read.filter((result) => result.fields.every((field) => field.correct)).length;

  const lines = [
    `# Avaliação OCR nível 1`,
    ``,
    `- Data: ${new Date().toISOString().slice(0, 10)}`,
    `- Provedor: \`${provider}\` · modelo pedido: \`${modelName}\` · versão servida: \`${versions || "—"}\``,
    `- Comprovantes: ${results.length} · lidos: ${read.length} · falha na chamada: ${results.length - read.length}`,
    `- Comprovantes com os cinco campos certos: ${allFieldsRight}/${read.length} (${percent(allFieldsRight, read.length)})`,
    ``,
    `| Campo | Acertos | Taxa | Confiança média (certo) | Confiança média (errado) |`,
    `| --- | --- | --- | --- | --- |`,
  ];

  for (const name of FIELDS) {
    const fields = read.flatMap((result) => result.fields.filter((field) => field.field === name));
    const right = fields.filter((field) => field.correct);
    const wrong = fields.filter((field) => !field.correct);
    lines.push(
      `| \`${name}\` | ${right.length}/${fields.length} | ${percent(right.length, fields.length)} | ${mean(right.map((f) => f.confidence))} | ${mean(wrong.map((f) => f.confidence))} |`,
    );
  }

  lines.push(``, `## Por comprovante`, ``, `| # | ${FIELDS.map((name) => `\`${name}\``).join(" | ")} |`);
  lines.push(`| --- | ${FIELDS.map(() => "---").join(" | ")} |`);
  results.forEach((result, index) => {
    // The sample's own file names can carry a student's name — numbered
    // here, named only in the local details file.
    const cells = result.failure
      ? FIELDS.map(() => `falha: ${result.failure}`)
      : FIELDS.map((name) => {
          const field = result.fields.find((f) => f.field === name)!;
          return `${field.correct ? "✓" : "✗"} ${field.confidence.toFixed(2)}`;
        });
    lines.push(`| ${index + 1} | ${cells.join(" | ")} |`);
  });

  return `${lines.join("\n")}\n`;
}

function buildDetails(results: SampleResult[]): string {
  const lines = ["n,file,field,correct,confidence,expected,read"];
  results.forEach((result, index) => {
    if (result.failure) {
      lines.push([String(index + 1), result.file, "", "false", "", "", `failure:${result.failure}`].map(csvCell).join(","));
      return;
    }
    for (const field of result.fields) {
      lines.push(
        [String(index + 1), result.file, field.field, String(field.correct), field.confidence.toFixed(2), field.expected, field.read]
          .map(csvCell)
          .join(","),
      );
    }
  });
  return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
  const target = process.argv.slice(2).find((arg) => arg !== "--");
  if (!target) {
    throw new Error("usage: pnpm --filter @ooc/api ocr:eval -- <sample-dir>");
  }
  const sampleDir = path.resolve(process.cwd(), target);
  const relative = path.relative(REPO_ROOT, sampleDir);
  if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
    throw new Error("the sample directory is inside the repository — real receipts must never be in it (CLAUDE.md §6)");
  }

  const env = ReceiptOcrEnvSchema.parse(process.env);
  const extractor = createReceiptExtractor(env);
  if (!extractor) {
    throw new Error(`${missingReceiptOcrKey(env)} is not set (RECEIPT_OCR_PROVIDER=${env.RECEIPT_OCR_PROVIDER})`);
  }

  const labels = parseLabels(await readFile(path.join(sampleDir, "labels.csv"), "utf8"));
  const present = new Set(await readdir(sampleDir));
  const missing = labels.filter((label) => !present.has(label.file)).map((label) => label.file);
  if (missing.length > 0) {
    throw new Error(`labels.csv names files that are not in the directory: ${missing.join(", ")}`);
  }

  const results: SampleResult[] = [];
  for (const [index, label] of labels.entries()) {
    process.stdout.write(`[${index + 1}/${labels.length}] ${label.file} … `);
    const normalized = await normalizeReceiptImage(await readFile(path.join(sampleDir, label.file)));
    if (!normalized.ok) {
      results.push({ file: label.file, failure: normalized.reason, modelVersion: null, fields: [] });
      process.stdout.write(`${normalized.reason}\n`);
      continue;
    }

    try {
      const extraction = await extractor.extract({ bytes: normalized.buffer, contentType: normalized.contentType });
      const fields = compare(label, extraction);
      results.push({ file: label.file, failure: null, modelVersion: extraction.modelVersion, fields });
      process.stdout.write(`${fields.filter((field) => field.correct).length}/${fields.length}\n`);
    } catch (error) {
      const reason = error instanceof ReceiptExtractionError ? error.reason : "unexpected_error";
      results.push({ file: label.file, failure: reason, modelVersion: null, fields: [] });
      process.stdout.write(`${reason}\n`);
    }
  }

  const reportPath = path.join(sampleDir, "ocr-eval-report.md");
  const detailsPath = path.join(sampleDir, "ocr-eval-details.csv");
  await writeFile(reportPath, buildReport(results, env.RECEIPT_OCR_PROVIDER, extractor.modelName));
  await writeFile(detailsPath, buildDetails(results));
  process.stdout.write(`\nReport:  ${reportPath}\nDetails: ${detailsPath} (personal data — keep it out of the repository)\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
