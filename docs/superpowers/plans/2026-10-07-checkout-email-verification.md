# Checkout Email Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The public checkout only advances past the student step once the student proves, with a 6-digit code e-mailed to it, that the Gmail address they typed exists and is theirs; Gmail usernames that cannot exist are refused and common domain typos get a one-click fix.

**Architecture:** A new `email_verifications` table, tied to the checkout's seat hold, keeps the hashed code, its expiry (database clock) and attempts. A public send route writes the row and the outbox e-mail in one transaction; a public confirm route marks it verified; the existing submit consumes a verified row for the same hold and student e-mail inside its own transaction or refuses with 422. The field rules live in `packages/domain/src/student/fields.ts` so the browser and the API share them.

**Tech Stack:** TypeScript, Fastify + `RouteBuilder` (`apps/api`), Drizzle ORM + drizzle-kit (`packages/db`), zod 3, vitest, Next.js App Router + next-intl (`apps/app`), Cloudflare Turnstile, BullMQ outbox relay → Brevo.

**Spec:** `docs/superpowers/specs/2026-10-07-checkout-email-verification-design.md`

## Global Constraints

- Code, identifiers, comments, commit messages, branch names: **English**. Conversation and internal docs: Portuguese (CLAUDE.md §4, §9).
- Every user-visible string lives in locale files, in **all three** of `es-PE` · `pt-BR` · `en`, same keys (CLAUDE.md §4). No domain code on screen.
- `packages/domain/src/student/fields.ts` stays self-contained: imports `zod` only, no relative import (it is bundled raw by Next).
- `packages/domain` never imports Fastify, Drizzle or Redis (packages/domain/CLAUDE.md).
- Code TTL **10 min**, max **5** attempts, resend cooldown **60 s**, max **5** sends per seat hold, send route **20 per IP / 10 min**.
- Codes are stored only as `sha256(id + ":" + code)`; the plain code exists only in the outbox `vars` until the row's final transition strips it.
- All e-mail goes through the outbox (`insertOutboxEmails`) in the same transaction as the row that caused it — never sent from a route.
- Every public route declares `.public()` **and** `.rateLimit(...)` or the app refuses to boot.
- Migrations are additive; generated with `pnpm --filter @ooc/db db:generate`, never hand-edited after merge.
- Timestamps are `timestamptz`; every expiry comparison uses the database clock (`now()`).
- Conventional commits (`feat:`, `fix:`, `docs:`, `test:`), each ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Work on a feature branch (`feat/checkout-email-verification`), never on `main`.

## File map

| File | Responsibility |
| --- | --- |
| `packages/domain/src/student/fields.ts` (modify) | `gmailUsernameIssue`, `suggestEmailDomain`, new code `email_gmail_username_invalid`, rule wired into `EmailField` |
| `packages/db/src/schema.ts` (modify) | `emailVerifications` table |
| `packages/db/migrations/0023_*.sql` (generated) | the table |
| `packages/domain/src/notification/EmailNotification.ts` (modify) | template key `email_verification_code` |
| `packages/notifications/src/locales/{es-PE,pt-BR,en}.json` (modify) | template copy |
| `apps/api/src/infra/persistence/notification/DrizzleOutboxRepository.ts` (modify) | strip `code` on final transition |
| `packages/domain/src/enrollment/EmailVerification.ts` (create) | constants, code generation, hashing, comparison, e-mail builder |
| `packages/domain/src/enrollment/EmailVerificationRepository.ts` (create) | repository port |
| `packages/domain/src/enrollment/SendEmailVerificationCodeUseCase.ts` (create) | send |
| `packages/domain/src/enrollment/ConfirmEmailVerificationUseCase.ts` (create) | confirm |
| `packages/domain/src/enrollment/errors.ts` (modify) | the `email_verification.*` errors |
| `packages/domain/src/index.ts` (modify) | exports |
| `apps/api/src/infra/persistence/enrollment/DrizzleEmailVerificationRepository.ts` (create) | the port in SQL + `consumeVerifiedEmail` |
| `apps/api/src/infra/persistence/enrollment/DrizzlePublicEnrollmentRepository.ts` (modify) | submit consumes the proof |
| `apps/api/src/http/enrollment/SendEmailVerificationRoute.ts` (create) | `POST /enrollments/email-verifications` |
| `apps/api/src/http/enrollment/ConfirmEmailVerificationRoute.ts` (create) | `POST /enrollments/email-verifications/confirm` |
| `apps/api/src/shared/http/rateLimit.ts` (modify) | two rules |
| `apps/api/src/container.ts`, `apps/api/src/app.ts` (modify) | wiring |
| `apps/app/src/lib/enrollment/types.ts`, `checkout.ts`, `use-checkout.ts` (modify) | proof in the draft, guardian confirmation, validation |
| `apps/app/src/lib/enrollment/email-verification.ts` (create) | fetch helpers + `isEmailVerified` |
| `apps/app/src/app/[locale]/enrollment/email-verification.tsx` (create) | the verify block |
| `apps/app/src/app/[locale]/enrollment/email-suggestion.tsx` (create) | "did you mean" line |
| `apps/app/src/app/[locale]/enrollment/step-student.tsx`, `checkout.tsx`, `step-review.tsx` (modify) | wire the block, gate Continue, map the submit 422 |
| `apps/app/src/messages/enrollment/*.json`, `apps/app/src/messages/backoffice/*.json` (modify) | copy |
| Tests: `apps/api/src/tests/student-fields.test.ts`, `email-templates.test.ts`, `email-verification.test.ts` (new), `email-verification-routes.test.ts` (new); `apps/api/src/infra/persistence/enrollment/DrizzleEmailVerificationRepository.integration.test.ts` (new); `apps/api/src/infra/persistence/notification/DrizzleOutboxRepository.integration.test.ts` | |

Commands used throughout:

- Unit tests (no DB): `pnpm --filter @ooc/api test -- <file>`
- Integration tests (needs `pnpm db:up` and migrated DB, `DATABASE_URL` set as in CI): `pnpm test:api:db -- <file>`
- Types: `pnpm -r --if-present run typecheck` (or one package: `pnpm typecheck:api`, `typecheck:domain`, `typecheck:app`, `typecheck:db`)
- Lint: `pnpm lint` (all packages) or `pnpm --filter @ooc/app lint`

---

### Task 0: Branch

- [ ] **Step 1:** `git checkout main && git pull && git checkout -b feat/checkout-email-verification`
- [ ] **Step 2:** Cherry-pick or merge the spec commit from `docs/checkout-email-verification-spec` (`git merge docs/checkout-email-verification-spec`) so the spec and plan ship in the same PR.

---

### Task 1: Gmail username rule and domain-typo suggestion (domain + copy)

**Files:**
- Modify: `packages/domain/src/student/fields.ts`
- Modify: `apps/app/src/messages/enrollment/{es-PE,pt-BR,en}.json` (key `enrollment.error.email_gmail_username_invalid`)
- Modify: `apps/app/src/messages/backoffice/{es-PE,pt-BR,en}.json` (key `bo.new_student.error.email_gmail_username_invalid`)
- Test: `apps/api/src/tests/student-fields.test.ts`

**Interfaces:**
- Produces: `gmailUsernameIssue(email: string): FieldErrorCode | null`, `suggestEmailDomain(email: string): string | null`, field code `"email_gmail_username_invalid"`; `EmailField` now refuses impossible Gmail usernames.

- [ ] **Step 1: Write the failing tests** — append to `apps/api/src/tests/student-fields.test.ts` (add `gmailUsernameIssue`, `suggestEmailDomain` to the `@ooc/domain` import):

```ts
describe("Gmail username rules", () => {
  it.each([
    "rosa.quispe@gmail.com",
    "ROSA.Quispe@Gmail.com",
    "abcdef@gmail.com",
    "a23456789012345678901234567890@gmail.com",
  ])("accepts %s", (email) => {
    expect(gmailUsernameIssue(email)).toBeNull();
    expect(issueOf(EmailField, email)).toBeNull();
  });

  it.each([
    ["too short", "abcde@gmail.com"],
    ["too long", "a234567890123456789012345678901@gmail.com"],
    ["a plus alias", "rosa+curso@gmail.com"],
    ["an underscore", "rosa_quispe@gmail.com"],
    ["a leading dot", ".rosaquispe@gmail.com"],
    ["a trailing dot", "rosaquispe.@gmail.com"],
    ["two dots in a row", "rosa..quispe@gmail.com"],
  ])("refuses %s", (_label, email) => {
    expect(gmailUsernameIssue(email)).toBe("email_gmail_username_invalid");
    expect(issueOf(EmailField, email)).not.toBeNull();
  });

  it("leaves other providers alone", () => {
    expect(gmailUsernameIssue("rosa_q@hotmail.com")).toBeNull();
    expect(issueOf(EmailField, "rosa_q@hotmail.com")).toBeNull();
  });
});

describe("suggestEmailDomain", () => {
  it.each([
    ["rosa@gmial.com", "rosa@gmail.com"],
    ["rosa@gmail.co", "rosa@gmail.com"],
    ["rosa@gmai.com", "rosa@gmail.com"],
    ["rosa@gmal.com", "rosa@gmail.com"],
    ["rosa@gmail.con", "rosa@gmail.com"],
    ["rosa@gnail.com", "rosa@gmail.com"],
    ["rosa@gmail.cm", "rosa@gmail.com"],
    ["Rosa@Hotmial.com", "rosa@hotmail.com"],
    ["rosa@outlok.com", "rosa@outlook.com"],
    ["rosa@yaho.com", "rosa@yahoo.com"],
    ["rosa123gmail.com", "rosa123@gmail.com"],
  ])("suggests %s → %s", (typed, expected) => {
    expect(suggestEmailDomain(typed)).toBe(expected);
  });

  it.each(["rosa@gmail.com", "rosa@colegio.edu.pe", "rosa", "", "@gmial.com"])("has nothing for %s", (typed) => {
    expect(suggestEmailDomain(typed)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @ooc/api test -- src/tests/student-fields.test.ts`
Expected: FAIL — `gmailUsernameIssue is not a function` (or not exported).

- [ ] **Step 3: Implement in `packages/domain/src/student/fields.ts`**

Add the code to `FIELD_ERROR_CODES` right after `"email_must_be_gmail"`:

```ts
  "email_must_be_gmail",
  "email_gmail_username_invalid",
```

Below `isGmail`, add:

```ts
/**
 * Gmail's own username rules (6–30 characters; letters, digits and dots; no
 * dot at either end or two in a row). An address that breaks them cannot
 * exist, so it is refused wherever an e-mail is written — student or guardian,
 * checkout or backoffice. Only `@gmail.com` is judged: other providers have
 * their own rules and the Gmail requirement itself is the checkout's
 * (`refineGmail`). `+` aliases are refused on purpose: they deliver to the same
 * inbox, but Classroom needs the account itself.
 */
export function gmailUsernameIssue(email: string): FieldErrorCode | null {
  const normalized = normalizeEmail(email);
  if (!isGmail(normalized)) return null;
  const username = normalized.slice(0, -"@gmail.com".length);
  const valid =
    username.length >= 6 &&
    username.length <= 30 &&
    /^[a-z0-9.]+$/.test(username) &&
    !username.startsWith(".") &&
    !username.endsWith(".") &&
    !username.includes("..");
  return valid ? null : "email_gmail_username_invalid";
}

/** Domain typos people actually make, each to the domain they meant. */
const DOMAIN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.om": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com",
  "outlook.co": "outlook.com",
  "outlook.con": "outlook.com",
  "yaho.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "yahoo.con": "yahoo.com",
};

/** `nome123gmail.com` — the "@" that never got typed (legacy import, parse-row.ts). */
const MISSING_AT = /^(.+?)(gmail|hotmail|outlook|yahoo)\.com$/;

/**
 * "Did you mean …?" — the corrected address, or null when there is nothing to
 * suggest. A suggestion, never a refusal: the list can never be complete, so
 * nothing is rejected for missing from it.
 */
export function suggestEmailDomain(email: string): string | null {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at === -1) {
    const match = MISSING_AT.exec(normalized);
    return match ? `${match[1]}@${match[2]}.com` : null;
  }
  if (at === 0) return null;
  const fix = DOMAIN_TYPOS[normalized.slice(at + 1)];
  return fix ? `${normalized.slice(0, at)}@${fix}` : null;
}
```

