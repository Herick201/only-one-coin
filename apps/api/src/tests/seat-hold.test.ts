import { describe, expect, it } from "vitest";
import {
  ClaimSeatHoldUseCase,
  ClassGroupFullError,
  ClassGroupNotFoundError,
  Enrollment,
  EnrollmentOriginInputSchema,
  InvalidPlatformSettingError,
  SeatHoldExpiredError,
  SubmitPublicEnrollmentUseCase,
  UpdateCheckoutHoldMinutesUseCase,
  type AuditLogEntry,
  type ClaimSeatHoldResult,
  type EnrollmentOrigin,
  type IAuditLogRepository,
  type IPlatformSettingsRepository,
  type IPublicEnrollmentRepository,
  type ISeatHoldRepository,
  type PublicEnrollmentContext,
  type SeatHold,
  type SubmitPublicEnrollmentInput,
  type SubmitPublicEnrollmentParams,
} from "@ooc/domain";

/**
 * The checkout hold and the channel it carries (apps/api/CLAUDE.md, "Dois
 * relógios" and "Origem da matrícula"), at the usecase level: fakes, no
 * Postgres. What the atomic statements themselves guarantee — the seat taken
 * and handed back exactly once, the expiry on the database clock — is SQL,
 * covered by DrizzleSeatHoldRepository.integration.test.ts.
 */

const CLASS_GROUP_ID = "018f2b5c-4000-7000-8000-000000000001";
const OTHER_CLASS_GROUP_ID = "018f2b5c-4000-7000-8000-000000000002";
const PLAN_ID = "018f2b5c-4000-7000-8000-000000000003";
const PLAN_PRICE_ID = "018f2b5c-4000-7000-8000-000000000004";
const HOLD_ID = "9f1c2d3e-4a5b-4c6d-8e7f-0a1b2c3d4e5f";

class FakeSeatHolds implements ISeatHoldRepository {
  claims: { classGroupId: string; origin: EnrollmentOrigin; holdMinutes: number }[] = [];

  constructor(
    private readonly onFile: SeatHold | null,
    private readonly claimResult: ClaimSeatHoldResult["kind"] = "held",
  ) {}

  async claim(params: { classGroupId: string; origin: EnrollmentOrigin; holdMinutes: number }) {
    this.claims.push(params);
    if (this.claimResult !== "held") return { kind: this.claimResult } as ClaimSeatHoldResult;
    return {
      kind: "held" as const,
      hold: {
        id: HOLD_ID,
        classGroupId: params.classGroupId,
        origin: params.origin,
        expiresAt: new Date(Date.now() + params.holdMinutes * 60_000),
      },
    };
  }

  async find(id: string) {
    return this.onFile && this.onFile.id === id ? this.onFile : null;
  }

  async release() {
    return true;
  }

  async expireDue() {
    return 0;
  }
}

class FakeSettings implements IPlatformSettingsRepository {
  writes: { minutes: number; actorId: string }[] = [];

  constructor(public checkoutHoldMinutes = 15) {}

  async get() {
    return { checkoutHoldMinutes: this.checkoutHoldMinutes };
  }

  async setCheckoutHoldMinutes(minutes: number, actorId: string) {
    this.writes.push({ minutes, actorId });
    this.checkoutHoldMinutes = minutes;
  }
}

class FakeAuditLog implements IAuditLogRepository {
  entries: AuditLogEntry[] = [];

  async append(entry: AuditLogEntry) {
    this.entries.push(entry);
  }
}

class FakePublicEnrollments implements IPublicEnrollmentRepository {
  params: SubmitPublicEnrollmentParams | null = null;

  async findContext(): Promise<PublicEnrollmentContext> {
    return {
      courseMinAge: 7,
      planPriceId: PLAN_PRICE_ID,
      amountCents: 25000,
      courseName: "Inglés Básico",
      classGroupStartsOn: new Date("2026-10-05T13:00:00.000Z"),
    };
  }

  async submit(params: SubmitPublicEnrollmentParams) {
    this.params = params;
    return { student: params.student, guardian: params.guardian, enrollment: params.enrollment, payment: params.payment };
  }
}

function hold(origin: EnrollmentOrigin, classGroupId = CLASS_GROUP_ID): SeatHold {
  return { id: HOLD_ID, classGroupId, origin, expiresAt: new Date(Date.now() + 60_000) };
}

const SUBMIT: SubmitPublicEnrollmentInput = {
  seatHoldId: HOLD_ID,
  classGroupId: CLASS_GROUP_ID,
  planId: PLAN_ID,
  student: {
    firstName: "Rosa",
    lastName: "Quispe",
    nationalIdType: "DNI",
    nationalId: "70123456",
    email: "rosa.quispe@gmail.com",
    phone: "+51987654321",
    birthDate: new Date("1996-04-12T00:00:00.000Z"),
    country: "PE",
    region: "Lima",
    city: "Chorrillos",
  },
  guardian: null,
  consent: null,
  locale: "es-PE",
  payment: {
    method: "yape",
    methodDetail: null,
    operationNumber: "00012345",
    idempotencyKey: "018f2b5c-4000-7000-8000-0000000000aa",
  },
};

