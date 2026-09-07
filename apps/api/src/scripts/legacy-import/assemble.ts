import type { ParsedRow, PaymentMethod } from "./parse-row.js";
import type { SheetInfo } from "./sheet-info.js";

export type Modality = "paquete" | "mensual";
export type PaymentStatus = "approved" | "under_review" | "rejected";

export interface LegacyRecord {
  sourceFile: string;
  sourceSheet: string;
  sourceRowIndex: number;

  lastName: string;
  firstName: string;
  nationalIdType: ParsedRow["nationalIdType"];
  nationalId: string;
  phone: string;
  birthDate: Date;
  email: string;

  courseKey: string;
  courseName: string;
  language: string;
  modality: Modality;
  moduleNumber: number | null;
  startsOn: Date;
  scheduleText: string;
  classroomLabel: string | null;

  amountCents: number;
  paymentMethod: PaymentMethod;
  methodDetail: string | null;
  operationNumber: string | null;
  paymentStatus: PaymentStatus;

  // Audit-only — not written to any DB column (no matching field on the
  // current schema), kept for the receipts CSV so the original evidence
  // isn't just discarded.
  channel: string | null;
  bankAccount: string | null;
  receiptLinks: string[];
}

export type AssembleResult = { ok: true; record: LegacyRecord } | { ok: false; reason: string };

// Both source files are the 2026 Agosto/Setiembre sales window (CLAUDE.md
// session date) — no other year appears anywhere in the sampled data.
const YEAR = 2026;

export function assemble(
  file: string,
  sheet: string,
  rowIndex: number,
  row: ParsedRow,
  info: SheetInfo,
): AssembleResult {
  if (info.courseKey === "unknown" && info.statusOverride === null) {
    return { ok: false, reason: `unrecognized sheet/course: ${sheet}` };
  }

  const dateParts = row.startDateFromRow ?? info.fallbackDate;
  if (!dateParts) return { ok: false, reason: "no start date (neither row nor sheet name carried one)" };
  const startsOn = new Date(Date.UTC(YEAR, dateParts.month - 1, dateParts.day));
  if (Number.isNaN(startsOn.getTime())) return { ok: false, reason: `invalid start date: ${JSON.stringify(dateParts)}` };

  const scheduleText = row.scheduleText ?? row.classroomText ?? "Horário não registrado";

  let paymentStatus: PaymentStatus;
  if (info.statusOverride) paymentStatus = info.statusOverride;
  else if (row.operationNeedsReview) paymentStatus = "under_review";
  else paymentStatus = "approved";

  // A sheet in the exception buckets (PAGOS ERRONEOS / SE DERIVO) doesn't
  // carry real course info — fall back to Inglés Básico as the best guess
  // since both buckets live inside the Inglés Agosto workbook, but this is
  // exactly the kind of row a human should eyeball, hence 'under_review' or
  // 'rejected' rather than 'approved' regardless of how cleanly it parsed.
  const courseKey = info.courseKey === "unknown" ? "ingles_basico" : info.courseKey;
  const courseName = info.courseName === "unknown" ? "Inglés Básico" : info.courseName;
  const language = info.language === "unknown" ? "Inglés" : info.language;

  return {
    ok: true,
    record: {
      sourceFile: file,
      sourceSheet: sheet,
      sourceRowIndex: rowIndex,
      lastName: row.lastName,
      firstName: row.firstName,
      nationalIdType: row.nationalIdType,
      nationalId: row.nationalId,
      phone: row.phone,
      birthDate: row.birthDate,
      email: row.email,
      courseKey,
      courseName,
      language,
      modality: row.moduleNumber !== null ? "mensual" : "paquete",
      moduleNumber: row.moduleNumber,
      startsOn,
      scheduleText,
      classroomLabel: row.classroomText,
      amountCents: row.amountCents,
      paymentMethod: row.paymentMethod,
      methodDetail: row.methodDetail,
      operationNumber: row.operationNumber,
      paymentStatus,
      channel: row.channel,
      bankAccount: row.bankAccount,
      receiptLinks: row.receiptLinks,
    },
  };
}
