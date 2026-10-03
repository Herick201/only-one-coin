import {
  ChangeOwnPasswordUseCase,
  CurrentPasswordIncorrectError,
  NewPasswordRejectedError,
  type AuditLogEntry,
  type IAuditLogRepository,
  type IFreshAuthVerifier,
  type IStaffPasswordSetter,
  type IStaffSessionRevoker,
} from "@ooc/domain";
import { beforeEach, describe, expect, it } from "vitest";

/**
 * A staff member changing their own password (OOC-31). Pure domain here —
 * fakes, no database, no Better Auth.
 */

const USER = "usr_staff";
const SESSION = "session-token";
const CURRENT = "old-password-123";
const NEXT = "brand-new-password-456";

class FakeVerifier implements IFreshAuthVerifier {
  constructor(private readonly password: string) {}
  async verify(_userId: string, plainPassword: string) {
    return plainPassword === this.password;
  }
}

class FakeSetter implements IStaffPasswordSetter {
  public calls: [string, string][] = [];
  async setPassword(userId: string, plainPassword: string) {
    this.calls.push([userId, plainPassword]);
  }
}

class FakeRevoker implements IStaffSessionRevoker {
  public calls: [string, string][] = [];
  async revokeOthers(userId: string, keepSessionToken: string) {
    this.calls.push([userId, keepSessionToken]);
    return 2;
  }
}

class FakeAuditLog implements IAuditLogRepository {
  public entries: AuditLogEntry[] = [];
  async append(entry: AuditLogEntry) {
    this.entries.push(entry);
  }
}

let setter: FakeSetter;
let revoker: FakeRevoker;
let auditLog: FakeAuditLog;
let useCase: ChangeOwnPasswordUseCase;

beforeEach(() => {
  setter = new FakeSetter();
  revoker = new FakeRevoker();
  auditLog = new FakeAuditLog();
  useCase = new ChangeOwnPasswordUseCase(new FakeVerifier(CURRENT), setter, revoker, auditLog);
});

function run(overrides: { currentPassword?: string; newPassword?: string } = {}) {
  return useCase.run({
    userId: USER,
    sessionToken: SESSION,
    currentPassword: overrides.currentPassword ?? CURRENT,
    newPassword: overrides.newPassword ?? NEXT,
  });
}

function expectNothingWritten() {
  expect(setter.calls).toEqual([]);
  expect(revoker.calls).toEqual([]);
  expect(auditLog.entries).toEqual([]);
}

describe("ChangeOwnPasswordUseCase", () => {
  it("sets the new password, closes the other sessions and audits the change", async () => {
    const result = await run();

    expect(setter.calls).toEqual([[USER, NEXT]]);
    expect(revoker.calls).toEqual([[USER, SESSION]]);
    expect(result.otherSessionsClosed).toBe(2);
    expect(auditLog.entries).toHaveLength(1);
    expect(auditLog.entries[0]).toMatchObject({
      actorId: USER,
      targetId: USER,
      action: "staff.password_changed",
      metadata: { otherSessionsClosed: 2 },
    });
  });

  it("never writes the password into the audit log", async () => {
    await run();
    expect(JSON.stringify(auditLog.entries)).not.toContain(NEXT);
    expect(JSON.stringify(auditLog.entries)).not.toContain(CURRENT);
  });

  it("refuses a wrong current password", async () => {
    await expect(run({ currentPassword: "not-the-password-1" })).rejects.toBeInstanceOf(CurrentPasswordIncorrectError);
    expectNothingWritten();
  });

  it.each([
    ["too short", "short1"],
    ["no number", "only-letters-here"],
    ["no letter", "1234567890123"],
  ])("refuses a new password that is %s", async (_label, newPassword) => {
    await expect(run({ newPassword })).rejects.toMatchObject({ reason: "staff_password.too_weak" });
    expectNothingWritten();
  });

  it("accepts letters outside ASCII", async () => {
    await expect(run({ newPassword: "contraseña-ñandú-2026" })).resolves.toBeDefined();
  });

  it("refuses a new password equal to the current one", async () => {
    const error = await run({ newPassword: CURRENT }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NewPasswordRejectedError);
    expect(error).toMatchObject({ reason: "staff_password.unchanged", status: 422 });
    expectNothingWritten();
  });
});
