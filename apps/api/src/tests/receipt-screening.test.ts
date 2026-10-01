import { describe, expect, it } from "vitest";
import {
  MAX_LOOKALIKE_SIGNALS,
  ScreenReceiptUploadUseCase,
  exifSignals,
  normalizeOperationNumber,
  payerNameMatches,
  routesToHumanReview,
  type IReceiptScreeningRepository,
  type ReceiptFraudSignal,
  type ReceiptLookalike,
  type ReceiptScreeningSubject,
} from "@ooc/domain";

/**
 * The receipt antifraud rules (OOC-22) at the domain level: fakes, no
 * Postgres. The SQL half — the operation-number guard and the lookalike
 * query — is in DrizzleReceiptScreeningRepository.integration.test.ts.
 */

describe("normalizeOperationNumber", () => {
  it.each([
    ["08312457", "08312457"],
    ["0831-2457", "08312457"],
    [" 0831 2457 ", "08312457"],
    ["ab12-cd34", "AB12CD34"],
  ])("%s → %s", (raw, expected) => {
    expect(normalizeOperationNumber(raw)).toBe(expected);
  });

  it("keeps leading zeros — a bank that prints them means them", () => {
    expect(normalizeOperationNumber("00451267")).not.toBe(normalizeOperationNumber("451267"));
  });
});

describe("exifSignals", () => {
  it("nothing to say without EXIF — a screenshot is the honest default", () => {
    expect(exifSignals(null)).toEqual([]);
  });

  it("flags an image editor in Software", () => {
    expect(exifSignals({ software: "Adobe Photoshop 25.0 (Windows)", capturedAt: null, modifiedAt: null })).toEqual([
      { kind: "edited_with_software", software: "Adobe Photoshop 25.0 (Windows)" },
    ]);
  });

  it.each(["Android", "iOS 18.1", "HDR+ 1.0.540104767zd", "Samsung Camera"])(
    "a phone's own camera or OS is not an editor: %s",
    (software) => {
      expect(exifSignals({ software, capturedAt: null, modifiedAt: null })).toEqual([]);
    },
  );

  it("flags a file saved well after it was captured", () => {
    expect(
      exifSignals({ software: null, capturedAt: "2026-09-29T10:42:00.000Z", modifiedAt: "2026-09-30T12:00:00.000Z" }),
    ).toEqual([
      { kind: "modified_after_capture", capturedAt: "2026-09-29T10:42:00.000Z", modifiedAt: "2026-09-30T12:00:00.000Z" },
    ]);
  });

  it("a camera writing DateTime a few seconds after DateTimeOriginal is not an edit", () => {
    expect(
      exifSignals({ software: null, capturedAt: "2026-09-29T10:42:00.000Z", modifiedAt: "2026-09-29T10:42:03.000Z" }),
    ).toEqual([]);
  });
});

describe("payerNameMatches", () => {
  const people = [
    { firstName: "María José", lastName: "Pérez García" },
    { firstName: "Rosa", lastName: "García Quispe" },
  ];

  it.each([
    "PEREZ GARCIA MARIA JOSE",
    "María J. Pérez",
    "maria perez g",
    "QUISPE ROSA",
  ])("matches %s", (payer) => {
    expect(payerNameMatches(payer, people)).toBe(true);
  });

  it("a surname alone is not the person — siblings and cousins share it", () => {
    expect(payerNameMatches("GARCIA LUIS", people)).toBe(false);
  });

  it("initials never match on their own", () => {
    expect(payerNameMatches("M. P.", people)).toBe(false);
  });

  it("a given name of one person and a surname of another is nobody", () => {
    expect(payerNameMatches("ROSA PEREZ", people)).toBe(false);
  });

  it("an empty payer matches nobody", () => {
    expect(payerNameMatches("", people)).toBe(false);
  });
});

describe("routesToHumanReview", () => {
  const routed: ReceiptFraudSignal[] = [
    { kind: "identical_file", receiptUploadId: "r", paymentId: "p" },
    { kind: "edited_with_software", software: "GIMP" },
    { kind: "modified_after_capture", capturedAt: "a", modifiedAt: "b" },
  ];
  const recordedOnly: ReceiptFraudSignal[] = [
    // Every Yape receipt is close to every other one (decision 30/09/2026).
    { kind: "similar_image", receiptUploadId: "r", paymentId: "p", distance: 2 },
    { kind: "payer_name_mismatch", payerName: "TIO PEPE" },
  ];

  it.each(routed.map((signal) => [signal.kind, signal] as const))("%s routes", (_kind, signal) => {
    expect(routesToHumanReview(signal)).toBe(true);
  });

  it.each(recordedOnly.map((signal) => [signal.kind, signal] as const))("%s is only recorded", (_kind, signal) => {
    expect(routesToHumanReview(signal)).toBe(false);
  });
});

