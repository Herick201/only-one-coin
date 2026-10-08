import { describe, expect, it } from "vitest";
import {
  ConfirmEmailVerificationUseCase,
  EMAIL_VERIFICATION_MAX_ATTEMPTS,
  EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
  EmailVerificationAttemptsExhaustedError,
  EmailVerificationCodeExpiredError,
  EmailVerificationCodeInvalidError,
  EmailVerificationCooldownError,
  EmailVerificationNotFoundError,
  EmailVerificationTooManySendsError,
  SeatHoldExpiredError,
  SendEmailVerificationCodeUseCase,
  hashVerificationCode,
  newVerificationCode,
  verificationCodeMatches,
  type IEmailVerificationRepository,
  type IssueEmailVerificationOutcome,
  type IssueEmailVerificationRequest,
  type LatestEmailVerification,
} from "@ooc/domain";

/**
 * The checkout's e-mail proof at the use-case level (spec 2026-10-07): fakes,
 * no Postgres. The SQL that makes expiry, cooldown and consumption atomic is
 * DrizzleEmailVerificationRepository.integration.test.ts.
 */

const HOLD = "018f2b5c-6000-7000-8000-000000000001";

interface Row extends LatestEmailVerification {
  seatHoldId: string;
  email: string;
}

class FakeEmailVerifications implements IEmailVerificationRepository {
  rows: Row[] = [];
  issued: IssueEmailVerificationRequest[] = [];
  outcome: IssueEmailVerificationOutcome = "issued";

  async issue(request: IssueEmailVerificationRequest): Promise<IssueEmailVerificationOutcome> {
    if (this.outcome !== "issued") return this.outcome;
    this.issued.push(request);
    for (const row of this.rows) if (row.seatHoldId === request.seatHoldId && !row.verified) row.expired = true;
    this.rows.push({
      id: request.id,
      seatHoldId: request.seatHoldId,
      email: request.email,
      codeHash: request.codeHash,
      attempts: 0,
      expired: false,
      verified: false,
    });
    return "issued";
  }

  async findLatest(params: { seatHoldId: string; email: string }): Promise<LatestEmailVerification | null> {
    const matching = this.rows.filter((row) => row.seatHoldId === params.seatHoldId && row.email === params.email);
    return matching.at(-1) ?? null;
  }

  async claimAttempt(id: string): Promise<number | null> {
    const row = this.rows.find((r) => r.id === id)!;
    if (row.verified || row.expired || row.attempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS) return null;
    row.attempts += 1;
    return row.attempts;
  }

  async markVerified(id: string): Promise<boolean> {
    const row = this.rows.find((r) => r.id === id)!;
    if (row.verified || row.expired) return false;
    row.verified = true;
    return true;
  }
}

/** Sends one code and returns it in clear, read back from the outbox payload. */
async function sendOne(repository: FakeEmailVerifications, email = "rosa.quispe@gmail.com"): Promise<string> {
  await new SendEmailVerificationCodeUseCase(repository).run({
    seatHoldId: HOLD,
    email,
    recipientName: "Rosa",
    locale: "es-PE",
  });
  const notification = repository.issued.at(-1)!.notifications[0]!;
  if (notification.templateKey !== "email_verification_code") throw new Error("wrong template");
  return notification.vars.code;
}

describe("verification codes", () => {
  it("are six digits", () => {
    for (let i = 0; i < 50; i++) expect(newVerificationCode()).toMatch(/^\d{6}$/);
  });

  it("match only their own row's hash", () => {
    const hash = hashVerificationCode("row-a", "123456");
    expect(verificationCodeMatches("row-a", "123456", hash)).toBe(true);
    expect(verificationCodeMatches("row-a", "123457", hash)).toBe(false);
    expect(verificationCodeMatches("row-b", "123456", hash)).toBe(false);
  });
});

describe("SendEmailVerificationCodeUseCase", () => {
  it("stores only the hash and mails the code to the address, in the reader's locale", async () => {
    const repository = new FakeEmailVerifications();
    const result = await new SendEmailVerificationCodeUseCase(repository).run({
      seatHoldId: HOLD,
      email: "rosa.quispe@gmail.com",
      recipientName: "Rosa",
      locale: "pt-BR",
    });

    expect(result).toEqual({ resendAfterSeconds: EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS });
    const request = repository.issued[0]!;
    const notification = request.notifications[0]!;
    expect(notification).toMatchObject({
      templateKey: "email_verification_code",
      to: "rosa.quispe@gmail.com",
      locale: "pt-BR",
      dedupeKey: `email_verification_code:${request.id}:student`,
    });
    if (notification.templateKey !== "email_verification_code") throw new Error("wrong template");
    expect(request.codeHash).toBe(hashVerificationCode(request.id, notification.vars.code));
    expect(request.codeHash).not.toContain(notification.vars.code);
  });

  it.each([
    ["hold_expired", SeatHoldExpiredError],
    ["cooldown", EmailVerificationCooldownError],
    ["too_many_sends", EmailVerificationTooManySendsError],
  ] as const)("turns %s into its error", async (outcome, ErrorClass) => {
    const repository = new FakeEmailVerifications();
    repository.outcome = outcome;
    await expect(
      new SendEmailVerificationCodeUseCase(repository).run({
        seatHoldId: HOLD,
        email: "rosa.quispe@gmail.com",
        recipientName: "Rosa",
        locale: "es-PE",
      }),
    ).rejects.toBeInstanceOf(ErrorClass);
  });
});

