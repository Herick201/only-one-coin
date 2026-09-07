import path from "node:path";
import ExcelJS from "exceljs";

export interface SheetRows {
  file: string;
  sheet: string;
  /** Header row, trimmed of trailing blanks — kept only for diagnostics. */
  header: unknown[];
  /** Data rows (header excluded), trimmed of fully-blank trailing rows. */
  rows: unknown[][];
}

function trimTrailingNulls(row: unknown[]): unknown[] {
  const copy = [...row];
  while (copy.length > 0 && (copy[copy.length - 1] === null || copy[copy.length - 1] === undefined)) {
    copy.pop();
  }
  return copy;
}

function cellValue(cell: ExcelJS.Cell): unknown {
  const value = cell.value;
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && "richText" in (value as object)) {
    return (value as { richText: { text: string }[] }).richText.map((r) => r.text).join("");
  }
  if (typeof value === "object" && "result" in (value as object)) {
    return (value as { result: unknown }).result;
  }
  if (typeof value === "object" && "hyperlink" in (value as object)) {
    return (value as { text?: string; hyperlink: string }).text ?? (value as { hyperlink: string }).hyperlink;
  }
  return value;
}

export async function readWorkbook(filePath: string): Promise<SheetRows[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const file = path.basename(filePath);
  const result: SheetRows[] = [];

  for (const worksheet of workbook.worksheets) {
    const allRows: unknown[][] = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const values: unknown[] = [];
      // ExcelJS rows are 1-indexed and row.values[0] is always undefined.
      const raw = row.values as unknown[];
      for (let i = 1; i < raw.length; i++) {
        const cell = row.getCell(i);
        values[i - 1] = cellValue(cell);
      }
      allRows.push(trimTrailingNulls(values));
    });

    const nonEmpty = allRows.filter((r) => r.some((c) => c !== null && c !== undefined));
    if (nonEmpty.length === 0) continue;

    const [header, ...rows] = nonEmpty;
    result.push({ file, sheet: worksheet.name, header: header!, rows });
  }

  return result;
}