Change `EmailField` to:

```ts
export const EmailField = z
  .string()
  .transform(normalizeEmail)
  .pipe(
    z
      .string()
      .min(1, "required")
      .max(FIELD_LIMITS.email, "too_long")
      .email("email_format")
      .refine((email) => gmailUsernameIssue(email) === null, "email_gmail_username_invalid"),
  );
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @ooc/api test -- src/tests/student-fields.test.ts src/tests/student-fields-routes.test.ts`
Expected: PASS (existing tests unchanged — their fixtures use `rosa.quispe@gmail.com`).

- [ ] **Step 5: Copy** — add the new code to each field-error map:
  - `apps/app/src/messages/enrollment/es-PE.json` → `enrollment.error.email_gmail_username_invalid`: `"Ese correo de Gmail no existe: el nombre de usuario debe tener de 6 a 30 caracteres, solo letras, números y puntos (sin «+», sin punto al inicio o al final, sin dos puntos seguidos)."`
  - `pt-BR.json`: `"Esse e-mail do Gmail não existe: o nome de usuário precisa ter de 6 a 30 caracteres, só letras, números e pontos (sem «+», sem ponto no início ou no fim, sem dois pontos seguidos)."`
  - `en.json`: `"That Gmail address cannot exist: the username must be 6–30 characters, only letters, numbers and dots (no “+”, no dot at the start or end, no two dots in a row)."`
  - `apps/app/src/messages/backoffice/{es-PE,pt-BR,en}.json` → `bo.new_student.error.email_gmail_username_invalid`: same three texts.

- [ ] **Step 6: Typecheck** — `pnpm -r --if-present run typecheck`. Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/domain/src/student/fields.ts apps/api/src/tests/student-fields.test.ts apps/app/src/messages
git commit -m "feat: refuse impossible Gmail usernames and suggest domain fixes"
```

---

### Task 2: `email_verifications` table (schema + migration 0023)

**Files:**
- Modify: `packages/db/src/schema.ts` (after `seatHolds`)
- Create (generated): `packages/db/migrations/0023_<generated-name>.sql` + `meta/0023_snapshot.json` + `_journal.json` entry

**Interfaces:**
- Produces: Drizzle table `emailVerifications` exported from `@ooc/db` with columns `id, seatHoldId, email, codeHash, attempts, expiresAt, verifiedAt, consumedAt, createdAt, updatedAt`.

- [ ] **Step 1: Add the table to `packages/db/src/schema.ts`** right after the `seatHolds` table:

```ts
// The checkout's proof that the student's e-mail is theirs (spec
// 2026-10-07): a 6-digit code mailed to the address, tied to the seat hold —
// the only session an anonymous checkout has. The submit consumes a verified
// row for its own hold and the student's e-mail inside its transaction, or
// refuses; which enrollment consumed it is `seat_holds.enrollment_id`.
//
// `code_hash` is sha256(id + ":" + code). Six digits do not survive an offline
// brute force — the protection is the 10-minute expiry and the 5 attempts; the
// hash only keeps the code out of dumps and logs. `expires_at` is stamped and
// compared on the database clock. A new code for the same hold expires the
// pending ones (only the latest code works).
//
// No `deleted_at`: the timestamps tell the row's whole life.
export const emailVerifications = pgTable(
  "email_verifications",
  {
    id: uuidPk(),
    seatHoldId: uuid("seat_hold_id")
      .notNull()
      .references(() => seatHolds.id, { onDelete: "restrict" }),
    email: text("email").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    check("email_verifications_attempts_check", sql`${table.attempts} between 0 and 5`),
    // Consumed only once verified.
    check(
      "email_verifications_consumed_check",
      sql`${table.consumedAt} is null or ${table.verifiedAt} is not null`,
    ),
    // The cooldown and the send count, and the confirm's "newest for this hold".
    index("email_verifications_seat_hold_id_created_at_idx").on(table.seatHoldId, table.createdAt),
  ],
);
```

(`integer`, `check`, `index`, `timestamp`, `uuid`, `text` are already imported at the top of `schema.ts`; verify, add any missing.)

- [ ] **Step 2: Generate the migration**

Run: `pnpm --filter @ooc/db db:generate`
Expected: a new `packages/db/migrations/0023_*.sql` with `CREATE TABLE "email_verifications"`, the two CHECKs, the FK to `seat_holds` with `ON DELETE restrict`, and the index. Open it and confirm nothing else changed (no diff on other tables).

- [ ] **Step 3: Apply on a clean database**

Run: `pnpm db:reset` (drops the local volume, starts compose, runs every migration from zero).
Expected: migration 0023 applies with no error.

- [ ] **Step 4: Run the db suite** — `pnpm test:db`. Expected: PASS (`soft-delete.test.ts` and `privileges.test.ts` are untouched by a table without `deleted_at` and outside the delete lock).

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema.ts packages/db/migrations
git commit -m "feat(db): add email_verifications table tied to the seat hold"
```

---

### Task 3: `email_verification_code` template and outbox stripping

**Files:**
- Modify: `packages/domain/src/notification/EmailNotification.ts`
- Modify: `packages/notifications/src/locales/{es-PE,pt-BR,en}.json`
- Modify: `apps/api/src/infra/persistence/notification/DrizzleOutboxRepository.ts`
- Test: `apps/api/src/tests/email-templates.test.ts`, `apps/api/src/infra/persistence/notification/DrizzleOutboxRepository.integration.test.ts`

**Interfaces:**
- Produces: template key `email_verification_code` with vars `{ recipientName: string; code: string }`.

- [ ] **Step 1: Failing test — template sample.** In `apps/api/src/tests/email-templates.test.ts`, add to `SAMPLE_VARS`:

```ts
  email_verification_code: { recipientName: "Rosa", code: "042137" },
```

and a test in the render `describe`:

```ts
it("puts the verification code in the subject and body, in every locale", () => {
  for (const locale of LOCALES) {
    const rendered = renderEmail(sample("email_verification_code", locale));
    expect(rendered.subject).toContain("042137");
    expect(rendered.text).toContain("042137");
    expect(rendered.html).toContain("042137");
  }
});
```

- [ ] **Step 2: Run** `pnpm --filter @ooc/api test -- src/tests/email-templates.test.ts` — Expected: FAIL (type error / unknown template key).

- [ ] **Step 3: Implement.** In `EmailNotification.ts` add to `EmailTemplateVars`:

```ts
  /** The checkout's 6-digit code proving the student's Gmail (spec 2026-10-07).
   * Plain text in `outbox.vars` only until the row's final transition. */
  email_verification_code: {
    recipientName: string;
    code: string;
  };
```

and `"email_verification_code"` to the end of `EMAIL_TEMPLATE_KEYS`.

Add to `templates` in each locale file (no `action`; the TTL "10 minutos" must match `EMAIL_VERIFICATION_CODE_TTL_MINUTES`):

`es-PE.json`:
```json
"email_verification_code": {
  "subject": "Tu código de verificación: {code}",
  "preheader": "Escríbelo en el formulario de matrícula. Vence en 10 minutos.",
  "paragraphs": [
    "Estás completando una matrícula en Only One Coin. Para confirmar que este correo es tuyo, escribe este código en el formulario:",
    "{code}",
    "El código vence en 10 minutos. Si no estás haciendo una matrícula, ignora este correo."
  ]
}
```
`pt-BR.json`:
```json
"email_verification_code": {
  "subject": "Seu código de verificação: {code}",
  "preheader": "Digite-o no formulário de matrícula. Ele vence em 10 minutos.",
  "paragraphs": [
    "Você está concluindo uma matrícula na Only One Coin. Para confirmar que este e-mail é seu, digite este código no formulário:",
    "{code}",
    "O código vence em 10 minutos. Se você não está fazendo uma matrícula, ignore este e-mail."
  ]
}
```
`en.json`:
```json
"email_verification_code": {
  "subject": "Your verification code: {code}",
  "preheader": "Type it into the enrollment form. It expires in 10 minutes.",
  "paragraphs": [
    "You are completing an enrollment at Only One Coin. To confirm this address is yours, type this code into the form:",
    "{code}",
    "The code expires in 10 minutes. If you are not enrolling, ignore this e-mail."
  ]
}
```

- [ ] **Step 4: Run** the template test again. Expected: PASS (including the "same keys in all three locales" test).

- [ ] **Step 5: Failing integration test — the code is stripped.** In `DrizzleOutboxRepository.integration.test.ts`, inside `describe("a one-time link never outlives its row's delivery")`, add:

```ts
it("strips a verification code when the row is sent", async () => {
  await inRolledBackTransaction(async (tx) => {
    const notification: EmailNotification = {
      templateKey: "email_verification_code",
      to: "code.outbox.integration@gmail.com",
      locale: "es-PE",
      vars: { recipientName: "Lucía", code: "042137" },
      dedupeKey: "email_verification_code:018f2b5c-4000-7000-8000-0000000000cc:student",
    };
    await insertOutboxEmails(tx, [notification]);
    const [row] = await tx.select({ id: outbox.id }).from(outbox).where(eq(outbox.dedupeKey, notification.dedupeKey));
    await new DrizzleOutboxRepository(tx).markSent(row!.id, "<msg@brevo>");
    expect(await varsOf(tx, row!.id)).toEqual({ recipientName: "Lucía" });
  });
});
```

- [ ] **Step 6: Run** `pnpm test:api:db -- src/infra/persistence/notification/DrizzleOutboxRepository.integration.test.ts` — Expected: FAIL (`code` still present).

- [ ] **Step 7: Implement** in `DrizzleOutboxRepository.ts`: rename `stripOneTimeLinks` → `stripOneTimeSecrets` (all four uses) and change it to:

```ts
/**
 * The vars that carry a one-time secret: a link with a raw token (activation,
 * password reset) or the checkout's verification code. The tables behind them
 * keep only hashes, so once a row reaches an end state nobody needs the secret
 * any more, and leaving it in `vars` would undo that hashing. Every final
 * transition strips them in the same UPDATE; a non-final failed attempt keeps
 * them, because the retry still has to send them.
 */
const stripOneTimeSecrets = sql`${outbox.vars} - 'accessUrl' - 'resetUrl' - 'code'`;
```