describe("origin as a closed union", () => {
  it("keeps the known channels and turns anything else into web", () => {
    expect(EnrollmentOriginInputSchema.parse("whatsapp")).toBe("whatsapp");
    expect(EnrollmentOriginInputSchema.parse("web")).toBe("web");
    expect(EnrollmentOriginInputSchema.parse("WhatsApp")).toBe("web");
    expect(EnrollmentOriginInputSchema.parse("<script>")).toBe("web");
    expect(EnrollmentOriginInputSchema.parse(42)).toBe("web");
  });

  it("records a manual backoffice enrollment as whatsapp", () => {
    const enrollment = Enrollment.createManual({
      studentId: "018f2b5c-4000-7000-8000-000000000010",
      classGroupId: CLASS_GROUP_ID,
      planPriceId: PLAN_PRICE_ID,
    });
    expect(enrollment.origin).toBe("whatsapp");
  });
});

describe("ClaimSeatHoldUseCase", () => {
  it("holds the seat for the minutes configured in the backoffice", async () => {
    const seatHolds = new FakeSeatHolds(null);
    const useCase = new ClaimSeatHoldUseCase(seatHolds, new FakeSettings(25));

    const result = await useCase.run({ classGroupId: CLASS_GROUP_ID, origin: "whatsapp" });

    expect(seatHolds.claims).toEqual([{ classGroupId: CLASS_GROUP_ID, origin: "whatsapp", holdMinutes: 25 }]);
    expect(result.origin).toBe("whatsapp");
  });

  it("refuses a full class group", async () => {
    const useCase = new ClaimSeatHoldUseCase(new FakeSeatHolds(null, "full"), new FakeSettings());
    await expect(useCase.run({ classGroupId: CLASS_GROUP_ID, origin: "web" })).rejects.toBeInstanceOf(
      ClassGroupFullError,
    );
  });

  it("refuses a class group that is not on offer", async () => {
    const useCase = new ClaimSeatHoldUseCase(new FakeSeatHolds(null, "not_found"), new FakeSettings());
    await expect(useCase.run({ classGroupId: CLASS_GROUP_ID, origin: "web" })).rejects.toBeInstanceOf(
      ClassGroupNotFoundError,
    );
  });
});

describe("SubmitPublicEnrollmentUseCase and the hold", () => {
  it("writes the origin recorded on the hold onto the enrollment", async () => {
    const repository = new FakePublicEnrollments();
    const useCase = new SubmitPublicEnrollmentUseCase(repository, new FakeSeatHolds(hold("whatsapp")));

    await useCase.run(SUBMIT);

    expect(repository.params!.enrollment.origin).toBe("whatsapp");
    expect(repository.params!.seatHoldId).toBe(HOLD_ID);
  });

  it("refuses a hold that does not exist", async () => {
    const repository = new FakePublicEnrollments();
    const useCase = new SubmitPublicEnrollmentUseCase(repository, new FakeSeatHolds(null));

    await expect(useCase.run(SUBMIT)).rejects.toBeInstanceOf(SeatHoldExpiredError);
    expect(repository.params).toBeNull();
  });

  it("refuses a hold on another class group — a seat cannot change class groups", async () => {
    const repository = new FakePublicEnrollments();
    const useCase = new SubmitPublicEnrollmentUseCase(
      repository,
      new FakeSeatHolds(hold("web", OTHER_CLASS_GROUP_ID)),
    );

    await expect(useCase.run(SUBMIT)).rejects.toBeInstanceOf(SeatHoldExpiredError);
    expect(repository.params).toBeNull();
  });
});

describe("UpdateCheckoutHoldMinutesUseCase", () => {
  it("writes the new value and appends who moved it, from and to", async () => {
    const settings = new FakeSettings(15);
    const auditLog = new FakeAuditLog();
    const useCase = new UpdateCheckoutHoldMinutesUseCase(settings, auditLog);

    await useCase.run({ actorId: "staff-1", minutes: 20 });

    expect(settings.writes).toEqual([{ minutes: 20, actorId: "staff-1" }]);
    expect(auditLog.entries).toHaveLength(1);
    expect(auditLog.entries[0]).toMatchObject({
      actorId: "staff-1",
      action: "platform_settings.checkout_hold_minutes",
      metadata: { from: 15, to: 20 },
    });
  });

  it("writes nothing and audits nothing when the value does not change", async () => {
    const settings = new FakeSettings(15);
    const auditLog = new FakeAuditLog();

    await new UpdateCheckoutHoldMinutesUseCase(settings, auditLog).run({ actorId: "staff-1", minutes: 15 });

    expect(settings.writes).toEqual([]);
    expect(auditLog.entries).toEqual([]);
  });

  it.each([0, 4, 61, 15.5])("refuses %s minutes", async (minutes) => {
    const settings = new FakeSettings(15);
    const useCase = new UpdateCheckoutHoldMinutesUseCase(settings, new FakeAuditLog());

    await expect(useCase.run({ actorId: "staff-1", minutes })).rejects.toBeInstanceOf(InvalidPlatformSettingError);
    expect(settings.writes).toEqual([]);
  });
});
