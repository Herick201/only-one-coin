// Maps a sheet name to (course, sheet-level month/year) and flags sheets
// that are exception buckets from the old manual process or work copies of
// another sheet in the same file.

export interface SheetInfo {
  /** Stable key for the course this sheet's rows belong to — modality
   * (paquete/mensual) is a per-row fact (parse-row.ts moduleNumber), not a
   * sheet fact, since plain "INGLÉS <date>" sheets mix both. */
  courseKey: string;
  courseName: string;
  language: string;
  /** Day+month embedded in the sheet name ("INGLÉS 03 AGOSTO" -> {day:3,
   * month:8}) — used only as a fallback for rows whose own text didn't
   * carry a parseable date. */
  fallbackDate: { day: number; month: number } | null;
  /** 'rejected' for the old PAGOS ERRONEOS bucket, 'under_review' for the "se
   * derivó para verificar" bucket — every row in the sheet gets this payment
   * status regardless of how cleanly it parses otherwise. Null = derive
   * per-row as usual (approved unless the operation itself looks shaky). */
  statusOverride: "rejected" | "under_review" | null;
  /** True for a sheet that is a working copy of another sheet in the same
   * file ("Copia de X", "buscar X") — still parsed, but de-duplicated
   * against its sibling by (nationalId, operationNumber) before import. */
  isWorkingCopy: boolean;
  /** The sibling sheet name a working copy was cloned from, normalized the
   * same way canonicalSheetName() would render it — used to group siblings. */
  canonicalName: string;
}

const MONTHS: Record<string, number> = {
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
  SEPTEIMBRE: 9, // real typo present in a sheet name, kept literal on purpose
  OCTUBRE: 10,
  NOVIEMBRE: 11,
  DICIEMBRE: 12,
};

function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalizeSheetName(name: string): string {
  return stripAccents(name).toUpperCase().trim().replace(/\s+/g, " ");
}

// Sheet names abbreviate the month sometimes ("28SEPT", "14 SET") where row
// text never does — kept as a separate alias table rather than widening
// MONTHS itself, since "SET"/"SEPT" as a bare row-text match would be too
// eager (risk of matching inside unrelated words).
const MONTH_WORDS = { ...MONTHS, SEPT: 9, SET: 9 };
const DAY_MONTH_RE = new RegExp(`(\\d{1,2})\\s*(?:DE)?\\s*(${Object.keys(MONTH_WORDS).join("|")})`, "i");

function fallbackDateOf(name: string): { day: number; month: number } | null {
  const upper = normalizeSheetName(name);
  const match = DAY_MONTH_RE.exec(upper);
  if (!match) return null;
  return { day: Number.parseInt(match[1]!, 10), month: MONTH_WORDS[match[2]!.toUpperCase() as keyof typeof MONTH_WORDS] };
}

const LANGUAGE_PREFIXES: { match: RegExp; language: string }[] = [
  { match: /^ITALIANO/, language: "Italiano" },
  { match: /^ALEMAN/, language: "Alemán" },
  { match: /^FRANCES/, language: "Francés" },
  { match: /^CHINO/, language: "Chino Mandarín" },
  { match: /^PORTUGUES/, language: "Portugués" },
  { match: /^RUSO/, language: "Ruso" },
];

export function classifySheet(sheetName: string): SheetInfo {
  const upper = normalizeSheetName(sheetName);
  const fallbackDate = fallbackDateOf(sheetName);

  if (upper.includes("PAGOS ERRONEOS")) {
    return {
      courseKey: "unknown",
      courseName: "unknown",
      language: "unknown",
      fallbackDate,
      statusOverride: "rejected",
      isWorkingCopy: false,
      canonicalName: upper,
    };
  }
  if (upper.includes("SE DERIVO") || upper.includes("VERIFIQUEN")) {
    return {
      courseKey: "unknown",
      courseName: "unknown",
      language: "unknown",
      fallbackDate,
      statusOverride: "under_review",
      isWorkingCopy: false,
      canonicalName: upper,
    };
  }

  let working = upper;
  let isWorkingCopy = false;
  const copyMatch = /^COPIA DE (.+?)(\s+\d+)?$/.exec(working);
  if (copyMatch) {
    isWorkingCopy = true;
    working = copyMatch[1]!.trim();
  } else if (working.startsWith("BUSCAR ")) {
    isWorkingCopy = true;
    working = working.replace(/^BUSCAR\s+/, "");
    // "buscar 03 agosto" -> canonical is the plain "INGLÉS 03 AGOSTO" sheet,
    // not a bare date — the sheet only carries the date, so route it to the
    // Inglés family explicitly.
    working = `INGLES ${working}`;
  }
  const canonicalName = working;

  let courseKey: string;
  let courseName: string;
  let language = "Inglés";

  if (working.includes("INTERAVAN")) {
    courseKey = "ingles_intermedio_avanzado";
    courseName = "Inglés Intermedio/Avanzado";
  } else if (working.startsWith("INGLES") || working.startsWith("CONTI")) {
    courseKey = "ingles_basico";
    courseName = "Inglés Básico";
  } else {
    const found = LANGUAGE_PREFIXES.find((p) => p.match.test(working));
    if (found) {
      language = found.language;
      courseKey = stripAccents(found.language).toLowerCase().replace(/[^a-z]/g, "_");
      courseName = found.language;
    } else {
      courseKey = "unknown";
      courseName = "unknown";
      language = "unknown";
    }
  }

  return { courseKey, courseName, language, fallbackDate, statusOverride: null, isWorkingCopy, canonicalName };
}