- [ ] **Step 8: Run** the outbox integration suite and the template test. Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/domain/src/notification/EmailNotification.ts packages/notifications/src/locales apps/api/src/infra/persistence/notification apps/api/src/tests/email-templates.test.ts
git commit -m "feat: add the email verification code template and strip the code from the outbox"
```

---

### Task 4: Domain — verification core, errors, port and use cases

**Files:**
- Create: `packages/domain/src/enrollment/EmailVerification.ts`
- Create: `packages/domain/src/enrollment/EmailVerificationRepository.ts`
- Create: `packages/domain/src/enrollment/SendEmailVerificationCodeUseCase.ts`
- Create: `packages/domain/src/enrollment/ConfirmEmailVerificationUseCase.ts`
- Modify: `packages/domain/src/enrollment/errors.ts`
- Modify: `packages/domain/src/index.ts`
- Test: `apps/api/src/tests/email-verification.test.ts` (new)

**Interfaces:**
- Consumes: `EmailNotification`, `Locale` (Task 3); `SeatHoldExpiredError` (existing).
- Produces:
  - constants `EMAIL_VERIFICATION_CODE_TTL_MINUTES = 10`, `EMAIL_VERIFICATION_MAX_ATTEMPTS = 5`, `EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = 60`, `EMAIL_VERIFICATION_MAX_SENDS_PER_HOLD = 5`
  - `newVerificationCode(): string`, `hashVerificationCode(verificationId: string, code: string): string`, `verificationCodeMatches(verificationId: string, code: string, codeHash: string): boolean`, `emailVerificationCodeEmail(params): EmailNotification`
  - port `IEmailVerificationRepository { issue(req): Promise<IssueEmailVerificationOutcome>; findLatest(params): Promise<LatestEmailVerification | null>; recordFailedAttempt(id): Promise<number>; markVerified(id): Promise<boolean> }`
  - `SendEmailVerificationCodeUseCase.run({ seatHoldId, email, recipientName, locale }) → { resendAfterSeconds: number }`
  - `ConfirmEmailVerificationUseCase.run({ seatHoldId, email, code }) → void`
  - errors `EmailVerificationCooldownError` (429), `EmailVerificationTooManySendsError` (429), `EmailVerificationNotFoundError`, `EmailVerificationCodeInvalidError`, `EmailVerificationCodeExpiredError`, `EmailVerificationAttemptsExhaustedError`, `EmailVerificationRequiredError` (all 422 except the two 429s)

- [ ] **Step 1: Write the failing test** `apps/api/src/tests/email-verification.test.ts`:

```ts
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

  async recordFailedAttempt(id: string): Promise<number> {
    const row = this.rows.find((r) => r.id === id)!;
    row.attempts = Math.min(row.attempts + 1, EMAIL_VERIFICATION_MAX_ATTEMPTS);
    return row.attempts;
  }

  async markVerified(id: string): Promise<boolean> {
    const row = this.rows.find((r) => r.id === id)!;
    if (row.verified || row.expired || row.attempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS) return false;
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
```

- [ ] **Step 2: Run** `pnpm --filter @ooc/api test -- src/tests/email-verification.test.ts` — Expected: FAIL (exports missing).

- [ ] **Step 3: Create `packages/domain/src/enrollment/EmailVerification.ts`**

```ts
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import type { EmailNotification, Locale } from "../notification/EmailNotification.js";

/** The code e-mail names this duration — keep them in step
 * (packages/notifications/src/locales, `email_verification_code`). */
export const EMAIL_VERIFICATION_CODE_TTL_MINUTES = 10;
/** The fifth wrong code burns the row; the checkout asks for a new one.
 * Mirrored by the CHECK on `email_verifications.attempts`. */
export const EMAIL_VERIFICATION_MAX_ATTEMPTS = 5;
/** At most one code per seat hold in this window. */
export const EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;
/** At most this many codes per seat hold, ever. */
export const EMAIL_VERIFICATION_MAX_SENDS_PER_HOLD = 5;

/** Six digits, leading zeros kept, from the CSPRNG. */
export function newVerificationCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** Salted with the row id, so the same code on two rows is two hashes. */
export function hashVerificationCode(verificationId: string, code: string): string {
  return createHash("sha256").update(`${verificationId}:${code}`).digest("hex");
}

export function verificationCodeMatches(verificationId: string, code: string, codeHash: string): boolean {
  const typed = Buffer.from(hashVerificationCode(verificationId, code), "hex");
  const stored = Buffer.from(codeHash, "hex");
  return typed.length === stored.length && timingSafeEqual(typed, stored);
}

/** Only ever to the address being proven — never copied to the guardian. */
export function emailVerificationCodeEmail(params: {
  verificationId: string;
  to: string;
  recipientName: string;
  code: string;
  locale: Locale;
}): EmailNotification {
  return {
    templateKey: "email_verification_code",
    to: params.to,
    locale: params.locale,
    vars: { recipientName: params.recipientName, code: params.code },
    dedupeKey: `email_verification_code:${params.verificationId}:student`,
  };
}
```

- [ ] **Step 4: Create `packages/domain/src/enrollment/EmailVerificationRepository.ts`**

```ts
import type { EmailNotification } from "../notification/EmailNotification.js";

export type IssueEmailVerificationOutcome = "issued" | "hold_expired" | "cooldown" | "too_many_sends";

export interface IssueEmailVerificationRequest {
  /** Minted by the use case: the hash is salted with it. */
  id: string;
  seatHoldId: string;
  /** Normalized. */
  email: string;
  codeHash: string;
  ttlMinutes: number;
  cooldownSeconds: number;
  maxSends: number;
  /** Written to the outbox in the same transaction as the row. */
  notifications: EmailNotification[];
}

/** The newest not-yet-consumed row for a hold and an address. `expired` is
 * decided on the database clock. */
export interface LatestEmailVerification {
  id: string;
  codeHash: string;
  attempts: number;
  expired: boolean;
  verified: boolean;
}

export interface IEmailVerificationRepository {
  /**
   * One transaction, locking the seat hold row:
   * - the hold is not `active` or already expired → `hold_expired`;
   * - a code went out for this hold less than `cooldownSeconds` ago → `cooldown`;
   * - `maxSends` codes already went out for this hold → `too_many_sends`;
   * - otherwise: pending (unverified, unexpired) rows of the hold expire now,
   *   the new row is written expiring `ttlMinutes` from now, and the outbox
   *   rows of `notifications` with it → `issued`.
   */
  issue(request: IssueEmailVerificationRequest): Promise<IssueEmailVerificationOutcome>;
  findLatest(params: { seatHoldId: string; email: string }): Promise<LatestEmailVerification | null>;
  /** +1 attempt, capped at the maximum; returns the count after it. */
  recordFailedAttempt(id: string): Promise<number>;
  /** Sets `verified_at` only if still unverified, unexpired and under the
   * attempt limit; `false` when it was not (a race with expiry or a burn). */
  markVerified(id: string): Promise<boolean>;
}
```

- [ ] **Step 5: Add the errors to `packages/domain/src/enrollment/errors.ts`** (add `import { HttpError } from "../shared/base/errors/HttpError.js";` at the top):

```ts
/** A code went out for this checkout less than a minute ago. */
export class EmailVerificationCooldownError extends HttpError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({ status: 429, reason: "email_verification.cooldown", message: "A code was sent moments ago.", ...params });
  }
}

/** This checkout already spent every code it gets. */
export class EmailVerificationTooManySendsError extends HttpError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({
      status: 429,
      reason: "email_verification.too_many_sends",
      message: "This checkout already received the maximum number of codes.",
      ...params,
    });
  }
}

/** No code went to this address on this checkout — or the address changed. */
export class EmailVerificationNotFoundError extends UnableToProcessEntryError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({ reason: "email_verification.not_found", message: "No code was sent to this address.", ...params });
  }
}

export class EmailVerificationCodeInvalidError extends UnableToProcessEntryError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({ reason: "email_verification.code_invalid", message: "The code does not match.", ...params });
  }
}

export class EmailVerificationCodeExpiredError extends UnableToProcessEntryError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({ reason: "email_verification.code_expired", message: "The code expired or was replaced.", ...params });
  }
}

export class EmailVerificationAttemptsExhaustedError extends UnableToProcessEntryError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({
      reason: "email_verification.attempts_exhausted",
      message: "Too many wrong codes; a new one is needed.",
      ...params,
    });
  }
}

/** The submit found no verified, unconsumed proof for its seat hold and the
 * student's e-mail (spec 2026-10-07). Nothing was written. */
export class EmailVerificationRequiredError extends UnableToProcessEntryError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({
      reason: "email_verification.required",
      message: "The student's e-mail was not verified on this checkout.",
      ...params,
    });
  }
}
```

- [ ] **Step 6: Create `packages/domain/src/enrollment/SendEmailVerificationCodeUseCase.ts`**

```ts
import { v7 as uuid } from "uuid";
import type { Locale } from "../notification/EmailNotification.js";
import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import {
  EMAIL_VERIFICATION_CODE_TTL_MINUTES,
  EMAIL_VERIFICATION_MAX_SENDS_PER_HOLD,
  EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
  emailVerificationCodeEmail,
  hashVerificationCode,
  newVerificationCode,
} from "./EmailVerification.js";
import type { IEmailVerificationRepository } from "./EmailVerificationRepository.js";
import { EmailVerificationCooldownError, EmailVerificationTooManySendsError, SeatHoldExpiredError } from "./errors.js";

export interface SendEmailVerificationCodeInput {
  seatHoldId: string;
  /** Normalized and already held to the checkout's student rules by the route. */
  email: string;
  recipientName: string;
  locale: Locale;
}

/**
 * Mails a fresh 6-digit code to the address the checkout's student typed
 * (spec 2026-10-07). The code leaves this method only inside the outbox row;
 * the database keeps its hash.
 */
export class SendEmailVerificationCodeUseCase extends BaseUseCase<
  SendEmailVerificationCodeInput,
  { resendAfterSeconds: number }
> {
  constructor(private readonly repository: IEmailVerificationRepository) {
    super();
  }

  async run(input: SendEmailVerificationCodeInput): Promise<{ resendAfterSeconds: number }> {
    const id = uuid();
    const code = newVerificationCode();
    const outcome = await this.repository.issue({
      id,
      seatHoldId: input.seatHoldId,
      email: input.email,
      codeHash: hashVerificationCode(id, code),
      ttlMinutes: EMAIL_VERIFICATION_CODE_TTL_MINUTES,
      cooldownSeconds: EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
      maxSends: EMAIL_VERIFICATION_MAX_SENDS_PER_HOLD,
      notifications: [
        emailVerificationCodeEmail({
          verificationId: id,
          to: input.email,
          recipientName: input.recipientName,
          code,
          locale: input.locale,
        }),
      ],
    });

    if (outcome === "hold_expired") throw new SeatHoldExpiredError();
    if (outcome === "cooldown") throw new EmailVerificationCooldownError();
    if (outcome === "too_many_sends") throw new EmailVerificationTooManySendsError();
    return { resendAfterSeconds: EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS };
  }
}
```

- [ ] **Step 7: Create `packages/domain/src/enrollment/ConfirmEmailVerificationUseCase.ts`**

```ts
import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import { EMAIL_VERIFICATION_MAX_ATTEMPTS, verificationCodeMatches } from "./EmailVerification.js";
import type { IEmailVerificationRepository } from "./EmailVerificationRepository.js";
import {
  EmailVerificationAttemptsExhaustedError,
  EmailVerificationCodeExpiredError,
  EmailVerificationCodeInvalidError,
  EmailVerificationNotFoundError,
} from "./errors.js";

export interface ConfirmEmailVerificationInput {
  seatHoldId: string;
  /** Normalized by the route. */
  email: string;
  code: string;
}

/** Checks the typed code against the newest code sent to this address on this
 * checkout. A second confirm of a verified row is a no-op, not an error. */
export class ConfirmEmailVerificationUseCase extends BaseUseCase<ConfirmEmailVerificationInput, void> {
  constructor(private readonly repository: IEmailVerificationRepository) {
    super();
  }

  async run(input: ConfirmEmailVerificationInput): Promise<void> {
    const row = await this.repository.findLatest({ seatHoldId: input.seatHoldId, email: input.email });
    if (!row) throw new EmailVerificationNotFoundError();
    if (row.verified) return;
    if (row.attempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS) throw new EmailVerificationAttemptsExhaustedError();
    if (row.expired) throw new EmailVerificationCodeExpiredError();

    if (!verificationCodeMatches(row.id, input.code, row.codeHash)) {
      const attempts = await this.repository.recordFailedAttempt(row.id);
      if (attempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS) throw new EmailVerificationAttemptsExhaustedError();
      throw new EmailVerificationCodeInvalidError();
    }

    if (!(await this.repository.markVerified(row.id))) throw new EmailVerificationCodeExpiredError();
  }
}
```

- [ ] **Step 8: Export from `packages/domain/src/index.ts`** — next to the other enrollment exports:

```ts
export {
  EMAIL_VERIFICATION_CODE_TTL_MINUTES,
  EMAIL_VERIFICATION_MAX_ATTEMPTS,
  EMAIL_VERIFICATION_MAX_SENDS_PER_HOLD,
  EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
  emailVerificationCodeEmail,
  hashVerificationCode,
  newVerificationCode,
  verificationCodeMatches,
} from "./enrollment/EmailVerification.js";
export type {
  IEmailVerificationRepository,
  IssueEmailVerificationOutcome,
  IssueEmailVerificationRequest,
  LatestEmailVerification,
} from "./enrollment/EmailVerificationRepository.js";
export {
  SendEmailVerificationCodeUseCase,
  type SendEmailVerificationCodeInput,
} from "./enrollment/SendEmailVerificationCodeUseCase.js";
export {
  ConfirmEmailVerificationUseCase,
  type ConfirmEmailVerificationInput,
} from "./enrollment/ConfirmEmailVerificationUseCase.js";
```

and add the seven new error classes to the existing `export { … } from "./enrollment/errors.js";` list.

- [ ] **Step 9: Run** `pnpm --filter @ooc/api test -- src/tests/email-verification.test.ts` — Expected: PASS. Then `pnpm -r --if-present run typecheck` — Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add packages/domain/src apps/api/src/tests/email-verification.test.ts
git commit -m "feat(domain): add checkout email verification use cases"
```

---

### Task 5: Drizzle repository + the submit consumes the proof

