// Parses one raw spreadsheet row into a normalized legacy-enrollment record.
//
// Why content-based instead of a fixed column-per-sheet template: manual
// inspection of every sheet (42 across the 4 legacy workbooks) showed the
// column order after "correo" (fecha_inicio / promociones / horarios /
// medio / comprobante / numero_operacion / monto / cuenta / classroom)
// drifts not just sheet-to-sheet but ROW-to-row within the same sheet — a
// cell missing here, a duplicate header there. Every one of those fields has
// a distinctive content signature (a URL, a closed enum, a "PROMO" prefix, an
// AM/PM time, a pure number), so classifying by content survives that jitter
// where a positional template does not. The first 7 columns (apellido through
// correo) are the one part of the layout that never moved across any sampled
// sheet, so those stay positional.
//
// A row that fails any REQUIRED signature is not guessed at — it comes back
// as a Rejected result with a reason, for the exceptions report. Nothing
// ambiguous gets silently forced into a shape.

export type NationalIdType = "DNI" | "CE" | "passport";
export type PaymentMethod = "yape" | "plin" | "bcp" | "interbank" | "other";

export interface ParsedRow {
  lastName: string;
  firstName: string;
  nationalIdType: NationalIdType;
  nationalId: string;
  phone: string;
  birthDate: Date;
  email: string;
  /** Raw "MODULO 2 - BASICO 2" style text, only present on mensual/CONTI-style rows. */
  moduleText: string | null;
  /** Free text describing the promo/price/package ("PROMO 1 - S/ 69.90 PAQUETE COMPLETO"). */
  promoText: string | null;
  /** Free text with schedule/start-date info ("8:00 PM A 10:00 PM (JÓV/ADULTOS) MÓDULO 2"). */
  scheduleText: string | null;
  /** Free text, whatever's left over — usually a classroom/group code. */
  classroomText: string | null;
  channel: string | null; // WHATSAPP | TIKTOK | FACEBOOK | INSTAGRAM
  bankAccount: string | null; // OOC | OOA
  receiptLinks: string[];
  amountCents: number;
  paymentMethod: PaymentMethod;
  methodDetail: string | null;
  operationNumber: string | null;
  operationNeedsReview: boolean;
  /** Day+month parsed from the row itself, if any ("24 DE AGOSTO" -> {day:24, month:8}). */
  startDateFromRow: { day: number; month: number } | null;
  /** Módulo number (2, 3, 4...) when this row is a mensual/módulo payment, found
   * by searching every free-text field the sheet gave us — moduleText first
   * (CONTI-style sheets carry it as its own field), falling back to whatever
   * text mentions "MÓDULO n" (some plain sheets embed it in the horario cell
   * instead, e.g. "10:30 PM (JÓVENES/ADULTOS) MÓDULO 2"). Null means "paquete
   * completo" — the modality is a fact about the row, not about the sheet. */
  moduleNumber: number | null;
}

export type ParseResult = { ok: true; row: ParsedRow } | { ok: false; reason: string };

const MEDIO_VALUES = new Set(["WHATSAPP", "TIKTOK", "FACEBOOK", "INSTAGRAM"]);
const CUENTA_VALUES = new Set(["OOC", "OOA"]);

const SPANISH_MONTHS: Record<string, number> = {
  ENERO: 1,
  FEBRERO: 2,
  MARZO: 3,
  ABRIL: 4,
  MAYO: 5,
  JUNIO: 6,
  JULIO: 7,
  AGOSTO: 8,
  SETIEMBRE: 9,
  SEPTIEMBRE: 9,
  OCTUBRE: 10,
  NOVIEMBRE: 11,
  DICIEMBRE: 12,
};

const DRIVE_URL_RE = /drive\.google\.com/i;
const YAPE_PLIN_RE = /YAPE|PLIN/i;
const BANK_RE = /(BCP|INTERBANK|BBVA|SCOTIABANK|TRANSFERENCIA)/i;
const PROMO_RE = /PROMO|SIN\s*PROMO/i;
const MODULO_RE = /M[OÓ]DULO\s*\d/i;
const AMPM_RE = /\d{1,2}:\d{2}\s*(AM|PM)/i;
const SPANISH_DATE_RE = /(\d{1,2})\s*DE\s*(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SETIEMBRE|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)/i;
const MONEY_RE = /S\/\.?\s*(\d+(?:[.,]\d{1,2})?)/;
const SOLES_RE = /(\d+(?:[.,]\d{1,2})?)\s*SOLES/i;
const BARE_DECIMAL_RE = /(\d+[.,]\d{2})/;
const SUM_RE = /^(\d+(?:[.,]\d{1,2})?)\s*\+\s*(\d+(?:[.,]\d{1,2})?)$/;
const PURE_NUMBER_RE = /^-?\d+(?:[.,]\d{1,2})?$/;

