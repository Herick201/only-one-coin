import {
  RECEIPT_VALIDATION_ACTOR,
  ValidateReceiptUseCase,
  type EnrollmentEmailContext,
  type IEnrollmentEmailContextLookup,
  type IPlatformSettingsRepository,
  type IReceiptValidationRepository,
  type PlatformSettings,
  type ReceiptValidationEffect,
  type ReceiptValidationSubject,
} from "@ooc/domain";
import { describe, expect, it } from "vitest";

/**
 * The traffic light at the usecase level (OOC-21): the verdict is decided
 * here, and an approval is only prepared for a payment still `pending`. What
 * the transaction guarantees — latest upload only, payment and seat moving
 * together, once — is SQL, covered by
 * DrizzleReceiptValidationRepository.integration.test.ts.
 */

const UPLOAD = "018f2b5c-0000-7000-8000-00000000u001";
const PAYMENT = "018f2b5c-0000-7000-8000-00000000p001";

type RecordParams = Parameters<IReceiptValidationRepository["record"]>[0];

class FakeValidationRepository implements IReceiptValidationRepository {
  recorded: RecordParams[] = [];
  constructor(
    public subject: ReceiptValidationSubject | null,
    private readonly effect: ReceiptValidationEffect = "routed_to_review",
  ) {}

  async findSubject() {
    return this.subject;
  }

  async record(params: RecordParams) {
    this.recorded.push(params);
    return this.effect;
  }
}

class FakeSettings implements IPlatformSettingsRepository {
  constructor(private readonly current: PlatformSettings) {}
  async get() {
    return this.current;
  }
  async setCheckoutHoldMinutes() {}
  async setReceiptAmountToleranceCents() {}
  async setReceiptRejectBelowPercent() {}
}

class FakeEmailContextLookup implements IEnrollmentEmailContextLookup {
  constructor(private readonly context: EnrollmentEmailContext | null) {}
  async find() {
    return this.context;
  }
}

const ADULT_CONTEXT: EnrollmentEmailContext = {
  student: { firstName: "Luis", lastName: "Huamán", email: "luis@gmail.com", birthDate: new Date("1995-05-01T00:00:00.000Z") },
  guardian: null,
  courseName: "Inglés Básico",
  classGroupStartsOn: new Date("2026-11-02T00:00:00.000Z"),
};

const SETTINGS: PlatformSettings = { checkoutHoldMinutes: 15, receiptAmountToleranceCents: 0, receiptRejectBelowPercent: 50 };

function subject(overrides: Partial<ReceiptValidationSubject> = {}): ReceiptValidationSubject {
  return {
    receiptUploadId: UPLOAD,
    paymentId: PAYMENT,
    enrollmentId: "018f2b5c-0000-7000-8000-00000000e001",
    studentId: "018f2b5c-0000-7000-8000-00000000s001",
    classGroupId: "018f2b5c-0000-7000-8000-00000000g001",
    paymentStatus: "pending",
    expectedCents: 15000,
    declaredOperationNumber: "08312457",
    readAmountCents: 15000,
    readOperationNumber: "08312457",
    declaredMethod: "yape",
    readMethod: "yape",
    ...overrides,
  };
}

function useCase(repository: FakeValidationRepository, settings: PlatformSettings = SETTINGS) {
  return new ValidateReceiptUseCase(repository, new FakeSettings(settings), new FakeEmailContextLookup(ADULT_CONTEXT));
}

describe("ValidateReceiptUseCase", () => {
  it("prepares the approval of a green receipt on a pending payment", async () => {
    const repository = new FakeValidationRepository(subject(), "approved");

    const result = await useCase(repository).run({ receiptUploadId: UPLOAD });

    expect(result).toEqual({ outcome: { verdict: "approve", reason: "exact" }, effect: "approved" });
    const recorded = repository.recorded[0]!;
    expect(recorded.approval!.audit).toMatchObject({
      actorId: RECEIPT_VALIDATION_ACTOR,
      action: "payment.auto_approved",
      targetId: PAYMENT,
      metadata: { receiptUploadId: UPLOAD, reason: "exact" },
    });
    expect(recorded.approval!.notifications.map((email) => [email.templateKey, email.to])).toEqual([
      ["payment_approved", "luis@gmail.com"],
    ]);
  });

  it("records what the verdict was decided with", async () => {
    const repository = new FakeValidationRepository(subject({ readAmountCents: 15040 }));

    await useCase(repository, { ...SETTINGS, receiptAmountToleranceCents: 50, receiptRejectBelowPercent: 60 }).run({
      receiptUploadId: UPLOAD,
    });

    expect(repository.recorded[0]!.detail).toEqual({
      reason: "within_tolerance",
      expectedCents: 15000,
      readCents: 15040,
      toleranceCents: 50,
      rejectBelowPercent: 60,
    });
  });

  it("never prepares an approval for a payment already under review", async () => {
    const repository = new FakeValidationRepository(subject({ paymentStatus: "under_review" }), "none");

    const result = await useCase(repository).run({ receiptUploadId: UPLOAD });

    expect(result.outcome).toEqual({ verdict: "approve", reason: "exact" });
    expect(repository.recorded[0]!.approval).toBeNull();
  });

  it("suggests rejection without preparing anything to settle", async () => {
    const repository = new FakeValidationRepository(subject({ readAmountCents: 4000 }));

    const result = await useCase(repository).run({ receiptUploadId: UPLOAD });

    expect(result.outcome).toEqual({ verdict: "reject_suggested", reason: "far_below" });
    expect(repository.recorded[0]!.approval).toBeNull();
  });

  it("sends a failed reading to review", async () => {
    const repository = new FakeValidationRepository(subject({ readAmountCents: null, readOperationNumber: null }));

    const result = await useCase(repository).run({ receiptUploadId: UPLOAD });

    expect(result.outcome).toEqual({ verdict: "review", reason: "amount_unread" });
    expect(repository.recorded[0]!.detail.readCents).toBeNull();
  });

  it("sends a green amount to review when the method read is not the declared one", async () => {
    const repository = new FakeValidationRepository(subject({ readMethod: "bcp" }));

    const result = await useCase(repository).run({ receiptUploadId: UPLOAD });

    expect(result.outcome).toEqual({ verdict: "review", reason: "payment_method_mismatch" });
    expect(repository.recorded[0]!.approval).toBeNull();
  });

  it("does nothing when there is nothing to validate", async () => {
    const repository = new FakeValidationRepository(null);

    const result = await useCase(repository).run({ receiptUploadId: UPLOAD });

    expect(result).toEqual({ outcome: null, effect: null });
    expect(repository.recorded).toEqual([]);
  });
});