**Files:**
- Create: `apps/api/src/infra/persistence/enrollment/DrizzleEmailVerificationRepository.ts`
- Modify: `apps/api/src/infra/persistence/enrollment/DrizzlePublicEnrollmentRepository.ts`
- Modify: `packages/domain/src/enrollment/PublicEnrollmentRepository.ts` (doc comment on `seatHoldId`)
- Test: `apps/api/src/infra/persistence/enrollment/DrizzleEmailVerificationRepository.integration.test.ts` (new)

**Interfaces:**
- Consumes: `emailVerifications`, `seatHolds` (`@ooc/db`), `IEmailVerificationRepository` (Task 4), `insertOutboxEmails`.
- Produces: `class DrizzleEmailVerificationRepository implements IEmailVerificationRepository`; `consumeVerifiedEmail(tx, { seatHoldId, email }): Promise<boolean>`.

- [ ] **Step 1: Write the failing integration test.** Fixture style copied from `DrizzleSeatHoldRepository.integration.test.ts` (own ids, cleaned before and after — `email_verifications` and `outbox` are outside the delete lock):

```ts
import { randomUUID } from "node:crypto";
import * as schema from "@ooc/db";
import { academicPeriods, classGroups, courses, emailVerifications, outbox, seatHolds } from "@ooc/db";
import { emailVerificationCodeEmail, hashVerificationCode } from "@ooc/domain";
import { eq, inArray, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/infra/db/client.js";
import { DrizzleEmailVerificationRepository, consumeVerifiedEmail } from "./DrizzleEmailVerificationRepository.js";
import { DrizzleSeatHoldRepository } from "./DrizzleSeatHoldRepository.js";

/**
 * The checkout's e-mail proof in SQL (spec 2026-10-07): the code row and its
 * e-mail written together, cooldown and send cap per hold, expiry and attempts
 * on the database clock, and a proof consumed exactly once.
 *
 * Runs against a real, migrated Postgres (`pnpm test:api:db`).
 */

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required: this suite exercises DrizzleEmailVerificationRepository against a real, migrated Postgres.");
}

const PERIOD = "018f2b5c-7000-7000-8000-000000000001";
const COURSE = "018f2b5c-7000-7000-8000-000000000002";
const GROUP = "018f2b5c-7000-7000-8000-000000000003";
const EMAIL = "verify.integration@gmail.com";

let pool: pg.Pool;
let db: Db;
let repository: DrizzleEmailVerificationRepository;
let holdId: string;

beforeAll(() => {
  pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
  db = drizzle(pool, { schema, casing: "snake_case" });
  repository = new DrizzleEmailVerificationRepository(db);
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await cleanUp();
  await db.insert(academicPeriods).values({
    id: PERIOD,
    name: "Ciclo de prueba (email verification integration)",
    startsOn: new Date("2026-03-01T00:00:00.000Z"),
    endsOn: new Date("2026-07-31T00:00:00.000Z"),
  });
  await db.insert(courses).values({ id: COURSE, name: "Curso (email verification)", language: "Lengua de prueba", minAge: 12 });
  await db.insert(classGroups).values({
    id: GROUP,
    status: "enrolling",
    courseId: COURSE,
    academicPeriodId: PERIOD,
    schedule: "Lun/Mié 19:00",
    startsOn: new Date("2026-03-02T00:00:00.000Z"),
    endsOn: new Date("2026-06-30T00:00:00.000Z"),
    capacity: 5,
  });
  const claimed = await new DrizzleSeatHoldRepository(db).claim({ classGroupId: GROUP, origin: "web", holdMinutes: 15 });
  if (claimed.kind !== "held") throw new Error("fixture hold not taken");
  holdId = claimed.hold.id;
});

afterEach(async () => {
  await cleanUp();
});

async function cleanUp(): Promise<void> {
  const holds = db.select({ id: seatHolds.id }).from(seatHolds).where(eq(seatHolds.classGroupId, GROUP));
  await db.delete(emailVerifications).where(inArray(emailVerifications.seatHoldId, holds));
  await db.delete(outbox).where(like(outbox.dedupeKey, "email_verification_code:%"));
  await db.delete(seatHolds).where(eq(seatHolds.classGroupId, GROUP));
  await db.delete(classGroups).where(eq(classGroups.id, GROUP));
  await db.delete(courses).where(eq(courses.id, COURSE));
  await db.delete(academicPeriods).where(eq(academicPeriods.id, PERIOD));
}

function request(code = "123456", overrides: Partial<{ cooldownSeconds: number; maxSends: number }> = {}) {
  // apps/api has no `uuid` dependency; a v4 id is as good as v7 for the column.
  const id = randomUUID();
  return {
    id,
    seatHoldId: holdId,
    email: EMAIL,
    codeHash: hashVerificationCode(id, code),
    ttlMinutes: 10,
    cooldownSeconds: overrides.cooldownSeconds ?? 60,
    maxSends: overrides.maxSends ?? 5,
    notifications: [emailVerificationCodeEmail({ verificationId: id, to: EMAIL, recipientName: "Rosa", code, locale: "es-PE" as const })],
  };
}

/** Pretends every code of the hold was sent long ago (past the cooldown). */
async function ageSends(): Promise<void> {
  await db
    .update(emailVerifications)
    .set({ createdAt: sql`now() - interval '2 minutes'` })
    .where(eq(emailVerifications.seatHoldId, holdId));
}

describe("DrizzleEmailVerificationRepository.issue", () => {
  it("writes the row and its e-mail together, expiring on the database clock", async () => {
    const issued = request();
    expect(await repository.issue(issued)).toBe("issued");

    const [row] = await db
      .select({ expiresInSeconds: sql<number>`extract(epoch from ${emailVerifications.expiresAt} - now())::int` })
      .from(emailVerifications)
      .where(eq(emailVerifications.id, issued.id));
    expect(row!.expiresInSeconds).toBeGreaterThan(9 * 60);
    expect(row!.expiresInSeconds).toBeLessThanOrEqual(10 * 60);

    const mails = await db.select().from(outbox).where(eq(outbox.dedupeKey, `email_verification_code:${issued.id}:student`));
    expect(mails).toHaveLength(1);
  });

  it("refuses inside the cooldown and past the send cap", async () => {
    expect(await repository.issue(request())).toBe("issued");
    expect(await repository.issue(request())).toBe("cooldown");

    await ageSends();
    expect(await repository.issue(request("123456", { maxSends: 1 }))).toBe("too_many_sends");
  });

  it("refuses a hold that is no longer alive and writes nothing", async () => {
    await db.update(seatHolds).set({ expiresAt: sql`now() - interval '1 second'` }).where(eq(seatHolds.id, holdId));
    const issued = request();
    expect(await repository.issue(issued)).toBe("hold_expired");
    expect(await db.select().from(emailVerifications).where(eq(emailVerifications.id, issued.id))).toHaveLength(0);
  });

  it("expires the pending code when a new one goes out", async () => {
    const first = request("111111");
    await repository.issue(first);
    await ageSends();
    await repository.issue(request("222222"));

    const [firstNow] = await db
      .select({ expired: sql<boolean>`${emailVerifications.expiresAt} <= now()` })
      .from(emailVerifications)
      .where(eq(emailVerifications.id, first.id));
    expect(firstNow!.expired).toBe(true);

    const latest = await repository.findLatest({ seatHoldId: holdId, email: EMAIL });
    expect(latest!.codeHash).toBe(hashVerificationCode(latest!.id, "222222"));
  });
});

describe("attempts, verification and consumption", () => {
  it("counts attempts up to the cap and stops verifying past it", async () => {
    const issued = request();
    await repository.issue(issued);
    for (let i = 1; i <= 5; i++) expect(await repository.recordFailedAttempt(issued.id)).toBe(i);
    expect(await repository.recordFailedAttempt(issued.id)).toBe(5);
    expect(await repository.markVerified(issued.id)).toBe(false);
  });

  it("does not verify an expired code", async () => {
    const issued = request();
    await repository.issue(issued);
    await db.update(emailVerifications).set({ expiresAt: sql`now() - interval '1 second'` }).where(eq(emailVerifications.id, issued.id));
    expect((await repository.findLatest({ seatHoldId: holdId, email: EMAIL }))!.expired).toBe(true);
    expect(await repository.markVerified(issued.id)).toBe(false);
  });

  it("consumes a verified proof exactly once, and never an unverified one", async () => {
    const issued = request();
    await repository.issue(issued);
    expect(await consumeVerifiedEmail(db, { seatHoldId: holdId, email: EMAIL })).toBe(false);

    expect(await repository.markVerified(issued.id)).toBe(true);
    expect(await consumeVerifiedEmail(db, { seatHoldId: holdId, email: "otra@gmail.com" })).toBe(false);
    expect(await consumeVerifiedEmail(db, { seatHoldId: holdId, email: EMAIL })).toBe(true);
    expect(await consumeVerifiedEmail(db, { seatHoldId: holdId, email: EMAIL })).toBe(false);
  });
});
```

- [ ] **Step 2: Run** `pnpm test:api:db -- src/infra/persistence/enrollment/DrizzleEmailVerificationRepository.integration.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Create `apps/api/src/infra/persistence/enrollment/DrizzleEmailVerificationRepository.ts`**

```ts
import {
  EMAIL_VERIFICATION_MAX_ATTEMPTS,
  type IEmailVerificationRepository,
  type IssueEmailVerificationOutcome,
  type IssueEmailVerificationRequest,
  type LatestEmailVerification,
} from "@ooc/domain";
import { emailVerifications, seatHolds } from "@ooc/db";
import { and, desc, eq, gt, isNotNull, isNull, lt, sql } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";
import { insertOutboxEmails } from "@/infra/persistence/notification/DrizzleOutboxRepository.js";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * The checkout's e-mail proof (spec 2026-10-07). Every clock decision —
 * expiry, cooldown — is taken on the database clock, in SQL.
 */
export class DrizzleEmailVerificationRepository implements IEmailVerificationRepository {
  constructor(private readonly db: Db) {}

  async issue(request: IssueEmailVerificationRequest): Promise<IssueEmailVerificationOutcome> {
    return this.db.transaction(async (tx) => {
      // FOR UPDATE serializes two sends for the same hold, so the cooldown and
      // the send cap below cannot both be passed by a double click.
      const [hold] = await tx
        .select({ id: seatHolds.id })
        .from(seatHolds)
        .where(and(eq(seatHolds.id, request.seatHoldId), eq(seatHolds.status, "active"), gt(seatHolds.expiresAt, sql`now()`)))
        .for("update");
      if (!hold) return "hold_expired";

      const [stats] = await tx
        .select({
          sends: sql<number>`count(*)::int`,
          coolingDown: sql<boolean>`coalesce(bool_or(${emailVerifications.createdAt} > now() - make_interval(secs => ${request.cooldownSeconds}::int)), false)`,
        })
        .from(emailVerifications)
        .where(eq(emailVerifications.seatHoldId, hold.id));
      if (stats?.coolingDown) return "cooldown";
      if ((stats?.sends ?? 0) >= request.maxSends) return "too_many_sends";

      // Only the newest code works.
      await tx
        .update(emailVerifications)
        .set({ expiresAt: sql`now()`, updatedAt: sql`now()` })
        .where(
          and(
            eq(emailVerifications.seatHoldId, hold.id),
            isNull(emailVerifications.verifiedAt),
            gt(emailVerifications.expiresAt, sql`now()`),
          ),
        );

      await tx.insert(emailVerifications).values({
        id: request.id,
        seatHoldId: hold.id,
        email: request.email,
        codeHash: request.codeHash,
        expiresAt: sql`now() + make_interval(mins => ${request.ttlMinutes}::int)`,
      });
      await insertOutboxEmails(tx, request.notifications);
      return "issued";
    });
  }

  async findLatest(params: { seatHoldId: string; email: string }): Promise<LatestEmailVerification | null> {
    const [row] = await this.db
      .select({
        id: emailVerifications.id,
        codeHash: emailVerifications.codeHash,
        attempts: emailVerifications.attempts,
        expired: sql<boolean>`${emailVerifications.expiresAt} <= now()`,
        verified: sql<boolean>`${emailVerifications.verifiedAt} is not null`,
      })
      .from(emailVerifications)
      .where(
        and(
          eq(emailVerifications.seatHoldId, params.seatHoldId),
          eq(emailVerifications.email, params.email),
          isNull(emailVerifications.consumedAt),
        ),
      )
      .orderBy(desc(emailVerifications.createdAt), desc(emailVerifications.id))
      .limit(1);
    return row ?? null;
  }

