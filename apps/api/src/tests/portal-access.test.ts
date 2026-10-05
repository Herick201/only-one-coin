import {
  PORTAL_ACTIVATION_TTL_DAYS,
  PORTAL_RESET_TTL_MINUTES,
  hashPortalToken,
  newPortalToken,
  parsePortalIdentifier,
  portalCredentialsEmail,
  portalPasswordResetEmail,
  type PortalAccount,
} from "@ooc/domain";
import { describe, expect, it } from "vitest";

/**
 * Student portal access (05/10/2026), pure domain: the identifier rules, the
 * one-time tokens and the two e-mails. Use cases are further down this file.
 */

const ACCOUNT: PortalAccount = { userId: "usr_ana", email: "ana.quispe@gmail.com", name: "Ana Quispe", hasPassword: false };

describe("parsePortalIdentifier", () => {
  it("normalizes an e-mail", () => {
    expect(parsePortalIdentifier({ method: "email", identifier: "  Ana.Quispe@Gmail.com " })).toEqual({
      method: "email",
      email: "ana.quispe@gmail.com",
    });
  });

  it("normalizes a document and checks it against its type", () => {
    expect(parsePortalIdentifier({ method: "national_id", nationalIdType: "DNI", identifier: "12.345.678" })).toEqual({
      method: "national_id",
      nationalIdType: "DNI",
      nationalId: "12345678",
    });
  });

  it.each([
    [{ method: "email", identifier: "not-an-email" }],
    [{ method: "national_id", nationalIdType: "DNI", identifier: "1234" }],
    [{ method: "national_id", identifier: "12345678" }],
    [{ method: "national_id", nationalIdType: "RUC", identifier: "12345678" }],
    [{ method: "phone", identifier: "999999999" }],
    [{ identifier: "ana@gmail.com" }],
    [null],
    ["ana@gmail.com"],
  ])("refuses %j", (raw) => {
    expect(parsePortalIdentifier(raw)).toBeNull();
  });
});

describe("portal tokens", () => {
  it("are random, url-safe, stored only as a hash", () => {
    const a = newPortalToken("activation");
    const b = newPortalToken("activation");
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).toBe(hashPortalToken(a.token));
    expect(a.tokenHash).not.toContain(a.token);
  });

  it("last seven days to activate and one hour to reset", () => {
    const now = new Date("2026-10-05T12:00:00.000Z");
    expect(newPortalToken("activation", now).expiresAt.getTime() - now.getTime()).toBe(PORTAL_ACTIVATION_TTL_DAYS * 86_400_000);
    expect(newPortalToken("reset", now).expiresAt.getTime() - now.getTime()).toBe(PORTAL_RESET_TTL_MINUTES * 60_000);
  });
});

describe("portal e-mails", () => {
  it("send the credentials to the student only, with a link and never a password", () => {
    expect(portalCredentialsEmail(ACCOUNT, "https://student.test/access/t", "tok_1", "es-PE")).toEqual({
      templateKey: "portal_credentials",
      to: ACCOUNT.email,
      locale: "es-PE",
      vars: { recipientName: "Ana Quispe", loginEmail: ACCOUNT.email, accessUrl: "https://student.test/access/t" },
      dedupeKey: "portal_credentials:usr_ana:tok_1",
    });
  });

  it("send the reset link to the account's address", () => {
    expect(portalPasswordResetEmail(ACCOUNT, "https://student.test/access/r", "tok_2", "pt-BR")).toEqual({
      templateKey: "portal_password_reset",
      to: ACCOUNT.email,
      locale: "pt-BR",
      vars: { recipientName: "Ana Quispe", resetUrl: "https://student.test/access/r" },
      dedupeKey: "portal_password_reset:usr_ana:tok_2",
    });
  });
});