class FakeScreeningRepository implements IReceiptScreeningRepository {
  recorded: Array<{ signals: ReceiptFraudSignal[]; routeToReview: boolean }> = [];

  constructor(
    private readonly subject: ReceiptScreeningSubject | null,
    private readonly lookalikes: ReceiptLookalike[] = [],
  ) {}

  findSubject(): Promise<ReceiptScreeningSubject | null> {
    return Promise.resolve(this.subject);
  }

  findLookalikes(): Promise<ReceiptLookalike[]> {
    return Promise.resolve(this.lookalikes);
  }

  recordScreening(params: { signals: ReceiptFraudSignal[]; routeToReview: boolean }): Promise<void> {
    this.recorded.push({ signals: params.signals, routeToReview: params.routeToReview });
    return Promise.resolve();
  }
}

const SUBJECT: ReceiptScreeningSubject = { receiptUploadId: "upload-new", paymentId: "payment-new", exif: null };

function similar(n: number, distance: number): ReceiptLookalike {
  return { receiptUploadId: `upload-${n}`, paymentId: `payment-${n}`, match: { kind: "similar", distance } };
}

describe("ScreenReceiptUploadUseCase", () => {
  it("does nothing when there is nothing to screen yet", async () => {
    const repository = new FakeScreeningRepository(null);
    const output = await new ScreenReceiptUploadUseCase(repository).run({ receiptUploadId: "upload-new" });

    expect(output).toEqual({ signals: null, routedToReview: false });
    expect(repository.recorded).toEqual([]);
  });

  it("a clean receipt is stamped as screened with no signals and stays where it was", async () => {
    const repository = new FakeScreeningRepository(SUBJECT);
    await new ScreenReceiptUploadUseCase(repository).run({ receiptUploadId: "upload-new" });

    expect(repository.recorded).toEqual([{ signals: [], routeToReview: false }]);
  });

  it("a merely similar image is recorded for the reviewer but does not route the payment", async () => {
    const repository = new FakeScreeningRepository(SUBJECT, [similar(1, 3)]);
    await new ScreenReceiptUploadUseCase(repository).run({ receiptUploadId: "upload-new" });

    expect(repository.recorded).toEqual([
      {
        signals: [{ kind: "similar_image", receiptUploadId: "upload-1", paymentId: "payment-1", distance: 3 }],
        routeToReview: false,
      },
    ]);
  });

  it("an identical file routes the payment to the human queue, named first", async () => {
    const repository = new FakeScreeningRepository(SUBJECT, [
      similar(1, 1),
      { receiptUploadId: "upload-2", paymentId: "payment-2", match: { kind: "identical" } },
    ]);
    const output = await new ScreenReceiptUploadUseCase(repository).run({ receiptUploadId: "upload-new" });

    expect(output.routedToReview).toBe(true);
    expect(repository.recorded[0]?.signals[0]).toEqual({
      kind: "identical_file",
      receiptUploadId: "upload-2",
      paymentId: "payment-2",
    });
  });

  it("EXIF signals route on their own", async () => {
    const repository = new FakeScreeningRepository({
      ...SUBJECT,
      exif: { software: "Snapseed 2.0", capturedAt: null, modifiedAt: null },
    });
    const output = await new ScreenReceiptUploadUseCase(repository).run({ receiptUploadId: "upload-new" });

    expect(output).toEqual({
      signals: [{ kind: "edited_with_software", software: "Snapseed 2.0" }],
      routedToReview: true,
    });
  });

  it(`names at most ${MAX_LOOKALIKE_SIGNALS} lookalikes, closest first`, async () => {
    const repository = new FakeScreeningRepository(
      SUBJECT,
      [6, 1, 5, 2, 4, 3, 0].map((distance, n) => similar(n, distance)),
    );
    await new ScreenReceiptUploadUseCase(repository).run({ receiptUploadId: "upload-new" });

    const distances = repository.recorded[0]!.signals.map((signal) =>
      signal.kind === "similar_image" ? signal.distance : null,
    );
    expect(distances).toEqual([0, 1, 2, 3, 4]);
  });
});