function cleanText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function normalizeDni(value: unknown): string | null {
  const text = cleanText(value);
  if (!text) return null;
  // Excel often reads a DNI as a float (e.g. 71036145.0) — strip a trailing
  // ".0" rather than round, since these are identifiers, not quantities.
  const stripped = text.replace(/\.0$/, "").replace(/\s+/g, "");
  if (/^[A-Za-z0-9]{5,12}$/.test(stripped)) return stripped;
  // Foreign national IDs (Chilean RUT and similar) come formatted with dots
  // and a check-digit hyphen, e.g. "24.163.949-5", sometimes with a prefix
  // like "Cédula chilena 24417452-3" — real document numbers, not garbage,
  // just not the bare DNI shape.
  const rutMatch = /(\d[\d.]{5,12})-([\dkK])$/.exec(stripped);
  if (rutMatch) return `${rutMatch[1]!.replace(/\./g, "")}-${rutMatch[2]}`;
  return null;
}

function normalizePhone(value: unknown): string | null {
  if (value instanceof Date) return null; // corrupted by Excel's date auto-detection — unrecoverable
  const text = cleanText(value);
  if (!text) return null;

  const wholeDigits = text.replace(/[^\d+]/g, "");
  const wholeBare = wholeDigits.replace(/^\+/, "");
  // A single number formatted with internal dashes/dots/spaces
  // ("999-911-376") strips down to a plausible length directly.
  if (wholeBare.length >= 7 && wholeBare.length <= 15) return wholeDigits;

  // Otherwise it's two numbers crammed into one cell (student + guardian, a
  // retry, or trailing text like "- WhatsApp") — keep only the leading digit
  // run, the primary contact number.
  const leadingMatch = /^\+?[\d\s]+/.exec(text.trim());
  if (!leadingMatch) return null;
  const digits = leadingMatch[0]!.replace(/[^\d+]/g, "");
  const bareDigits = digits.replace(/^\+/, "");
  if (bareDigits.length < 7 || bareDigits.length > 15) return null;
  return digits;
}

function normalizeNationalIdType(value: unknown): NationalIdType | null {
  const text = cleanText(value)?.toUpperCase();
  if (!text) return null;
  if (text === "DNI") return "DNI";
  if (text === "CE") return "CE";
  if (text === "PAS" || text === "PASAPORTE" || text === "PASSPORT") return "passport";
  return null;
}

function normalizeBirthDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // Sanity range: nobody enrolling is born before 1920 or after this year.
    if (value.getFullYear() >= 1920 && value.getFullYear() <= 2026) return value;
    return null;
  }
  const text = cleanText(value);
  if (!text) return null;
  const match = /^(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{2,4})$/.exec(text);
  if (match) {
    const [, d, m, yRaw] = match;
    // Two-digit year: this is a birth date, so the cutoff is "would this
    // person be alive/enrollable" rather than a fixed century pivot — nobody
    // enrolling was born after this year, so yy > (current 2-digit year)
    // means 19xx, otherwise 20xx.
    const year = yRaw!.length === 4 ? Number(yRaw) : Number(yRaw) > 26 ? 1900 + Number(yRaw) : 2000 + Number(yRaw);
    const date = new Date(Date.UTC(year, Number(m) - 1, Number(d)));
    if (!Number.isNaN(date.getTime()) && date.getUTCFullYear() >= 1920 && date.getUTCFullYear() <= 2026) return date;
  }
  return null;
}

/** Only a last-resort match against free text (promo descriptions) — never
 * applied to arbitrary cells, since a bare "\d+.\d{2}" pattern would also
 * match things that aren't money. */
function moneyToCentsLoose(text: string): number | null {
  const match = MONEY_RE.exec(text) ?? SOLES_RE.exec(text) ?? BARE_DECIMAL_RE.exec(text);
  if (!match) return null;
  const amount = Number.parseFloat(match[1]!.replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 5000) return null;
  return Math.round(amount * 100);
}

