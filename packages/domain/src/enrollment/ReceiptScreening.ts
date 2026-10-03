import type { PaymentMethod } from "./Payment.js";

/**
 * What the antifraud screening of a receipt found (OOC-22). A signal is
 * evidence for the reviewer, never a verdict: none of them rejects anything
 * on its own, and only the ones `routesToHumanReview` names send the payment
 * to the human queue (decisions of 30/09/2026, apps/api/CLAUDE.md
 * "Antifraude do comprovante").
 *
 * The one hard block in the whole feature is the operation number, and it
 * is not a signal — it refuses the submit itself
 * (`OperationNumberAlreadyUsedError`).
 */
export type ReceiptFraudSignal =
  /** Byte-for-byte the same file as a receipt already attached to another
   * payment. The strongest image signal there is. */
  | { kind: "identical_file"; receiptUploadId: string; paymentId: string }
  /** Perceptually close to a receipt attached to another payment — the same
   * photo recompressed, brightened or with its status bar cropped lands
   * here. Recorded, never routed: every Yape receipt is close to every other
   * Yape receipt (another student, even another price), because what
   * differs is text too small for a perceptual hash to see. Routing on it
   * would send every Yape payment to the queue. It is evidence to combine
   * with the operation number the OCR reads, not a finding on its own.
   * `distance` is the Hamming distance of the closest pair. */
  | { kind: "similar_image"; receiptUploadId: string; paymentId: string; distance: number }
  /** The file's metadata names an image editor. Most receipts are
   * screenshots with no EXIF at all, so the absence of metadata is never a
   * signal — only its presence saying something. */
  | { kind: "edited_with_software"; software: string }
  /** The file was written after the moment it was captured, by more than
   * `EXIF_EDIT_GRACE_MS` — what an edit-and-save leaves behind. */
  | { kind: "modified_after_capture"; capturedAt: string; modifiedAt: string }
  /** The payer named on the receipt is neither the student nor the guardian.
   * A relative paying is ordinary, so this only informs the reviewer. Not
   * produced yet: the OCR reads the payer's name since OOC-20
   * (`payment_receipts.extracted_fields`), but it is not wired to
   * `payerNameMatches` yet: OOC-21's validation left the
   * payer out (a parent paying is normal; a mismatch only informs). */
  | { kind: "payer_name_mismatch"; payerName: string };

export type ReceiptFraudSignalKind = ReceiptFraudSignal["kind"];

/** Every kind the screening can write, once — for whatever reads
 * `receipt_uploads.fraud_signals` back (a jsonb the database does not hold to
 * the union) and for the response schemas that serve it. `satisfies` keeps
 * the list from naming a kind the union lacks; `allKindsListed` keeps it from
 * missing one. */
export const RECEIPT_FRAUD_SIGNAL_KINDS = [
  "identical_file",
  "similar_image",
  "edited_with_software",
  "modified_after_capture",
  "payer_name_mismatch",
] as const satisfies readonly ReceiptFraudSignalKind[];

const allKindsListed: Exclude<ReceiptFraudSignalKind, (typeof RECEIPT_FRAUD_SIGNAL_KINDS)[number]> extends never
  ? true
  : false = true;

/** Whether a value read back from storage is a kind this version knows. */
export function isReceiptFraudSignalKind(value: unknown): value is ReceiptFraudSignalKind {
  return allKindsListed && (RECEIPT_FRAUD_SIGNAL_KINDS as readonly unknown[]).includes(value);
}

/** The signals specific enough to take a payment out of any automatic path.
 * `similar_image` is too common to (see above); `payer_name_mismatch` is
 * ordinary (a parent or relative paying) and only informs. */
const ROUTING_SIGNALS: ReadonlySet<ReceiptFraudSignalKind> = new Set([
  "identical_file",
  "edited_with_software",
  "modified_after_capture",
]);

export function routesToHumanReview(signal: ReceiptFraudSignal): boolean {
  return ROUTING_SIGNALS.has(signal.kind);
}

/** The subset of a file's EXIF the screening reads — extracted in the
 * normalize worker, before the metadata is stripped. Never GPS, never the
 * device serial: only what a signal is built from. */
export interface ReceiptExifFacts {
  software: string | null;
  capturedAt: string | null;
  modifiedAt: string | null;
}

/** An image that went through one of these left its name in `Software`.
 * Matched case-insensitively as a substring. A phone's own camera or OS
 * ("Android", "iOS 18.1", "HDR+") is deliberately absent — that is every
 * honest photo. */
const EDITING_SOFTWARE = [
  "photoshop",
  "lightroom",
  "gimp",
  "snapseed",
  "picsart",
  "canva",
  "pixlr",
  "fotor",
  "photodirector",
  "polarr",
  "meitu",
  "paint.net",
  "affinity photo",
  "photopea",
];

/** Cameras write `DateTime` a beat after `DateTimeOriginal` on their own; an
 * editor rewrites it when it saves. A minute separates the two. */
const EXIF_EDIT_GRACE_MS = 60_000;

export function exifSignals(facts: ReceiptExifFacts | null): ReceiptFraudSignal[] {
  if (!facts) {
    return [];
  }

  const signals: ReceiptFraudSignal[] = [];

  const software = facts.software?.trim() ?? "";
  if (software !== "" && EDITING_SOFTWARE.some((name) => software.toLowerCase().includes(name))) {
    signals.push({ kind: "edited_with_software", software });
  }

  if (facts.capturedAt && facts.modifiedAt) {
    const captured = Date.parse(facts.capturedAt);
    const modified = Date.parse(facts.modifiedAt);
    if (!Number.isNaN(captured) && !Number.isNaN(modified) && modified - captured > EXIF_EDIT_GRACE_MS) {
      signals.push({ kind: "modified_after_capture", capturedAt: facts.capturedAt, modifiedAt: facts.modifiedAt });
    }
  }

  return signals;
}

/**
 * The comparable form of an operation number: letters and digits only,
 * upper-case. The same operation typed as `0831-2457` and `08312457`, or
 * with a stray space, is the same operation. Leading zeros are kept — a
 * bank that prints them is saying they are part of the number.
 *
 * Mirrored in SQL by `operationNumberKey` in
 * apps/api/src/infra/persistence/enrollment/operationNumberGuard.ts — the
 * two must change together.
 */
export function normalizeOperationNumber(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/** Uniqueness is per payment method (decision 30/09/2026): Plin and the
 * banks print short numbers, and the same six digits on a Yape receipt and
 * on a BCP transfer are two different operations. */
export interface OperationNumberClaim {
  method: PaymentMethod;
  operationNumber: string;
}

/**
 * Whether the payer printed on a receipt is one of the people the
 * enrollment names (student or guardian). Banks print the account holder in
 * wildly different shapes — `PEREZ GARCIA JUAN`, `Juan P. Pérez`, `JUAN
 * PEREZ G` — so this compares tokens, not strings: accents and case
 * dropped, and a match needs one given name and one surname of the same
 * person to appear. Initials (`P.`) never count as a match on their own.
 */
export function payerNameMatches(
  payerName: string,
  people: ReadonlyArray<{ firstName: string; lastName: string }>,
): boolean {
  const payerTokens = new Set(nameTokens(payerName));
  if (payerTokens.size === 0) {
    return false;
  }

  return people.some((person) => {
    const given = nameTokens(person.firstName);
    const family = nameTokens(person.lastName);
    return given.some((token) => payerTokens.has(token)) && family.some((token) => payerTokens.has(token));
  });
}

function nameTokens(name: string): string[] {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((token) => token.length > 1);
}