  async recordFailedAttempt(id: string): Promise<number> {
    const [row] = await this.db
      .update(emailVerifications)
      .set({ attempts: sql`${emailVerifications.attempts} + 1`, updatedAt: sql`now()` })
      .where(and(eq(emailVerifications.id, id), lt(emailVerifications.attempts, EMAIL_VERIFICATION_MAX_ATTEMPTS)))
      .returning({ attempts: emailVerifications.attempts });
    return row?.attempts ?? EMAIL_VERIFICATION_MAX_ATTEMPTS;
  }

  async markVerified(id: string): Promise<boolean> {
    const rows = await this.db
      .update(emailVerifications)
      .set({ verifiedAt: sql`now()`, updatedAt: sql`now()` })
      .where(
        and(
          eq(emailVerifications.id, id),
          isNull(emailVerifications.verifiedAt),
          gt(emailVerifications.expiresAt, sql`now()`),
          lt(emailVerifications.attempts, EMAIL_VERIFICATION_MAX_ATTEMPTS),
        ),
      )
      .returning({ id: emailVerifications.id });
    return rows.length > 0;
  }
}

/**
 * Called by the public submit with ITS transaction: takes the verified,
 * unconsumed proof for this hold and address and marks it consumed. `false`
 * means there is none — the submit refuses and rolls everything back.
 * Expiry does not matter here: the proof lives as long as its seat hold, and
 * the submit has already locked a live one.
 */
export async function consumeVerifiedEmail(
  tx: Pick<Tx, "select" | "update">,
  params: { seatHoldId: string; email: string },
): Promise<boolean> {
  const [proof] = await tx
    .select({ id: emailVerifications.id })
    .from(emailVerifications)
    .where(
      and(
        eq(emailVerifications.seatHoldId, params.seatHoldId),
        eq(emailVerifications.email, params.email),
        isNotNull(emailVerifications.verifiedAt),
        isNull(emailVerifications.consumedAt),
      ),
    )
    .orderBy(desc(emailVerifications.verifiedAt))
    .limit(1)
    .for("update");
  if (!proof) return false;

  await tx
    .update(emailVerifications)
    .set({ consumedAt: sql`now()`, updatedAt: sql`now()` })
    .where(eq(emailVerifications.id, proof.id));
  return true;
}
```

(If `tsc` rejects passing `db` where `Pick<Tx, ...>` is expected in the test, widen the param type to `Pick<Db, "select" | "update"> | Pick<Tx, "select" | "update">`.)

- [ ] **Step 4: Run** the integration test. Expected: PASS.

- [ ] **Step 5: Wire it into the submit.** In `DrizzlePublicEnrollmentRepository.ts`, import `EmailVerificationRequiredError` from `@ooc/domain` and `consumeVerifiedEmail` from `./DrizzleEmailVerificationRepository.js`, then right after the `if (!receiptRow) { throw new ReceiptNotReadyError(); }` block add:

```ts
      // The student's e-mail must have been proven on this same checkout
      // (spec 2026-10-07). Consumed here, inside the submit's transaction, so
      // one proof becomes at most one enrollment — and a refused submit rolls
      // the consumption back with everything else. `params.student.email` is
      // already normalized by Student.create.
      if (!(await consumeVerifiedEmail(tx, { seatHoldId: liveHold.id, email: params.student.email }))) {
        throw new EmailVerificationRequiredError();
      }
```

In `packages/domain/src/enrollment/PublicEnrollmentRepository.ts`, extend the `seatHoldId` doc comment of `SubmitPublicEnrollmentParams`:

```ts
  /** Consumed in the same transaction: it must still be `active`, unexpired
   * on the database clock and for the same class group, or the submit fails
   * with `SeatHoldExpiredError` and writes nothing. It must also carry a
   * verified, unconsumed e-mail proof for `student.email`, or the submit fails
   * with `EmailVerificationRequiredError` and writes nothing (spec 2026-10-07). */
```

- [ ] **Step 6: Run** `pnpm --filter @ooc/api test` (whole unit suite — the submit route tests stub the use case, so they stay green) and `pnpm test:api:db` (whole integration suite). Expected: PASS. Then `pnpm -r --if-present run typecheck`.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/infra/persistence/enrollment packages/domain/src/enrollment/PublicEnrollmentRepository.ts
git commit -m "feat(api): persist email verifications and require the proof at submit"
```

---

### Task 6: Routes, rate limits, container

**Files:**
- Create: `apps/api/src/http/enrollment/SendEmailVerificationRoute.ts`
- Create: `apps/api/src/http/enrollment/ConfirmEmailVerificationRoute.ts`
- Modify: `apps/api/src/shared/http/rateLimit.ts`, `apps/api/src/container.ts`, `apps/api/src/app.ts`
- Test: `apps/api/src/tests/email-verification-routes.test.ts` (new)

Read the `fastify-route` skill (`apps/api/.claude/skills`) before writing the routes.

**Interfaces:**
- Consumes: `container.useCases.enrollment.sendEmailVerification` / `.confirmEmailVerification` (wired here), `container.edge.captcha.verify(token, ip): Promise<"passed" | "failed" | "unavailable">`.
- Produces: `POST /api/v1/enrollments/email-verifications` body `{holdId, email, recipientName, locale, captchaToken}` → 202 `{resendAfterSeconds}`; `POST /api/v1/enrollments/email-verifications/confirm` body `{holdId, email, code}` → 200 `{verified: true}`.

- [ ] **Step 1: Write the failing route test** `apps/api/src/tests/email-verification-routes.test.ts`:

```ts
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EmailVerificationCodeInvalidError,
  EmailVerificationCooldownError,
  EmailVerificationRequiredError,
} from "@ooc/domain";
import { buildApp } from "@/app.js";
import { container } from "@/container.js";

/** The two public verification routes, no database: use cases and captcha stubbed. */

let app: FastifyInstance;
beforeAll(async () => {
  app = await buildApp();
});
afterAll(async () => {
  await app.close();
});
beforeEach(() => {
  vi.spyOn(container.edge.rateLimiter, "hit").mockResolvedValue(null);
});
afterEach(() => {
  vi.restoreAllMocks();
});

const HOLD = "018f2b5c-8000-7000-8000-000000000001";
const SEND = { holdId: HOLD, email: " Rosa.Quispe@GMAIL.com ", recipientName: "Rosa", locale: "es-PE", captchaToken: "t" };
const send = (payload: object) =>
  app.inject({ method: "POST", url: "/api/v1/enrollments/email-verifications", payload });
const confirm = (payload: object) =>
  app.inject({ method: "POST", url: "/api/v1/enrollments/email-verifications/confirm", payload });

describe("POST /enrollments/email-verifications", () => {
  it("checks the captcha, normalizes the address and answers 202 with the resend delay", async () => {
    vi.spyOn(container.edge.captcha, "verify").mockResolvedValue("passed");
    const run = vi.spyOn(container.useCases.enrollment.sendEmailVerification, "run").mockResolvedValue({ resendAfterSeconds: 60 });

    const response = await send(SEND);

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ resendAfterSeconds: 60 });
    expect(run).toHaveBeenCalledWith({ seatHoldId: HOLD, email: "rosa.quispe@gmail.com", recipientName: "Rosa", locale: "es-PE" });
  });

  it("refuses a failed captcha before sending anything", async () => {
    vi.spyOn(container.edge.captcha, "verify").mockResolvedValue("failed");
    const run = vi.spyOn(container.useCases.enrollment.sendEmailVerification, "run");

    const response = await send(SEND);

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({ reason: "captcha.failed" });
    expect(run).not.toHaveBeenCalled();
  });

  it("fails closed when the captcha cannot be checked", async () => {
    vi.spyOn(container.edge.captcha, "verify").mockResolvedValue("unavailable");
    expect((await send(SEND)).statusCode).toBe(503);
  });

  it.each([
    ["not a Gmail", "rosa@hotmail.com", "email_must_be_gmail"],
    ["an impossible Gmail username", "rosa+x@gmail.com", "email_gmail_username_invalid"],
  ])("refuses %s as a field error", async (_label, email, code) => {
    const verify = vi.spyOn(container.edge.captcha, "verify");
    const response = await send({ ...SEND, email });

    expect(response.statusCode).toBe(400);
    expect(response.json().fields).toEqual(expect.arrayContaining([{ path: "email", code }]));
    expect(verify).not.toHaveBeenCalled();
  });

  it("answers the cooldown as 429 with its own reason", async () => {
    vi.spyOn(container.edge.captcha, "verify").mockResolvedValue("passed");
    vi.spyOn(container.useCases.enrollment.sendEmailVerification, "run").mockRejectedValue(new EmailVerificationCooldownError());

    const response = await send(SEND);

    expect(response.statusCode).toBe(429);
    expect(response.json()).toMatchObject({ reason: "email_verification.cooldown" });
  });
});

describe("POST /enrollments/email-verifications/confirm", () => {
  it("answers a right code with 200", async () => {
    const run = vi.spyOn(container.useCases.enrollment.confirmEmailVerification, "run").mockResolvedValue();

    const response = await confirm({ holdId: HOLD, email: "Rosa.Quispe@gmail.com", code: "042137" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ verified: true });
    expect(run).toHaveBeenCalledWith({ seatHoldId: HOLD, email: "rosa.quispe@gmail.com", code: "042137" });
  });

  it("refuses a code that is not six digits without calling the use case", async () => {
    const run = vi.spyOn(container.useCases.enrollment.confirmEmailVerification, "run");
    expect((await confirm({ holdId: HOLD, email: "rosa.quispe@gmail.com", code: "12ab" })).statusCode).toBe(400);
    expect(run).not.toHaveBeenCalled();
  });

  it("passes a wrong code through as 422 with its reason", async () => {
    vi.spyOn(container.useCases.enrollment.confirmEmailVerification, "run").mockRejectedValue(new EmailVerificationCodeInvalidError());
    const response = await confirm({ holdId: HOLD, email: "rosa.quispe@gmail.com", code: "000000" });
    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({ reason: "email_verification.code_invalid" });
  });
});

describe("POST /enrollments/public without a proof", () => {
  it("surfaces email_verification.required as 422", async () => {
    vi.spyOn(container.edge.idempotency, "begin").mockResolvedValue({
      kind: "fresh",
      complete: vi.fn(async () => {}),
      abandon: vi.fn(async () => {}),
    });
    vi.spyOn(container.edge.captcha, "verify").mockResolvedValue("passed");
    vi.spyOn(container.useCases.enrollment.submitPublic, "run").mockRejectedValue(new EmailVerificationRequiredError());

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/enrollments/public",
      payload: {
        captchaToken: "t",
        holdId: HOLD,
        receiptUploadId: "018f2b5c-8000-7000-8000-000000000002",
        classGroupId: "018f2b5c-8000-7000-8000-000000000003",
        planId: "018f2b5c-8000-7000-8000-000000000004",
        student: {
          firstName: "Rosa",
          lastName: "Quispe",
          nationalIdType: "DNI",
          nationalId: "70123456",
          email: "rosa.quispe@gmail.com",
          phone: "987654321",
          birthDate: "1996-04-12",
          country: "PE",
          region: "Lima",
          city: "Chorrillos",
        },
        guardian: null,
        locale: "es-PE",
        payment: { method: "yape", methodDetail: null, operationNumber: "12345678", idempotencyKey: "018f2b5c-8000-7000-8000-000000000005" },
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({ reason: "email_verification.required" });
  });
});
```

- [ ] **Step 2: Run** `pnpm --filter @ooc/api test -- src/tests/email-verification-routes.test.ts` — Expected: FAIL (404 / missing use cases).

- [ ] **Step 3: Rate limit rules** — in `RATE_LIMITS` (`apps/api/src/shared/http/rateLimit.ts`), after `receiptUpload`:

```ts
  /** Checkout: mailing the e-mail verification code. */
  emailVerificationSend: { name: "email-verification-send:ip", by: "ip", limit: 20, windowSeconds: 10 * MINUTE },
  /** Checkout: typing the code. */
  emailVerificationConfirm: { name: "email-verification-confirm:ip", by: "ip", limit: 60, windowSeconds: 10 * MINUTE },
```