function moneyToCents(text: string): number | null {
  const match = MONEY_RE.exec(text) ?? SOLES_RE.exec(text);
  if (!match) return null;
  const amount = Number.parseFloat(match[1]!.replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

/** Handles rows that advanced more than one módulo in a single receipt, where
 * the amount was typed as "119.80 + 20" instead of the pre-summed total —
 * seen on real rows in the legacy sheets (CLAUDE.md's "adiantar módulos"). */
function sumToCents(text: string): number | null {
  const match = SUM_RE.exec(text.trim());
  if (!match) return null;
  const a = Number.parseFloat(match[1]!.replace(",", "."));
  const b = Number.parseFloat(match[2]!.replace(",", "."));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((a + b) * 100);
}

function parseOperation(raw: string): {
  method: PaymentMethod;
  methodDetail: string | null;
  operationNumber: string | null;
  needsReview: boolean;
} | null {
  const upper = raw.toUpperCase();

  if (upper.includes("YAPE") || upper.includes("PLIN")) {
    const method: PaymentMethod = upper.includes("PLIN") ? "plin" : "yape";
    const isSinOperacion = /SIN\s*OP/i.test(upper);
    const digits = raw.replace(/[^\d]/g, "");
    if (isSinOperacion || digits.length < 4) {
      return { method, methodDetail: null, operationNumber: digits.length >= 4 ? digits : null, needsReview: true };
    }
    return { method, methodDetail: null, operationNumber: digits, needsReview: false };
  }

  const bankMatch = BANK_RE.exec(upper);
  if (bankMatch) {
    const bank = bankMatch[1]!;
    if (bank === "BCP") return { method: "bcp", methodDetail: null, operationNumber: raw.replace(/[^\d]/g, "") || null, needsReview: false };
    if (bank === "INTERBANK") return { method: "interbank", methodDetail: null, operationNumber: raw.replace(/[^\d]/g, "") || null, needsReview: false };
    return { method: "other", methodDetail: raw, operationNumber: raw.replace(/[^\d]/g, "") || null, needsReview: false };
  }

  return null;
}

export function parseRow(cells: unknown[]): ParseResult {
  const lastName = cleanText(cells[0]);
  const firstName = cleanText(cells[1]);
  const nationalIdType = normalizeNationalIdType(cells[2]);
  const nationalId = normalizeDni(cells[3]);
  const phone = normalizePhone(cells[4]);
  const birthDate = normalizeBirthDate(cells[5]);
  let email = cleanText(cells[6]);
  // A handful of rows are missing just the "@" before a known free-mail
  // domain typed straight after the local part ("name123gmail.com") — an
  // obvious typo, not a different kind of value, worth repairing rather than
  // rejecting.
  if (email && !email.includes("@")) {
    const domainMatch = /^(.+?)(gmail|hotmail|outlook|yahoo)\.com$/i.exec(email.replace(/\s+/g, ""));
    if (domainMatch) email = `${domainMatch[1]}@${domainMatch[2]!.toLowerCase()}.com`;
  }

  if (!lastName || !firstName) return { ok: false, reason: "missing lastName/firstName" };
  if (!nationalIdType) return { ok: false, reason: `unrecognized tipo_documento: ${String(cells[2])}` };
  if (!nationalId) return { ok: false, reason: `invalid national id: ${String(cells[3])}` };
  if (!phone) return { ok: false, reason: `invalid phone: ${String(cells[4])}` };
  if (!birthDate) return { ok: false, reason: `invalid birth date: ${String(cells[5])}` };
  if (!email || !email.includes("@")) return { ok: false, reason: `invalid email: ${String(cells[6])}` };

  // Everything from index 7 onward is classified by content, order-independent.
  const pool = cells
    .slice(7)
    .map((cell) => ({ raw: cell, text: cleanText(cell) }))
    .filter((cell): cell is { raw: unknown; text: string } => cell.text !== null);

  const consumed = new Set<number>();
  const take = (predicate: (text: string) => boolean): string[] => {
    const matches: string[] = [];
    pool.forEach((cell, index) => {
      if (consumed.has(index)) return;
      if (predicate(cell.text)) {
        matches.push(cell.text);
        consumed.add(index);
      }
    });
    return matches;
  };

  let moduleText: string | null = null;
  if (pool.length > 0 && !consumed.has(0) && MODULO_RE.test(pool[0]!.text)) {
    moduleText = pool[0]!.text;
    consumed.add(0);
  }

  const receiptLinks = take((t) => DRIVE_URL_RE.test(t)).flatMap((t) => t.split(",").map((s) => s.trim()));
  const channelMatches = take((t) => MEDIO_VALUES.has(t.toUpperCase()));
  const channel = channelMatches[0] ?? null;
  const bankAccountMatches = take((t) => CUENTA_VALUES.has(t.toUpperCase()));
  const bankAccount = bankAccountMatches[0] ?? null;

  const opMatches = take((t) => YAPE_PLIN_RE.test(t) || BANK_RE.test(t));
  const operationRaw = opMatches[0] ?? null;

  const promoMatches = take((t) => PROMO_RE.test(t));
  const promoText = promoMatches[0] ?? null;

  const numericMatches = take(
    (t) => PURE_NUMBER_RE.test(t.replace(/^S\/\.?\s*/i, "")) || MONEY_RE.test(t) || SUM_RE.test(t.trim()),
  );
  const montoText = numericMatches[0] ?? null;

  const timeMatches = take((t) => AMPM_RE.test(t));
  const scheduleText = timeMatches[0] ?? null;

  const dateMatches = take((t) => SPANISH_DATE_RE.test(t));
  const dateOnlyText = dateMatches[0] ?? null;

  const leftover = pool.filter((_, index) => !consumed.has(index)).map((c) => c.text);
  const classroomText = leftover[0] ?? null;

  if (!operationRaw) return { ok: false, reason: "no recognizable payment method/operation cell" };
  const operation = parseOperation(operationRaw);
  if (!operation) return { ok: false, reason: `unparseable operation text: ${operationRaw}` };

  let amountCents: number | null = null;
  if (montoText && PURE_NUMBER_RE.test(montoText)) {
    amountCents = Math.round(Number.parseFloat(montoText.replace(",", ".")) * 100);
  }
  if (amountCents === null && montoText) amountCents = sumToCents(montoText);
  if (amountCents === null && montoText) amountCents = moneyToCents(montoText.startsWith("S/") ? montoText : `S/ ${montoText}`);
  if (amountCents === null && promoText) amountCents = moneyToCentsLoose(promoText);
  // Sanity bound: real prices in the data run S/1-400 (even "advance several
  // módulos in one receipt" tops out well under that). A misplaced cell —
  // phone, DNI, operation number — reads as a bare integer just as easily as
  // a real amount would, so anything wildly outside that range is a
  // misclassification, not a real price, and belongs in the exceptions
  // report rather than corrupting a financial total silently.
  if (amountCents !== null && (amountCents < 100 || amountCents > 300_000)) amountCents = null;
  if (amountCents === null || amountCents <= 0) return { ok: false, reason: "no parseable amount (monto)" };

  // scheduleText and dateOnlyText are separate matches (an AM/PM cell and a
  // "DD DE MES" cell aren't always the same one — some sheets carry them as
  // two distinct columns) — search both rather than only whichever is
  // non-null first, or a real date in the other one gets silently dropped.
  const dateSource = [scheduleText, dateOnlyText].filter(Boolean).join(" ");
  const dateMatch = SPANISH_DATE_RE.exec(dateSource);
  const startDateFromRow = dateMatch
    ? { day: Number.parseInt(dateMatch[1]!, 10), month: SPANISH_MONTHS[dateMatch[2]!.toUpperCase()]! }
    : null;

  const moduleSearchText = [moduleText, promoText, scheduleText, classroomText].filter(Boolean).join(" | ");
  const moduleMatch = /M[OÓ]DULO\s*(\d+)/i.exec(moduleSearchText);
  const moduleNumber = moduleMatch ? Number.parseInt(moduleMatch[1]!, 10) : null;

  return {
    ok: true,
    row: {
      lastName,
      firstName,
      nationalIdType,
      nationalId,
      phone,
      birthDate,
      email,
      moduleText,
      promoText,
      scheduleText: scheduleText ?? dateOnlyText,
      classroomText,
      channel,
      bankAccount,
      receiptLinks,
      amountCents,
      paymentMethod: operation.method,
      methodDetail: operation.methodDetail,
      operationNumber: operation.operationNumber,
      operationNeedsReview: operation.needsReview,
      startDateFromRow,
      moduleNumber,
    },
  };
}