describe("ConfirmEmailVerificationUseCase", () => {
  it("verifies the right code", async () => {
    const repository = new FakeEmailVerifications();
    const code = await sendOne(repository);

    await new ConfirmEmailVerificationUseCase(repository).run({ seatHoldId: HOLD, email: "rosa.quispe@gmail.com", code });

    expect(repository.rows[0]!.verified).toBe(true);
  });

  it("answers a second confirm of a verified row without error", async () => {
    const repository = new FakeEmailVerifications();
    const code = await sendOne(repository);
    const useCase = new ConfirmEmailVerificationUseCase(repository);
    await useCase.run({ seatHoldId: HOLD, email: "rosa.quispe@gmail.com", code });
    await expect(useCase.run({ seatHoldId: HOLD, email: "rosa.quispe@gmail.com", code })).resolves.toBeUndefined();
  });

  it("counts a wrong code and refuses it", async () => {
    const repository = new FakeEmailVerifications();
    const code = await sendOne(repository);
    const wrong = code === "000000" ? "000001" : "000000";

    await expect(
      new ConfirmEmailVerificationUseCase(repository).run({ seatHoldId: HOLD, email: "rosa.quispe@gmail.com", code: wrong }),
    ).rejects.toBeInstanceOf(EmailVerificationCodeInvalidError);
    expect(repository.rows[0]!.attempts).toBe(1);
  });

  it("burns the code on the fifth wrong attempt, and the right code no longer works", async () => {
    const repository = new FakeEmailVerifications();
    const code = await sendOne(repository);
    const wrong = code === "000000" ? "000001" : "000000";
    const useCase = new ConfirmEmailVerificationUseCase(repository);
    const input = { seatHoldId: HOLD, email: "rosa.quispe@gmail.com" };

    for (let i = 1; i < EMAIL_VERIFICATION_MAX_ATTEMPTS; i++) {
      await expect(useCase.run({ ...input, code: wrong })).rejects.toBeInstanceOf(EmailVerificationCodeInvalidError);
    }
    await expect(useCase.run({ ...input, code: wrong })).rejects.toBeInstanceOf(EmailVerificationAttemptsExhaustedError);
    await expect(useCase.run({ ...input, code })).rejects.toBeInstanceOf(EmailVerificationAttemptsExhaustedError);
  });

  it("a correct code on the fifth attempt still verifies", async () => {
    const repository = new FakeEmailVerifications();
    const code = await sendOne(repository);
    const wrong = code === "000000" ? "000001" : "000000";
    const useCase = new ConfirmEmailVerificationUseCase(repository);
    const input = { seatHoldId: HOLD, email: "rosa.quispe@gmail.com" };

    for (let i = 1; i < EMAIL_VERIFICATION_MAX_ATTEMPTS; i++) {
      await expect(useCase.run({ ...input, code: wrong })).rejects.toBeInstanceOf(EmailVerificationCodeInvalidError);
    }
    await expect(useCase.run({ ...input, code })).resolves.toBeUndefined();
    expect(repository.rows[0]!.verified).toBe(true);
  });

  it("refuses when the row stops taking attempts between the read and the claim", async () => {
    class RacingFake extends FakeEmailVerifications {
      override async claimAttempt(): Promise<number | null> {
        return null;
      }
    }
    const repository = new RacingFake();
    const code = await sendOne(repository);

    await expect(
      new ConfirmEmailVerificationUseCase(repository).run({ seatHoldId: HOLD, email: "rosa.quispe@gmail.com", code }),
    ).rejects.toBeInstanceOf(EmailVerificationCodeExpiredError);
  });

  it("refuses an expired code", async () => {
    const repository = new FakeEmailVerifications();
    const code = await sendOne(repository);
    repository.rows[0]!.expired = true;

    await expect(
      new ConfirmEmailVerificationUseCase(repository).run({ seatHoldId: HOLD, email: "rosa.quispe@gmail.com", code }),
    ).rejects.toBeInstanceOf(EmailVerificationCodeExpiredError);
  });

  it("only the newest code works after a resend", async () => {
    const repository = new FakeEmailVerifications();
    const first = await sendOne(repository);
    const second = await sendOne(repository);
    const useCase = new ConfirmEmailVerificationUseCase(repository);
    const input = { seatHoldId: HOLD, email: "rosa.quispe@gmail.com" };

    if (first !== second) {
      await expect(useCase.run({ ...input, code: first })).rejects.toBeInstanceOf(EmailVerificationCodeInvalidError);
    }
    await expect(useCase.run({ ...input, code: second })).resolves.toBeUndefined();
  });

  it("knows nothing about an address no code went to on this hold", async () => {
    const repository = new FakeEmailVerifications();
    const code = await sendOne(repository, "rosa.quispe@gmail.com");

    await expect(
      new ConfirmEmailVerificationUseCase(repository).run({ seatHoldId: HOLD, email: "otra.persona@gmail.com", code }),
    ).rejects.toBeInstanceOf(EmailVerificationNotFoundError);
  });
});
