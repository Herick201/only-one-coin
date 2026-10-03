import {
  InvalidPlatformSettingError,
  UpdateReceiptAmountToleranceUseCase,
  UpdateReceiptRejectBelowPercentUseCase,
  type AuditLogEntry,
  type IAuditLogRepository,
  type IPlatformSettingsRepository,
  type PlatformSettings,
} from "@ooc/domain";
import { describe, expect, it } from "vitest";

/**
 * The two numbers the receipt traffic light reads (OOC-21) — backoffice
 * settings, never constants (apps/api/CLAUDE.md, Pagamento). Same shape as
 * the checkout hold: bounded, no-op when unchanged, every change audited.
 */

class FakeSettings implements IPlatformSettingsRepository {
  writes: { field: string; value: number; actorId: string }[] = [];
  constructor(public current: PlatformSettings = { checkoutHoldMinutes: 15, receiptAmountToleranceCents: 0, receiptRejectBelowPercent: 50 }) {}

  async get() {
    return this.current;
  }
  async setCheckoutHoldMinutes(minutes: number, actorId: string) {
    this.writes.push({ field: "checkoutHoldMinutes", value: minutes, actorId });
  }
  async setReceiptAmountToleranceCents(cents: number, actorId: string) {
    this.writes.push({ field: "receiptAmountToleranceCents", value: cents, actorId });
  }
  async setReceiptRejectBelowPercent(percent: number, actorId: string) {
    this.writes.push({ field: "receiptRejectBelowPercent", value: percent, actorId });
  }
}

class FakeAuditLog implements IAuditLogRepository {
  entries: AuditLogEntry[] = [];
  async append(entry: AuditLogEntry) {
    this.entries.push(entry);
  }
}

describe("UpdateReceiptAmountToleranceUseCase", () => {
  it("writes the new tolerance and audits from and to", async () => {
    const settings = new FakeSettings();
    const audit = new FakeAuditLog();

    const result = await new UpdateReceiptAmountToleranceUseCase(settings, audit).run({ actorId: "staff-1", cents: 50 });

    expect(result).toEqual({ receiptAmountToleranceCents: 50 });
    expect(settings.writes).toEqual([{ field: "receiptAmountToleranceCents", value: 50, actorId: "staff-1" }]);
    expect(audit.entries[0]).toMatchObject({
      actorId: "staff-1",
      action: "platform_settings.receipt_amount_tolerance_cents",
      targetId: "receipt_amount_tolerance_cents",
      metadata: { from: 0, to: 50 },
    });
  });

  it("writes and audits nothing when the value does not change", async () => {
    const settings = new FakeSettings();
    const audit = new FakeAuditLog();

    await new UpdateReceiptAmountToleranceUseCase(settings, audit).run({ actorId: "staff-1", cents: 0 });

    expect(settings.writes).toEqual([]);
    expect(audit.entries).toEqual([]);
  });

  it.each([-1, 5001, 0.5])("refuses %s cents", async (cents) => {
    const settings = new FakeSettings();
    const useCase = new UpdateReceiptAmountToleranceUseCase(settings, new FakeAuditLog());

    await expect(useCase.run({ actorId: "staff-1", cents })).rejects.toBeInstanceOf(InvalidPlatformSettingError);
    expect(settings.writes).toEqual([]);
  });
});

describe("UpdateReceiptRejectBelowPercentUseCase", () => {
  it("writes the new percentage and audits from and to", async () => {
    const settings = new FakeSettings();
    const audit = new FakeAuditLog();

    const result = await new UpdateReceiptRejectBelowPercentUseCase(settings, audit).run({ actorId: "staff-1", percent: 70 });

    expect(result).toEqual({ receiptRejectBelowPercent: 70 });
    expect(settings.writes).toEqual([{ field: "receiptRejectBelowPercent", value: 70, actorId: "staff-1" }]);
    expect(audit.entries[0]).toMatchObject({
      action: "platform_settings.receipt_reject_below_percent",
      targetId: "receipt_reject_below_percent",
      metadata: { from: 50, to: 70 },
    });
  });

  it("writes and audits nothing when the value does not change", async () => {
    const settings = new FakeSettings();
    const audit = new FakeAuditLog();

    await new UpdateReceiptRejectBelowPercentUseCase(settings, audit).run({ actorId: "staff-1", percent: 50 });

    expect(settings.writes).toEqual([]);
    expect(audit.entries).toEqual([]);
  });

  it.each([0, 100, 49.5])("refuses %s percent", async (percent) => {
    const settings = new FakeSettings();
    const useCase = new UpdateReceiptRejectBelowPercentUseCase(settings, new FakeAuditLog());

    await expect(useCase.run({ actorId: "staff-1", percent })).rejects.toBeInstanceOf(InvalidPlatformSettingError);
    expect(settings.writes).toEqual([]);
  });
});
