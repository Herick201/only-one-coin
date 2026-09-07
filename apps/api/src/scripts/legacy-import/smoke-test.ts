import fs from "node:fs";
import path from "node:path";
import { parseRow } from "./parse-row.js";
import { readWorkbook } from "./workbook.js";

const DIR = process.argv[2] ?? path.resolve(process.cwd(), "../../tmp");

// Filenames on disk use NFD (combining accents) — matching by a plain string
// literal (NFC in source) silently fails, so list the directory and filter.
const FILES = fs.readdirSync(DIR).filter((f) => f.toLowerCase().endsWith(".xlsx") && f.toUpperCase().includes("MATRICULAS"));

async function main() {
  let totalRows = 0;
  let ok = 0;
  const reasonCounts = new Map<string, number>();
  const samples = new Map<string, { sheet: string; row: unknown[] }[]>();

  for (const file of FILES) {
    const sheets = await readWorkbook(path.join(DIR, file));
    for (const sheet of sheets) {
      for (const row of sheet.rows) {
        totalRows++;
        const result = parseRow(row);
        if (result.ok) {
          ok++;
        } else {
          reasonCounts.set(result.reason, (reasonCounts.get(result.reason) ?? 0) + 1);
          const key = result.reason.split(":")[0]!;
          const arr = samples.get(key) ?? [];
          if (arr.length < 3) arr.push({ sheet: `${file} | ${sheet.sheet}`, row });
          samples.set(key, arr);
        }
      }
    }
  }

  console.log(`Total rows: ${totalRows}, ok: ${ok} (${((ok / totalRows) * 100).toFixed(1)}%), exceptions: ${totalRows - ok}`);
  console.log("\nException reasons:");
  const sorted = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [reason, count] of sorted.slice(0, 40)) {
    console.log(`  ${count.toString().padStart(5)}  ${reason}`);
  }

  console.log("\nSamples per reason-prefix:");
  for (const [key, arr] of samples) {
    console.log(`\n-- ${key} --`);
    for (const s of arr) console.log(`  [${s.sheet}]`, s.row);
  }
}

main();