- [ ] **Step 4: Create `apps/api/src/http/enrollment/SendEmailVerificationRoute.ts`**

```ts
import { EmailField, HttpError, LocaleSchema, PersonNameField, UnableToProcessEntryError, refineGmail } from "@ooc/domain";
import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { RATE_LIMITS, perSeatHold } from "@/shared/http/rateLimit.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const BodySchema = z
  .object({
    holdId: z.string().uuid(),
    // The student's rules: an address, a Gmail, a username Gmail allows.
    email: EmailField,
    // Who the e-mail greets — the first name the student already typed.
    recipientName: PersonNameField,
    locale: LocaleSchema,
    captchaToken: z.string().min(1).max(2048),
  })
  .superRefine(refineGmail);

/**
 * Mails the checkout's 6-digit code (spec 2026-10-07). Public: the student
 * has no account yet. Captcha in the body because this sends e-mail to an
 * address the caller has not proven; per-IP and per-hold limits on top, and
 * the use case's own per-hold cooldown and cap. No enumeration concern: it
 * never reads `students`, and only ever writes to the address it was given.
 */
export const sendEmailVerificationRoute = RouteBuilder.post("/enrollments/email-verifications")
  .docs({ tags: ["Enrollments"], summary: "Mail the checkout's e-mail verification code" })
  .public()
  .rateLimit(RATE_LIMITS.emailVerificationSend, perSeatHold("email-verification-send", 10, "holdId"))
  .body(BodySchema)
  .response(202, z.object({ resendAfterSeconds: z.number().int() }))
  .response(400, ErrorResponseSchema)
  .response(422, ErrorResponseSchema)
  .response(429, ErrorResponseSchema)
  .response(503, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const { holdId, email, recipientName, locale, captchaToken } = request.body;

    const captcha = await container.edge.captcha.verify(captchaToken, request.clientIp);
    if (captcha === "failed") {
      throw new UnableToProcessEntryError({ reason: "captcha.failed", message: "The captcha token was refused." });
    }
    if (captcha === "unavailable") {
      throw new HttpError({ status: 503, reason: "captcha.unavailable", message: "The captcha could not be verified." });
    }

    const result = await container.useCases.enrollment.sendEmailVerification.run({
      seatHoldId: holdId,
      email,
      recipientName,
      locale,
    });
    reply.status(202).send(result);
  });
```

- [ ] **Step 5: Create `apps/api/src/http/enrollment/ConfirmEmailVerificationRoute.ts`**

```ts
import { EmailField } from "@ooc/domain";
import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { RATE_LIMITS, perSeatHold } from "@/shared/http/rateLimit.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const BodySchema = z.object({
  holdId: z.string().uuid(),
  email: EmailField,
  code: z.string().regex(/^\d{6}$/),
});

/**
 * Checks the typed code (spec 2026-10-07). No captcha: five attempts per code
 * and the per-hold limit already cap a guess far below the million codes.
 */
export const confirmEmailVerificationRoute = RouteBuilder.post("/enrollments/email-verifications/confirm")
  .docs({ tags: ["Enrollments"], summary: "Confirm the checkout's e-mail verification code" })
  .public()
  .rateLimit(RATE_LIMITS.emailVerificationConfirm, perSeatHold("email-verification-confirm", 30, "holdId"))
  .body(BodySchema)
  .response(200, z.object({ verified: z.literal(true) }))
  .response(400, ErrorResponseSchema)
  .response(422, ErrorResponseSchema)
  .response(429, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const { holdId, email, code } = request.body;
    await container.useCases.enrollment.confirmEmailVerification.run({ seatHoldId: holdId, email, code });
    reply.status(200).send({ verified: true });
  });
```

- [ ] **Step 6: Container (`apps/api/src/container.ts`)**
  - import `ConfirmEmailVerificationUseCase`, `SendEmailVerificationCodeUseCase`, `type IEmailVerificationRepository` from `@ooc/domain`, and `DrizzleEmailVerificationRepository` from `./infra/persistence/enrollment/DrizzleEmailVerificationRepository.js`;
  - repositories interface: `emailVerification: IEmailVerificationRepository;` next to `seatHold`;
  - `AppUseCases.enrollment`: `sendEmailVerification: SendEmailVerificationCodeUseCase;` and `confirmEmailVerification: ConfirmEmailVerificationUseCase;`;
  - build: `const emailVerificationRepository = new DrizzleEmailVerificationRepository(db);` next to `seatHoldRepository`, and in the enrollment use cases `sendEmailVerification: new SendEmailVerificationCodeUseCase(emailVerificationRepository)`, `confirmEmailVerification: new ConfirmEmailVerificationUseCase(emailVerificationRepository)`; add the repository to the returned `repositories` object.

- [ ] **Step 7: Register in `apps/api/src/app.ts`** — import both routes and add after `confirmReceiptUploadRoute`:

```ts
        instance.withTypeProvider<ZodTypeProvider>().route(sendEmailVerificationRoute);
        instance.withTypeProvider<ZodTypeProvider>().route(confirmEmailVerificationRoute);
```

- [ ] **Step 8: Run** `pnpm --filter @ooc/api test` (full unit suite — includes `public-route-protection.test.ts`, which boots the app and fails if a public route lacks a rate limit). Expected: PASS. Then `pnpm -r --if-present run typecheck`.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src
git commit -m "feat(api): add public routes to send and confirm the checkout email code"
```

---

### Task 7: Checkout state — proof in the draft, guardian confirmation, fetch helpers

**Files:**
- Modify: `apps/app/src/lib/enrollment/types.ts`, `apps/app/src/lib/enrollment/checkout.ts`, `apps/app/src/lib/enrollment/use-checkout.ts`
- Create: `apps/app/src/lib/enrollment/email-verification.ts`
- Modify: `apps/app/src/messages/enrollment/{es-PE,pt-BR,en}.json` (`enrollment.error.email_mismatch`)

**Interfaces:**
- Produces:
  - `CheckoutDraft.emailVerification: EmailVerificationProof | null` with `EmailVerificationProof = { holdId: string; email: string }`
  - `GuardianDraft.emailConfirmation: string`; `validateGuardian` error `emailConfirmation: 'email_mismatch'`
  - `isEmailVerified(draft: CheckoutDraft, holdId: string | null): boolean`
  - `sendVerificationCode(body): Promise<SendCodeOutcome>`, `confirmVerificationCode(body): Promise<ConfirmCodeOutcome>`

No test runner exists in `apps/app`; the rules these helpers lean on are tested in `@ooc/domain` (Task 1). Verification for this task is `tsc` + lint, then the manual run in Task 8.

- [ ] **Step 1: Types (`types.ts`)** — add to `GuardianDraft`, after `email`:

```ts
  /** Typed twice: no code proves this address (spec 2026-10-07), so a typo
   * here is caught only by the reader agreeing with themselves. */
  emailConfirmation: string
```

Add above `CheckoutDraft`:

```ts
/**
 * The student's e-mail, proven with the 6-digit code on this checkout's seat
 * hold (spec 2026-10-07). Kept so a reload does not ask for the code again;
 * it only counts while both the hold and the address still match.
 */
export interface EmailVerificationProof {
  holdId: string
  email: string
}
```

and to `CheckoutDraft`: `emailVerification: EmailVerificationProof | null`.

- [ ] **Step 2: `checkout.ts`** — in `emptyDraft`: guardian `emailConfirmation: ''`, top-level `emailVerification: null`. Import `normalizeEmail` from `@ooc/domain/fields`. In `validateGuardian`, replace the e-mail line with:

```ts
  // Any provider: Classroom belongs to the student.
  const emailError = issueOf(EmailField, draft.email)
  if (emailError) errors.email = emailError
  // Typed twice, compared as the server will store it.
  else if (normalizeEmail(draft.emailConfirmation) !== normalizeEmail(draft.email)) {
    errors.emailConfirmation = 'email_mismatch'
  }
```

- [ ] **Step 3: `use-checkout.ts` restore** — in the `setDraftState({...})` of the restore effect add `emailVerification: stored.emailVerification ?? null,` (the guardian already merges over `fallback.guardian`, so `emailConfirmation` lands on `''` for an old draft).

- [ ] **Step 4: Create `apps/app/src/lib/enrollment/email-verification.ts`**

```ts
import { normalizeEmail } from '@ooc/domain/fields'
import type { CheckoutDraft } from './types'

/**
 * The checkout's e-mail proof (spec 2026-10-07). The server decides; this
 * file only talks to it and reads its answers into outcomes the screen
 * translates — never a reason string on screen (CLAUDE.md §4).
 */

export type SendCodeOutcome =
  | { kind: 'sent'; resendAfterSeconds: number }
  | {
      kind:
        | 'cooldown'
        | 'too_many_sends'
        | 'captcha_failed'
        | 'captcha_unavailable'
        | 'rate_limited'
        | 'hold_expired'
        | 'invalid_email'
        | 'failed'
    }

export type ConfirmCodeOutcome =
  | 'verified'
  | 'code_invalid'
  | 'code_expired'
  | 'attempts_exhausted'
  | 'not_found'
  | 'rate_limited'
  | 'failed'

/** The proof counts only for this hold and this address. */
export function isEmailVerified(draft: CheckoutDraft, holdId: string | null): boolean {
  const proof = draft.emailVerification
  return (
    proof !== null &&
    holdId !== null &&
    proof.holdId === holdId &&
    normalizeEmail(proof.email) === normalizeEmail(draft.student.email)
  )
}

async function reasonOf(response: Response): Promise<string | null> {
  const body = (await response.json().catch(() => null)) as { reason?: unknown } | null
  return typeof body?.reason === 'string' ? body.reason : null
}

function post(path: string, body: unknown): Promise<Response> {
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function sendVerificationCode(body: {
  holdId: string
  email: string
  recipientName: string
  locale: 'es-PE' | 'en' | 'pt-BR'
  captchaToken: string
}): Promise<SendCodeOutcome> {
  try {
    const response = await post('/api/v1/enrollments/email-verifications', body)
    if (response.status === 202) {
      const ok = (await response.json()) as { resendAfterSeconds: number }
      return { kind: 'sent', resendAfterSeconds: ok.resendAfterSeconds }
    }
    if (response.status === 400) return { kind: 'invalid_email' }
    if (response.status === 503) return { kind: 'captcha_unavailable' }
    const reason = await reasonOf(response)
    if (reason === 'email_verification.cooldown') return { kind: 'cooldown' }
    if (reason === 'email_verification.too_many_sends') return { kind: 'too_many_sends' }
    if (reason === 'captcha.failed') return { kind: 'captcha_failed' }
    if (reason === 'enrollment.seat_hold_expired') return { kind: 'hold_expired' }
    if (response.status === 429) return { kind: 'rate_limited' }
    return { kind: 'failed' }
  } catch {
    return { kind: 'failed' }
  }
}

export async function confirmVerificationCode(body: {
  holdId: string
  email: string
  code: string
}): Promise<ConfirmCodeOutcome> {
  try {
    const response = await post('/api/v1/enrollments/email-verifications/confirm', body)
    if (response.ok) return 'verified'
    if (response.status === 429) return 'rate_limited'
    if (response.status === 400) return 'code_invalid'
    const reason = await reasonOf(response)
    if (reason === 'email_verification.code_invalid') return 'code_invalid'
    if (reason === 'email_verification.code_expired') return 'code_expired'
    if (reason === 'email_verification.attempts_exhausted') return 'attempts_exhausted'
    if (reason === 'email_verification.not_found') return 'not_found'
    return 'failed'
  } catch {
    return 'failed'
  }
}
```

- [ ] **Step 5: Copy** — `enrollment.error.email_mismatch`:
  - es-PE: `"Los dos correos no coinciden."`
  - pt-BR: `"Os dois e-mails não coincidem."`
  - en: `"The two addresses do not match."`

- [ ] **Step 6: Verify** — `pnpm typecheck:app` and `pnpm --filter @ooc/app lint`. Expected: clean. (`step-student.tsx` still compiles: it does not read the new fields yet.)

- [ ] **Step 7: Commit**

```bash
git add apps/app/src/lib/enrollment apps/app/src/messages/enrollment
git commit -m "feat(app): keep the email proof in the checkout draft and confirm the guardian email"
```

---

### Task 8: Checkout screen — verify block, suggestion, guardian confirmation, submit mapping

**Files:**
- Create: `apps/app/src/app/[locale]/enrollment/email-verification.tsx`
- Create: `apps/app/src/app/[locale]/enrollment/email-suggestion.tsx`
- Modify: `apps/app/src/app/[locale]/enrollment/step-student.tsx`, `checkout.tsx`, `step-review.tsx`
- Modify: `apps/app/src/messages/enrollment/{es-PE,pt-BR,en}.json`

**Interfaces:**
- Consumes: Task 7 helpers and types; `Turnstile` (`@/components/enrollment/turnstile`), `env.NEXT_PUBLIC_TURNSTILE_SITE_KEY`; `expireHold` from `useCheckout`.
- Produces: `<EmailVerification holdId email recipientName ready verified onVerified onHoldExpired />`, `<EmailSuggestion email onApply />`, `SubmitOutcome` gains `'email_unverified'`.

- [ ] **Step 1: Copy first** (so the components compile against real keys). Under `enrollment.step.student.verify` in each locale:

es-PE:
```json
"verify": {
  "title": "Verifica tu correo",
  "intro": "Te enviaremos un código de 6 dígitos a {email}. Así confirmamos que el correo existe y es tuyo: ahí llegarán el acceso a la clase y los avisos de tu matrícula.",
  "send": "Enviar código",
  "sending": "Enviando…",
  "sent": "Enviamos un código a {email}. Puede tardar hasta un minuto; revisa también la carpeta de spam.",
  "code_label": "Código de 6 dígitos",
  "confirm": "Verificar",
  "confirming": "Verificando…",
  "resend": "Reenviar código",
  "resend_in": "Puedes pedir otro código en {seconds} s",
  "change_email": "Cambiar correo",
  "verified": "Correo verificado",
  "required": "Verifica tu correo con el código para continuar.",
  "fill_email_first": "Escribe un correo de Gmail válido para recibir el código.",
  "captcha_hint": "Completa la verificación de seguridad para enviar el código.",
  "error": {
    "code_invalid": "El código no es correcto. Revísalo e inténtalo de nuevo.",
    "code_expired": "Ese código venció o fue reemplazado por uno nuevo. Pide otro código.",
    "attempts_exhausted": "Demasiados intentos con este código. Pide otro código.",
    "not_found": "No enviamos un código a este correo todavía. Pide uno.",
    "cooldown": "Acabamos de enviarte un código. Espera un momento antes de pedir otro.",
    "too_many_sends": "Ya enviamos varios códigos en esta matrícula. Revisa que el correo esté bien escrito o escríbenos por WhatsApp.",
    "captcha_failed": "La verificación de seguridad venció o no fue aceptada. Complétala de nuevo.",
    "captcha_unavailable": "No pudimos cargar la verificación de seguridad. Recarga la página; si sigue igual, desactiva el bloqueador de anuncios.",
    "rate_limited": "Recibimos demasiados intentos desde tu conexión. Espera unos minutos.",
    "invalid_email": "Revisa el correo: debe ser una cuenta de Gmail válida.",
    "failed": "No pudimos completar la operación. Inténtalo de nuevo."
  }
},
"email_suggestion": "¿Quisiste decir {email}?",
"email_suggestion_apply": "Usar este",
"guardian_email_confirm": "Confirma el correo del apoderado"
```

pt-BR:
```json
"verify": {
  "title": "Verifique seu e-mail",
  "intro": "Vamos enviar um código de 6 dígitos para {email}. Assim confirmamos que o e-mail existe e é seu: é nele que chegam o acesso à aula e os avisos da sua matrícula.",
  "send": "Enviar código",
  "sending": "Enviando…",
  "sent": "Enviamos um código para {email}. Pode levar até um minuto; confira também a pasta de spam.",
  "code_label": "Código de 6 dígitos",
  "confirm": "Verificar",
  "confirming": "Verificando…",
  "resend": "Reenviar código",
  "resend_in": "Você pode pedir outro código em {seconds} s",
  "change_email": "Trocar e-mail",
  "verified": "E-mail verificado",
  "required": "Verifique seu e-mail com o código para continuar.",
  "fill_email_first": "Digite um e-mail do Gmail válido para receber o código.",
  "captcha_hint": "Conclua a verificação de segurança para enviar o código.",
  "error": {
    "code_invalid": "O código não está correto. Confira e tente de novo.",
    "code_expired": "Esse código venceu ou foi substituído por um novo. Peça outro código.",
    "attempts_exhausted": "Tentativas demais com este código. Peça outro código.",
    "not_found": "Ainda não enviamos um código para este e-mail. Peça um.",
    "cooldown": "Acabamos de enviar um código. Espere um momento antes de pedir outro.",
    "too_many_sends": "Já enviamos vários códigos nesta matrícula. Confira se o e-mail está certo ou fale conosco pelo WhatsApp.",
    "captcha_failed": "A verificação de segurança venceu ou não foi aceita. Conclua de novo.",
    "captcha_unavailable": "Não conseguimos carregar a verificação de segurança. Recarregue a página; se continuar, desative o bloqueador de anúncios.",
    "rate_limited": "Recebemos tentativas demais da sua conexão. Espere alguns minutos.",
    "invalid_email": "Confira o e-mail: precisa ser uma conta do Gmail válida.",
    "failed": "Não conseguimos concluir a operação. Tente de novo."
  }
},
"email_suggestion": "Você quis dizer {email}?",
"email_suggestion_apply": "Usar este",
"guardian_email_confirm": "Confirme o e-mail do responsável"
```

en:
```json
"verify": {
  "title": "Verify your e-mail",
  "intro": "We will send a 6-digit code to {email}. That is how we confirm the address exists and is yours: class access and your enrollment notices arrive there.",
  "send": "Send code",
  "sending": "Sending…",
  "sent": "We sent a code to {email}. It can take up to a minute; check your spam folder too.",
  "code_label": "6-digit code",
  "confirm": "Verify",
  "confirming": "Verifying…",
  "resend": "Resend code",
  "resend_in": "You can ask for another code in {seconds} s",
  "change_email": "Change e-mail",
  "verified": "E-mail verified",
  "required": "Verify your e-mail with the code to continue.",
  "fill_email_first": "Type a valid Gmail address to receive the code.",
  "captcha_hint": "Complete the security check to send the code.",
  "error": {
    "code_invalid": "That code is not right. Check it and try again.",
    "code_expired": "That code expired or was replaced by a newer one. Ask for another code.",
    "attempts_exhausted": "Too many tries with this code. Ask for another code.",
    "not_found": "We have not sent a code to this address yet. Ask for one.",
    "cooldown": "We just sent you a code. Wait a moment before asking for another.",
    "too_many_sends": "We already sent several codes for this enrollment. Check the address is right, or message us on WhatsApp.",
    "captcha_failed": "The security check expired or was not accepted. Complete it again.",
    "captcha_unavailable": "We could not load the security check. Reload the page; if it persists, turn off your ad blocker.",
    "rate_limited": "We received too many attempts from your connection. Wait a few minutes.",
    "invalid_email": "Check the address: it must be a valid Gmail account.",
    "failed": "We could not complete that. Try again."
  }
},
"email_suggestion": "Did you mean {email}?",
"email_suggestion_apply": "Use this",
"guardian_email_confirm": "Confirm the guardian's e-mail"
```

Under `enrollment.step.review`, add `email_unverified`:
- es-PE: `"Necesitamos verificar el correo del alumno antes de enviar. Vuelve al paso de datos del alumno y escribe el código."`
- pt-BR: `"Precisamos verificar o e-mail do aluno antes de enviar. Volte ao passo de dados do aluno e digite o código."`
- en: `"We need to verify the student's e-mail before sending. Go back to the student step and type the code."`

- [ ] **Step 2: Create `email-suggestion.tsx`**

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { suggestEmailDomain } from '@ooc/domain/fields'

/** "Did you mean …@gmail.com?" — one click fixes the domain typo. Never a
 * refusal: the list is short on purpose (fields.ts, suggestEmailDomain). */
export function EmailSuggestion({ email, onApply }: { email: string; onApply: (email: string) => void }) {
  const t = useTranslations('enrollment')
  const suggestion = suggestEmailDomain(email)
  if (!suggestion) return null
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-ink">
      <span>{t('step.student.email_suggestion', { email: suggestion })}</span>
      <button
        type="button"
        onClick={() => onApply(suggestion)}
        className="font-semibold text-brand-blue underline underline-offset-2"
      >
        {t('step.student.email_suggestion_apply')}
      </button>
    </p>
  )
}
```

- [ ] **Step 3: Create `email-verification.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { normalizeEmail } from '@ooc/domain/fields'
import { env } from '@/env'
import type { Locale } from '@/lib/format'
import { confirmVerificationCode, sendVerificationCode } from '@/lib/enrollment/email-verification'
import { Turnstile } from '@/components/enrollment/turnstile'
import { GhostButton, Note, PrimaryButton, TextInput } from '@/components/enrollment/ui'
import { CheckoutIcon } from '@/components/enrollment/icons'

const apiLocale: Record<Locale, 'es-PE' | 'en' | 'pt-BR'> = { es: 'es-PE', en: 'en', pt: 'pt-BR' }

type VerifyError =
  | 'code_invalid'
  | 'code_expired'
  | 'attempts_exhausted'
  | 'not_found'
  | 'cooldown'
  | 'too_many_sends'
  | 'captcha_failed'
  | 'captcha_unavailable'
  | 'rate_limited'
  | 'invalid_email'
  | 'failed'

/**
 * The student's Gmail, proven with a 6-digit code (spec 2026-10-07). The
 * server decides — this block only asks it and keeps the screen honest about
 * what it said. A code sent to one address does not prove another: editing
 * the e-mail after sending puts the block back at the start.
 */
export function EmailVerification({
  holdId,
  email,
  recipientName,
  ready,
  verified,
  onVerified,
  onHoldExpired,
}: {
  holdId: string | null
  email: string
  recipientName: string
  /** The address passes the student rules — only then can a code go out. */
  ready: boolean
  verified: boolean
  onVerified: (email: string) => void
  onHoldExpired: () => void
}) {
  const t = useTranslations('enrollment')
  const locale = useLocale() as Locale
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<VerifyError | null>(null)
  const [resendAt, setResendAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false)

  const normalized = normalizeEmail(email)

  // The address changed after the code went out: that code proves nothing here.
  useEffect(() => {
    if (sentTo !== null && sentTo !== normalized) {
      setSentTo(null)
      setCode('')
      setError(null)
    }
  }, [normalized, sentTo])

  useEffect(() => {
    if (resendAt <= now) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [resendAt, now])

  if (verified) {
    return (
      <Note tone="success">{t('step.student.verify.verified')}</Note>
    )
  }

  const secondsToResend = Math.max(0, Math.ceil((resendAt - now) / 1000))

  async function send() {
    if (!holdId || !captchaToken || busy) return
    setBusy(true)
    setError(null)
    const outcome = await sendVerificationCode({
      holdId,
      email: normalized,
      recipientName,
      locale: apiLocale[locale],
      captchaToken,
    })
    setBusy(false)
    setCaptchaResetKey((key) => key + 1)
    if (outcome.kind === 'sent') {
      setSentTo(normalized)
      setCode('')
      setResendAt(Date.now() + outcome.resendAfterSeconds * 1000)
      setNow(Date.now())
      return
    }
    if (outcome.kind === 'hold_expired') {
      onHoldExpired()
      return
    }
    setError(outcome.kind)
  }

  async function confirm() {
    if (!holdId || busy || !/^\d{6}$/.test(code)) return
    setBusy(true)
    setError(null)
    const outcome = await confirmVerificationCode({ holdId, email: normalized, code })
    setBusy(false)
    if (outcome === 'verified') {
      onVerified(normalized)
      return
    }
    setError(outcome)
  }

  function changeEmail() {
    setSentTo(null)
    setCode('')
    setError(null)
    document.getElementById('email')?.focus()
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-sky-soft p-4">
      <p className="text-sm font-bold text-ink">{t('step.student.verify.title')}</p>

      {!ready ? (
        <p className="text-sm text-muted-foreground">{t('step.student.verify.fill_email_first')}</p>
      ) : sentTo === null ? (
        <p className="text-sm text-ink">{t('step.student.verify.intro', { email: normalized })}</p>
      ) : (
        <>
          <p className="text-sm text-ink">{t('step.student.verify.sent', { email: sentTo })}</p>
          <label htmlFor="verification-code" className="text-sm font-medium text-ink">
            {t('step.student.verify.code_label')}
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <TextInput
              id="verification-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="max-w-[10rem] tracking-[0.3em]"
              value={code}
              invalid={error === 'code_invalid'}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <PrimaryButton onClick={() => void confirm()} disabled={busy || code.length !== 6}>
              {busy ? t('step.student.verify.confirming') : t('step.student.verify.confirm')}
            </PrimaryButton>
          </div>
        </>
      )}

      {ready && (
        <div className="flex flex-col gap-2">
          <Turnstile
            siteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            locale={locale}
            resetKey={captchaResetKey}
            onToken={setCaptchaToken}
            onUnavailable={() => setCaptchaUnavailable(true)}
          />
          {captchaUnavailable ? (
            <Note tone="danger">{t('step.student.verify.error.captcha_unavailable')}</Note>
          ) : (
            !captchaToken && <p className="text-xs text-muted-foreground">{t('step.student.verify.captcha_hint')}</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {sentTo === null ? (
              <PrimaryButton onClick={() => void send()} disabled={busy || !captchaToken || !holdId}>
                {busy ? t('step.student.verify.sending') : t('step.student.verify.send')}
              </PrimaryButton>
            ) : (
              <>
                <GhostButton onClick={() => void send()}>
                  <CheckoutIcon name="arrow-right" size={16} />
                  {secondsToResend > 0
                    ? t('step.student.verify.resend_in', { seconds: secondsToResend })
                    : t('step.student.verify.resend')}
                </GhostButton>
                <GhostButton onClick={changeEmail}>{t('step.student.verify.change_email')}</GhostButton>
              </>
            )}
          </div>
        </div>
      )}

      {error && <Note tone="danger">{t(`step.student.verify.error.${error}`)}</Note>}
    </div>
  )
}
```

Note: `GhostButton` has no `disabled` prop; the resend click while `secondsToResend > 0` reaches the server and is answered `cooldown`, which the block shows. If you prefer a disabled button, add an optional `disabled` prop to `GhostButton` in `components/enrollment/ui.tsx` mirroring `PrimaryButton`'s, and pass `disabled={busy || secondsToResend > 0 || !captchaToken}`.

- [ ] **Step 4: Wire into `step-student.tsx`**
  - New props: `holdId: string | null`, `onHoldExpired: () => void`.
  - Imports: `EmailVerification` from `./email-verification`, `EmailSuggestion` from `./email-suggestion`, `isEmailVerified` from `@/lib/enrollment/email-verification`.
  - After the `studentErrors` memo:

```tsx
  const emailVerified = isEmailVerified(draft, holdId)
  const ready = !hasErrors(studentErrors) && !hasErrors(guardianErrors) && emailVerified
```

  (replace the existing `ready` line).
  - Inside the student e-mail `FieldGroup`, after the `TextInput`:

```tsx
            <EmailSuggestion email={draft.student.email} onApply={(email) => patchStudent({ email })} />
```

  - Right after that `FieldGroup`, a full-row block:

```tsx
          <div className={fullRowClass}>
            <EmailVerification
              holdId={holdId}
              email={draft.student.email}
              recipientName={draft.student.firstName.trim() || draft.student.email}
              ready={!studentErrors.email}
              verified={emailVerified}
              onVerified={(email) => setDraft((prev) => ({ ...prev, emailVerification: holdId ? { holdId, email } : null }))}
              onHoldExpired={onHoldExpired}
            />
          </div>
```

  - Guardian e-mail: add `<EmailSuggestion email={draft.guardian.email} onApply={(email) => patchGuardian({ email })} />` inside its `FieldGroup`, then a new `FieldGroup` right after it:

```tsx
            <FieldGroup
              label={t('step.student.guardian_email_confirm')}
              htmlFor="guardian-email-confirm"
              onLeave={leave('guardian.emailConfirmation')}
              error={gErr('emailConfirmation', guardianErrors.emailConfirmation)}
            >
              <TextInput
                id="guardian-email-confirm"
                type="email"
                autoComplete="off"
                onPaste={(e) => e.preventDefault()}
                value={draft.guardian.emailConfirmation}
                invalid={Boolean(gErr('emailConfirmation', guardianErrors.emailConfirmation))}
                onChange={(e) => patchGuardian({ emailConfirmation: e.target.value })}
              />
            </FieldGroup>
```

  - Before `{show && !ready && …}` add: `{show && !emailVerified && <Note tone="danger">{t('step.student.verify.required')}</Note>}` and change the existing line to `{show && !ready && emailVerified && <Note tone="danger">{t('error.fix_fields')}</Note>}` so only one note shows.

- [ ] **Step 5: `checkout.tsx`**
  - Pass `holdId={holdId}` and `onHoldExpired={expireHold}` to `<StepStudent>`.
  - In `submit`, inside the `response.status === 422` branch, before the `captcha.failed` check:

```tsx
        // The submit found no proof of the student's e-mail for this hold —
        // the address was edited after verifying, or a stale draft. Nothing
        // was written; the proof is dropped so the student step asks again.
        if (body?.reason === 'email_verification.required') {
          setDraft((prev) => ({ ...prev, emailVerification: null }))
          return 'email_unverified'
        }
```

  (`setDraft` is already returned by `useCheckout`; confirm the destructuring includes it.)

- [ ] **Step 6: `step-review.tsx`** — add `| 'email_unverified'` to `SubmitOutcome`, and next to the other notes:

```tsx
      {submitError === 'email_unverified' && (
        <Note tone="danger">{t('step.review.email_unverified')}</Note>
      )}
```

- [ ] **Step 7: Verify** — `pnpm typecheck:app` and `pnpm --filter @ooc/app lint` (the `no-literal-string` rule must stay green). Expected: clean.

- [ ] **Step 8: Run it** — use the `run` skill (or `pnpm db:up`, `pnpm db:migrate`, then `pnpm dev:stack`) and walk `/enrollment` at phone width (375 px):
  1. Type `rosa@gmial.com` → the suggestion appears; "Usar este" fixes it.
  2. Type `rosa+x@gmail.com` → the username error shows and no verify block can send.
  3. A valid Gmail → Turnstile → "Enviar código" → in local dev with no `BREVO_API_KEY` the `LogNotificationProvider` logs the message; take the code from the API log and type it → "Correo verificado"; Continue works.
  4. Edit the e-mail after verifying → the proof no longer counts and Continue shows "Verifica tu correo…".
  5. A minor: the guardian confirmation field refuses a mismatch and a paste.
  6. Reload on the student step after verifying → still verified.
  Record what you saw; fix anything that does not match before committing.

- [ ] **Step 9: Commit**

```bash
git add "apps/app/src/app/[locale]/enrollment" apps/app/src/messages/enrollment apps/app/src/components/enrollment
git commit -m "feat(app): verify the student's Gmail with a code in the checkout"
```

---

### Task 9: Documentation

**Files:**
- Modify: `apps/api/CLAUDE.md` (Notificações + new section), `CLAUDE.md` (§1), `docs/MATRICULA-CHECKOUT.md` (Passo 2), `README.md` (Estado atual)

- [ ] **Step 1: `apps/api/CLAUDE.md`, "Notificações"** — replace the bullet that starts `**Link de uso único não fica no outbox:**` with:

```markdown
- **Segredo de uso único não fica no outbox:** toda transição final (`markSent`, `markBlocked`, `recordFailedAttempt` com `final`) faz `vars - 'accessUrl' - 'resetUrl' - 'code'` no mesmo UPDATE — o token cru do link e o código de verificação do checkout não sobrevivem à entrega; tentativa que ainda vai ser repetida mantém o segredo.
```

- [ ] **Step 2: `apps/api/CLAUDE.md`** — new section after "Proteção da rota pública (OOC-24, 03/10/2026)":

```markdown
## Verificação do e-mail do aluno no checkout (07/10/2026)

O checkout só passa do passo do aluno com o Gmail provado por um código de 6 dígitos (spec `docs/superpowers/specs/2026-10-07-checkout-email-verification-design.md`).

- **Estado no Postgres, preso à reserva de vaga** (`email_verifications`, migration `0023`): hash `sha256(id:código)`, 10 min no relógio do banco, 5 tentativas, 60 s entre envios e 5 envios por reserva. Código novo expira os pendentes da mesma reserva.
- **`POST /enrollments/email-verifications`** (Turnstile no corpo, fecha em 503) grava a linha e o e-mail `email_verification_code` no outbox na mesma transação e responde `{resendAfterSeconds}`. **`…/confirm`** marca `verified_at`. As duas são `.public()` com limite por IP e por reserva.
- **A matrícula consome a prova** (`consumeVerifiedEmail`) dentro da transação do submit — mesma reserva, mesmo e-mail do aluno normalizado — ou responde 422 `email_verification.required` sem escrever nada.
- **Staging:** a `AllowlistGuard` bloqueia o código para endereço fora da `EMAIL_ALLOWLIST`; teste do checkout lá usa um Gmail da allowlist. Não existe código fixo fora de produção.
- Só o e-mail do aluno passa pelo código; o do apoderado tem só sugestão de domínio e "confirmar e-mail". Bounce do Brevo é a Sessão 46.
```

- [ ] **Step 3: Root `CLAUDE.md` §1** — in the bullet "**O e-mail do aluno tem que ser uma conta pessoal do Gmail.**", append:

```markdown
 **Desde 07/10/2026 o checkout prova o Gmail:** o passo do aluno só avança com o código de 6 dígitos enviado ao endereço, e o nome de usuário do Gmail que não pode existir (fora de 6–30 caracteres, com `+`, `_`, ponto na ponta ou dois seguidos) é recusado em todo e-mail novo `@gmail.com`, no checkout e no backoffice. O apoderado não recebe código. Detalhe em `apps/api/CLAUDE.md`, Verificação do e-mail.
```

- [ ] **Step 4: `docs/MATRICULA-CHECKOUT.md`, "Passo 2 — Quem vai estudar"** — add a paragraph:

```markdown
**Verificação do Gmail (07/10/2026).** Com o e-mail do aluno válido, o passo mostra o bloco "Verifica tu correo": Turnstile, "Enviar código", campo de 6 dígitos com `autocomplete="one-time-code"`, reenviar depois de 60 s e "Cambiar correo". Continuar exige o selo de verificado. A prova fica no rascunho (`sessionStorage`) presa à reserva e ao endereço — editar o e-mail tira a prova. Domínio digitado errado (`gmial.com`, `gmail.co`, …) ganha "¿Quisiste decir…?" com correção de um clique, para aluno e apoderado; o apoderado digita o e-mail duas vezes (sem colar). Spec: `docs/superpowers/specs/2026-10-07-checkout-email-verification-design.md`.
```

- [ ] **Step 5: `README.md`, "Estado atual"** — add one bullet in the checkout/enrollment part: `- Checkout prova o Gmail do aluno com código de 6 dígitos (tabela `email_verifications`, rotas `/enrollments/email-verifications`), recusa nome de usuário do Gmail impossível e sugere correção de domínio.` In the "Documentos" section (which already lists the other specs under `docs/superpowers/specs/`), add after the last spec line:
`- [`docs/superpowers/specs/2026-10-07-checkout-email-verification-design.md`](docs/superpowers/specs/2026-10-07-checkout-email-verification-design.md) — verificação do Gmail do aluno no checkout: código de 6 dígitos preso à reserva, regra de nome de usuário do Gmail e sugestão de domínio.`

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md apps/api/CLAUDE.md docs/MATRICULA-CHECKOUT.md README.md
git commit -m "docs: record the checkout email verification"
```

---

### Task 10: Final verification

- [ ] **Step 1:** `pnpm -r --if-present run typecheck` — clean.
- [ ] **Step 2:** `pnpm --filter @ooc/api test` — all pass.
- [ ] **Step 3:** `pnpm db:reset`, then `pnpm test:db` and `pnpm test:api:db` — all pass.
- [ ] **Step 4:** `pnpm lint` — clean.
- [ ] **Step 5:** Use superpowers:verification-before-completion, then superpowers:finishing-a-development-branch to open the PR (title and body in English; body ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`). Mention in the PR body: migration `0023` needs the usual backup → migrate order on deploy; no new env var; staging testers need an allowlisted Gmail.
