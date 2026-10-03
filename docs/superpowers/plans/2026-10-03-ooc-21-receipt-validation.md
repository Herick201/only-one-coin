# OOC-21 — Semáforo de validação do comprovante — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Depois da leitura OCR nível 1, comparar o valor lido com o valor esperado do pagamento usando tolerância configurável no backoffice, e sair em três estados: aprovado automaticamente, revisão humana, rejeição sugerida.

**Architecture:** Regra pura no domínio (`ReceiptValidation.ts`), duas configurações novas em `platform_settings` (com usecase + `audit_log` + rota cada), e um worker novo `receipt-validate` oferecido pelo `receipt-upload-relay` só quando o comprovante já passou pela triagem **e** já tem leitura nível 1. O repositório grava o veredito em `receipt_uploads` e, numa transação só, aprova (verde em `pending`) ou roteia pra revisão (`pending → under_review`). A fila de Pagos passa a trazer o veredito.

**Tech Stack:** TypeScript, Fastify (`apps/api`), Drizzle + Postgres (`packages/db`), BullMQ (`packages/queue`), Next.js + next-intl (`apps/app`), vitest.

**Spec:** `docs/superpowers/specs/2026-10-03-ooc-21-receipt-validation-design.md`

## Global Constraints

- Código, commits, comentários, nomes de branch: **inglês**. Conversa e docs internas: português.
- Commits convencionais, pequenos, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Dinheiro sempre `amount_cents INTEGER`; nenhuma conta de dinheiro em float — percentual é inteiro, comparação por multiplicação inteira.
- Valor esperado = `payments.amount_cents` (preço congelado da matrícula). Nunca o preço vigente de hoje.
- Tolerância **só pra cima**. Padrões: tolerância `0` centavos (CHECK 0–5000); rejeição sugerida abaixo de `50`% (CHECK 1–99). Comparação do vermelho é estrita (`read*100 < expected*pct`): exatamente 50% é revisão.
- **Vermelho nunca rejeita** — só `pending → under_review` com o veredito gravado. **Verde nunca aprova `under_review`**, só `pending`.
- Só o upload **mais recente** do pagamento (por `created_at desc, id desc`, o mesmo critério de `ListPaymentReviewQueueQuery`) muda o status do pagamento.
- Ator do audit da aprovação automática: `system:receipt-validation`; ação `payment.auto_approved`.
- Zero string de UI em `.ts`/`.tsx`: todo texto novo nos três locales (`es-PE`, `pt-BR`, `en`) com a mesma estrutura de chaves. Nenhum código de domínio (`far_below`, `reject_suggested`) aparece na tela.
- Log: nunca valor lido nem valor esperado (PII, `CLAUDE.md` §6) — só ids, veredito, motivo.
- Migration aditiva, gerada pelo drizzle-kit, nunca SQL à mão em ambiente remoto.
- Testes unitários rodam com `pnpm --filter @ooc/api test`; integração com `DATABASE_URL=<postgres migrado> pnpm --filter @ooc/api test:db` (Postgres local: `docker compose up -d` na raiz + `pnpm --filter @ooc/db db:migrate`).

---

### Task 1: The rule — `ReceiptValidation.ts`

**Files:**
- Create: `packages/domain/src/enrollment/ReceiptValidation.ts`
- Modify: `packages/domain/src/index.ts` (exports, next to the `ReceiptExtraction` block ~line 137)
- Test: `apps/api/src/tests/receipt-validation-rule.test.ts`

**Interfaces:**
- Consumes: `normalizeOperationNumber(raw: string): string` from `./ReceiptScreening.js`
- Produces:
  - `RECEIPT_VERDICTS`, `type ReceiptVerdict = "approve" | "review" | "reject_suggested"`
  - `RECEIPT_VERDICT_REASONS`, `type ReceiptVerdictReason`
  - `isReceiptVerdict(value: unknown): value is ReceiptVerdict`, `isReceiptVerdictReason(value: unknown): value is ReceiptVerdictReason`
  - `interface ReceiptVerdictOutcome { verdict: ReceiptVerdict; reason: ReceiptVerdictReason }`
  - `interface ReceiptValidationSettings { toleranceCents: number; rejectBelowPercent: number }`
  - `classifyReceiptAmount(params: { expectedCents: number; readCents: number } & ReceiptValidationSettings): ReceiptVerdictOutcome`
  - `decideReceiptVerdict(params: { expectedCents: number; declaredOperationNumber: string | null; readAmountCents: number | null; readOperationNumber: string | null; settings: ReceiptValidationSettings }): ReceiptVerdictOutcome`

- [ ] **Step 1: Write the failing test**

`apps/api/src/tests/receipt-validation-rule.test.ts`:

```ts
import { classifyReceiptAmount, decideReceiptVerdict, type ReceiptValidationSettings } from "@ooc/domain";
import { describe, expect, it } from "vitest";

/**
 * The receipt traffic light (OOC-21, ROADMAP Sessão 27), as a pure rule. The
 * expected amount is the payment's frozen price; the tolerance only goes up
 * ("Sem descontos. Nunca.", CLAUDE.md §1); far below the price is a suggested
 * rejection, never a rejection.
 */

const EXPECTED = 15000; // S/150,00
const DEFAULTS: ReceiptValidationSettings = { toleranceCents: 0, rejectBelowPercent: 50 };

function classify(readCents: number, settings: ReceiptValidationSettings = DEFAULTS) {
  return classifyReceiptAmount({ expectedCents: EXPECTED, readCents, ...settings });
}

describe("classifyReceiptAmount — the done criteria", () => {
  it("approves the exact amount", () => {
    expect(classify(15000)).toEqual({ verdict: "approve", reason: "exact" });
  });

  it("sends cents short to review — a shortfall is never approved on its own", () => {
    expect(classify(14990)).toEqual({ verdict: "review", reason: "underpaid" });
  });

  it("sends cents over to review while the tolerance is zero", () => {
    expect(classify(15010)).toEqual({ verdict: "review", reason: "overpaid" });
  });

  it("approves cents over within the tolerance", () => {
    expect(classify(15010, { ...DEFAULTS, toleranceCents: 50 })).toEqual({ verdict: "approve", reason: "within_tolerance" });
  });

  it("suggests rejecting an amount far below the price", () => {
    expect(classify(4000)).toEqual({ verdict: "reject_suggested", reason: "far_below" });
  });
});

describe("classifyReceiptAmount — edges", () => {
  it("approves exactly at the tolerance and reviews one cent past it", () => {
    const settings = { ...DEFAULTS, toleranceCents: 50 };
    expect(classify(15050, settings)).toEqual({ verdict: "approve", reason: "within_tolerance" });
    expect(classify(15051, settings)).toEqual({ verdict: "review", reason: "overpaid" });
  });

  it("never lets the tolerance cover a shortfall", () => {
    expect(classify(14999, { ...DEFAULTS, toleranceCents: 5000 })).toEqual({ verdict: "review", reason: "underpaid" });
  });

  it("reviews exactly the threshold and suggests rejection one cent below it", () => {
    expect(classify(7500)).toEqual({ verdict: "review", reason: "underpaid" });
    expect(classify(7499)).toEqual({ verdict: "reject_suggested", reason: "far_below" });
  });

  it("moves the red line with the setting", () => {
    expect(classify(10000, { ...DEFAULTS, rejectBelowPercent: 80 })).toEqual({ verdict: "reject_suggested", reason: "far_below" });
  });
});

describe("decideReceiptVerdict", () => {
  function decide(params: Partial<Parameters<typeof decideReceiptVerdict>[0]> = {}) {
    return decideReceiptVerdict({
      expectedCents: EXPECTED,
      declaredOperationNumber: "08312457",
      readAmountCents: 15000,
      readOperationNumber: "08312457",
      settings: DEFAULTS,
      ...params,
    });
  }

  it("approves when the amount and the operation number both match", () => {
    expect(decide()).toEqual({ verdict: "approve", reason: "exact" });
  });

  it("reviews a receipt whose amount was not read (failed reading or missing field)", () => {
    expect(decide({ readAmountCents: null })).toEqual({ verdict: "review", reason: "amount_unread" });
  });

  it("reviews a matching amount when the operation number was not read", () => {
    expect(decide({ readOperationNumber: null })).toEqual({ verdict: "review", reason: "operation_number_unread" });
    expect(decide({ readOperationNumber: " - " })).toEqual({ verdict: "review", reason: "operation_number_unread" });
  });

  it("reviews a matching amount when the operation number differs from the declared one", () => {
    expect(decide({ readOperationNumber: "08312458" })).toEqual({ verdict: "review", reason: "operation_number_mismatch" });
    expect(decide({ declaredOperationNumber: null })).toEqual({ verdict: "review", reason: "operation_number_mismatch" });
  });

  it("compares operation numbers normalized", () => {
    expect(decide({ declaredOperationNumber: "00-12 34", readOperationNumber: "001234" })).toEqual({
      verdict: "approve",
      reason: "exact",
    });
  });

  it("lets the amount speak first when it is not green", () => {
    expect(decide({ readAmountCents: 4000, readOperationNumber: null })).toEqual({
      verdict: "reject_suggested",
      reason: "far_below",
    });
    expect(decide({ readAmountCents: 14990, readOperationNumber: "999" })).toEqual({ verdict: "review", reason: "underpaid" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ooc/api test -- receipt-validation-rule`
Expected: FAIL — `classifyReceiptAmount` is not exported from `@ooc/domain`.

- [ ] **Step 3: Write the implementation**

`packages/domain/src/enrollment/ReceiptValidation.ts`:

```ts
import { normalizeOperationNumber } from "./ReceiptScreening.js";

/**
 * The receipt traffic light (OOC-21, ROADMAP Sessão 27): what the OCR level 1
 * reading means for the payment. Pure and integer-only — cents and a whole
 * percentage, never a float near money.
 *
 * - `approve`: the pipeline settles the payment on its own (only out of
 *   `pending` — see `ValidateReceiptUseCase`).
 * - `review`: a person decides, as before the traffic light existed.
 * - `reject_suggested`: far below the price. Still a person who rejects —
 *   an OCR reading 15 where 150 is printed must not hand back the seat of
 *   someone who paid in full (owner's decision, 03/10/2026).
 */
export const RECEIPT_VERDICTS = ["approve", "review", "reject_suggested"] as const;
export type ReceiptVerdict = (typeof RECEIPT_VERDICTS)[number];

export const RECEIPT_VERDICT_REASONS = [
  /** approve — read equals expected. */
  "exact",
  /** approve — above expected, by no more than the tolerance. */
  "within_tolerance",
  /** review — above expected, past the tolerance. There is no refund flow,
   * and whoever paid more must not lose the seat over it. */
  "overpaid",
  /** review — below expected but at or above the red line. The tolerance
   * never covers a shortfall: "Sem descontos. Nunca." (CLAUDE.md §1). */
  "underpaid",
  /** reject_suggested — below `rejectBelowPercent` of expected. */
  "far_below",
  /** review — the reading failed, or found no amount. */
  "amount_unread",
  /** review — amount green, but no operation number was read. */
  "operation_number_unread",
  /** review — amount green, but the operation number read is not the one
   * the person typed. Without this, a screenshot of another payment for the
   * same price would be approved unseen. */
  "operation_number_mismatch",
] as const;
export type ReceiptVerdictReason = (typeof RECEIPT_VERDICT_REASONS)[number];

export function isReceiptVerdict(value: unknown): value is ReceiptVerdict {
  return (RECEIPT_VERDICTS as readonly unknown[]).includes(value);
}

export function isReceiptVerdictReason(value: unknown): value is ReceiptVerdictReason {
  return (RECEIPT_VERDICT_REASONS as readonly unknown[]).includes(value);
}

export interface ReceiptVerdictOutcome {
  verdict: ReceiptVerdict;
  reason: ReceiptVerdictReason;
}

/** Read from `platform_settings` at validation time — changing them never
 * revisits a verdict already recorded. */
export interface ReceiptValidationSettings {
  /** How far ABOVE the expected amount still approves, in cents. */
  toleranceCents: number;
  /** Below this percentage of the expected amount, rejection is suggested. */
  rejectBelowPercent: number;
}

export function classifyReceiptAmount(
  params: { expectedCents: number; readCents: number } & ReceiptValidationSettings,
): ReceiptVerdictOutcome {
  const { expectedCents, readCents, toleranceCents, rejectBelowPercent } = params;

  if (readCents === expectedCents) {
    return { verdict: "approve", reason: "exact" };
  }
  if (readCents > expectedCents) {
    return readCents - expectedCents <= toleranceCents
      ? { verdict: "approve", reason: "within_tolerance" }
      : { verdict: "review", reason: "overpaid" };
  }
  // Strictly below the line: exactly the percentage is still a review.
  return readCents * 100 < expectedCents * rejectBelowPercent
    ? { verdict: "reject_suggested", reason: "far_below" }
    : { verdict: "review", reason: "underpaid" };
}

/**
 * The whole verdict for one receipt. The amount speaks first; only a green
 * amount goes on to the operation-number check, so a reviewer always sees
 * the money problem before anything else.
 */
export function decideReceiptVerdict(params: {
  expectedCents: number;
  declaredOperationNumber: string | null;
  readAmountCents: number | null;
  readOperationNumber: string | null;
  settings: ReceiptValidationSettings;
}): ReceiptVerdictOutcome {
  if (params.readAmountCents === null) {
    return { verdict: "review", reason: "amount_unread" };
  }

  const amount = classifyReceiptAmount({
    expectedCents: params.expectedCents,
    readCents: params.readAmountCents,
    ...params.settings,
  });
  if (amount.verdict !== "approve") {
    return amount;
  }

  const read = params.readOperationNumber === null ? "" : normalizeOperationNumber(params.readOperationNumber);
  if (read === "") {
    return { verdict: "review", reason: "operation_number_unread" };
  }
  const declared = params.declaredOperationNumber === null ? "" : normalizeOperationNumber(params.declaredOperationNumber);
  if (read !== declared) {
    return { verdict: "review", reason: "operation_number_mismatch" };
  }

  return amount;
}
```

In `packages/domain/src/index.ts`, after the `./enrollment/ReceiptExtraction.js` export block, add:

```ts
export {
  RECEIPT_VERDICTS,
  RECEIPT_VERDICT_REASONS,
  classifyReceiptAmount,
  decideReceiptVerdict,
  isReceiptVerdict,
  isReceiptVerdictReason,
  type ReceiptValidationSettings,
  type ReceiptVerdict,
  type ReceiptVerdictOutcome,
  type ReceiptVerdictReason,
} from "./enrollment/ReceiptValidation.js";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ooc/api test -- receipt-validation-rule`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/enrollment/ReceiptValidation.ts packages/domain/src/index.ts apps/api/src/tests/receipt-validation-rule.test.ts
git commit -m "feat(domain): receipt traffic light rule (OOC-21)"
```

---

### Task 2: The two settings — database, domain, routes

**Files:**
- Modify: `packages/db/src/schema.ts` (`platformSettings`, ~line 883)
- Create (generated): `packages/db/migrations/0020_receipt_validation_settings.sql` + `meta/0020_snapshot.json` + `_journal.json` entry
- Modify: `packages/domain/src/platform/PlatformSettings.ts`
- Modify: `packages/domain/src/platform/ports/IPlatformSettingsRepository.ts`
- Create: `packages/domain/src/platform/UpdateReceiptAmountToleranceUseCase.ts`
- Create: `packages/domain/src/platform/UpdateReceiptRejectBelowPercentUseCase.ts`
- Modify: `packages/domain/src/index.ts` (platform block ~line 268–279)
- Modify: `apps/api/src/infra/persistence/platform/DrizzlePlatformSettingsRepository.ts`
- Create: `apps/api/src/http/platform/UpdateReceiptAmountToleranceRoute.ts`
- Create: `apps/api/src/http/platform/UpdateReceiptRejectBelowPercentRoute.ts`
- Modify: `apps/api/src/http/platform/GetPlatformSettingsRoute.ts`
- Modify: `apps/api/src/container.ts` (`AppUseCases.platform`, construction ~line 356, object ~line 471)
- Modify: `apps/api/src/app.ts` (~line 164)
- Modify: `apps/api/src/tests/seat-hold.test.ts` (`FakeSettings`, line 77)
- Test: `apps/api/src/tests/receipt-validation-settings.test.ts`
- Test: `apps/api/src/tests/settings-routes-authorization.test.ts`

**Interfaces:**
- Produces:
  - `PlatformSettings { checkoutHoldMinutes: number; receiptAmountToleranceCents: number; receiptRejectBelowPercent: number }`
  - `ReceiptAmountToleranceCentsSchema`, `ReceiptRejectBelowPercentSchema` (zod), constants `RECEIPT_AMOUNT_TOLERANCE_CENTS_MIN = 0`, `_MAX = 5000`, `RECEIPT_REJECT_BELOW_PERCENT_MIN = 1`, `_MAX = 99`
  - `IPlatformSettingsRepository.setReceiptAmountToleranceCents(cents: number, actorId: string): Promise<void>`
  - `IPlatformSettingsRepository.setReceiptRejectBelowPercent(percent: number, actorId: string): Promise<void>`
  - `UpdateReceiptAmountToleranceUseCase.run({ actorId, cents }) → { receiptAmountToleranceCents }`
  - `UpdateReceiptRejectBelowPercentUseCase.run({ actorId, percent }) → { receiptRejectBelowPercent }`
  - `container.useCases.platform.updateReceiptAmountTolerance`, `.updateReceiptRejectBelowPercent`
  - Routes `PUT /api/v1/settings/receipt-amount-tolerance` (`{cents}`), `PUT /api/v1/settings/receipt-reject-below` (`{percent}`); `GET /api/v1/settings` returns the three fields.

- [ ] **Step 1: Write the failing usecase test**

`apps/api/src/tests/receipt-validation-settings.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ooc/api test -- receipt-validation-settings`
Expected: FAIL — `UpdateReceiptAmountToleranceUseCase` not exported.

- [ ] **Step 3: Domain — settings type, port, usecases**

`packages/domain/src/platform/PlatformSettings.ts` — add after `CheckoutHoldMinutesSchema`, and extend the interface:

```ts
/**
 * How far ABOVE the expected amount a receipt still approves on its own
 * (OOC-21). Never below: "Sem descontos. Nunca." (CLAUDE.md §1). Mirrored by
 * the CHECK on `platform_settings.receipt_amount_tolerance_cents`; S/50 is
 * the ceiling the backoffice input already had.
 */
export const RECEIPT_AMOUNT_TOLERANCE_CENTS_MIN = 0;
export const RECEIPT_AMOUNT_TOLERANCE_CENTS_MAX = 5000;

export const ReceiptAmountToleranceCentsSchema = z
  .number()
  .int()
  .min(RECEIPT_AMOUNT_TOLERANCE_CENTS_MIN)
  .max(RECEIPT_AMOUNT_TOLERANCE_CENTS_MAX);

/**
 * Below this percentage of the expected amount the traffic light suggests
 * rejecting (OOC-21). 50 is provisional (owner, 03/10/2026) — changed here,
 * on the panel, never in code. Mirrored by
 * `platform_settings.receipt_reject_below_percent`'s CHECK.
 */
export const RECEIPT_REJECT_BELOW_PERCENT_MIN = 1;
export const RECEIPT_REJECT_BELOW_PERCENT_MAX = 99;

export const ReceiptRejectBelowPercentSchema = z
  .number()
  .int()
  .min(RECEIPT_REJECT_BELOW_PERCENT_MIN)
  .max(RECEIPT_REJECT_BELOW_PERCENT_MAX);
```

```ts
export interface PlatformSettings {
  checkoutHoldMinutes: number;
  receiptAmountToleranceCents: number;
  receiptRejectBelowPercent: number;
}
```

`packages/domain/src/platform/ports/IPlatformSettingsRepository.ts` — change the comment's first line to "One row, read on every checkout hold and every receipt validation." and add:

```ts
  setReceiptAmountToleranceCents(cents: number, actorId: string): Promise<void>;
  setReceiptRejectBelowPercent(percent: number, actorId: string): Promise<void>;
```

`packages/domain/src/platform/UpdateReceiptAmountToleranceUseCase.ts`:

```ts
import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import type { IAuditLogRepository } from "../identity/ports/IAuditLogRepository.js";
import { ReceiptAmountToleranceCentsSchema } from "./PlatformSettings.js";
import { InvalidPlatformSettingError } from "./errors.js";
import type { IPlatformSettingsRepository } from "./ports/IPlatformSettingsRepository.js";

export interface UpdateReceiptAmountToleranceInput {
  actorId: string;
  cents: number;
}

/**
 * How far above the plan price a receipt still approves on its own (OOC-21,
 * apps/api/CLAUDE.md: "Tolerância de validação configurável no backoffice").
 * Applies to the next validation; a verdict already recorded keeps the
 * tolerance it was decided with (`receipt_uploads.validation_detail`).
 *
 * Audited: this number decides which money enters unseen.
 */
export class UpdateReceiptAmountToleranceUseCase extends BaseUseCase<
  UpdateReceiptAmountToleranceInput,
  { receiptAmountToleranceCents: number }
> {
  constructor(
    private readonly settings: IPlatformSettingsRepository,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: UpdateReceiptAmountToleranceInput): Promise<{ receiptAmountToleranceCents: number }> {
    if (!ReceiptAmountToleranceCentsSchema.safeParse(input.cents).success) {
      throw new InvalidPlatformSettingError({ path: "cents" });
    }

    const before = await this.settings.get();
    if (before.receiptAmountToleranceCents === input.cents) {
      return { receiptAmountToleranceCents: input.cents };
    }

    await this.settings.setReceiptAmountToleranceCents(input.cents, input.actorId);

    await this.auditLog.append({
      actorId: input.actorId,
      action: "platform_settings.receipt_amount_tolerance_cents",
      targetId: "receipt_amount_tolerance_cents",
      metadata: { from: before.receiptAmountToleranceCents, to: input.cents },
      at: new Date(),
    });

    return { receiptAmountToleranceCents: input.cents };
  }
}
```

`packages/domain/src/platform/UpdateReceiptRejectBelowPercentUseCase.ts`:

```ts
import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import type { IAuditLogRepository } from "../identity/ports/IAuditLogRepository.js";
import { ReceiptRejectBelowPercentSchema } from "./PlatformSettings.js";
import { InvalidPlatformSettingError } from "./errors.js";
import type { IPlatformSettingsRepository } from "./ports/IPlatformSettingsRepository.js";

export interface UpdateReceiptRejectBelowPercentInput {
  actorId: string;
  percent: number;
}

/**
 * Where the traffic light turns red (OOC-21): below this percentage of the
 * expected amount, rejection is suggested to the reviewer — never applied.
 * Applies to the next validation. Audited like every setting.
 */
export class UpdateReceiptRejectBelowPercentUseCase extends BaseUseCase<
  UpdateReceiptRejectBelowPercentInput,
  { receiptRejectBelowPercent: number }
> {
  constructor(
    private readonly settings: IPlatformSettingsRepository,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: UpdateReceiptRejectBelowPercentInput): Promise<{ receiptRejectBelowPercent: number }> {
    if (!ReceiptRejectBelowPercentSchema.safeParse(input.percent).success) {
      throw new InvalidPlatformSettingError({ path: "percent" });
    }

    const before = await this.settings.get();
    if (before.receiptRejectBelowPercent === input.percent) {
      return { receiptRejectBelowPercent: input.percent };
    }

    await this.settings.setReceiptRejectBelowPercent(input.percent, input.actorId);

    await this.auditLog.append({
      actorId: input.actorId,
      action: "platform_settings.receipt_reject_below_percent",
      targetId: "receipt_reject_below_percent",
      metadata: { from: before.receiptRejectBelowPercent, to: input.percent },
      at: new Date(),
    });

    return { receiptRejectBelowPercent: input.percent };
  }
}
```

`packages/domain/src/index.ts` — extend the `./platform/PlatformSettings.js` export with `RECEIPT_AMOUNT_TOLERANCE_CENTS_MIN`, `RECEIPT_AMOUNT_TOLERANCE_CENTS_MAX`, `RECEIPT_REJECT_BELOW_PERCENT_MIN`, `RECEIPT_REJECT_BELOW_PERCENT_MAX`, `ReceiptAmountToleranceCentsSchema`, `ReceiptRejectBelowPercentSchema`, and add next to the `UpdateCheckoutHoldMinutesUseCase` export:

```ts
export {
  UpdateReceiptAmountToleranceUseCase,
  type UpdateReceiptAmountToleranceInput,
} from "./platform/UpdateReceiptAmountToleranceUseCase.js";
export {
  UpdateReceiptRejectBelowPercentUseCase,
  type UpdateReceiptRejectBelowPercentInput,
} from "./platform/UpdateReceiptRejectBelowPercentUseCase.js";
```

`apps/api/src/tests/seat-hold.test.ts` — `FakeSettings` must still implement the port:

```ts
class FakeSettings implements IPlatformSettingsRepository {
  writes: { minutes: number; actorId: string }[] = [];

  constructor(public checkoutHoldMinutes = 15) {}

  async get() {
    return { checkoutHoldMinutes: this.checkoutHoldMinutes, receiptAmountToleranceCents: 0, receiptRejectBelowPercent: 50 };
  }

  async setCheckoutHoldMinutes(minutes: number, actorId: string) {
    this.writes.push({ minutes, actorId });
    this.checkoutHoldMinutes = minutes;
  }

  async setReceiptAmountToleranceCents() {}

  async setReceiptRejectBelowPercent() {}
}
```

- [ ] **Step 4: Run the usecase test to verify it passes**

Run: `pnpm --filter @ooc/api test -- receipt-validation-settings seat-hold`
Expected: PASS.

- [ ] **Step 5: Schema + migration**

`packages/db/src/schema.ts`, `platformSettings`: replace the comment paragraph "Only the checkout hold lives here so far. …" with:

```ts
// The checkout hold and the receipt traffic light's two numbers (OOC-21) live
// here. The review window and the OCR confidence floor are still screen-only
// in the backoffice; each lands as its own column when something server-side
// reads it.
```

Add the columns after `checkoutHoldMinutes`:

```ts
    // OOC-21: how far ABOVE the expected amount still approves on its own.
    // Never below — "Sem descontos. Nunca." (CLAUDE.md §1).
    receiptAmountToleranceCents: integer("receipt_amount_tolerance_cents").notNull().default(0),
    // OOC-21: below this percentage of the expected amount, rejection is
    // suggested to the reviewer. 50 is provisional (owner, 03/10/2026).
    receiptRejectBelowPercent: integer("receipt_reject_below_percent").notNull().default(50),
```

and the checks in the table callback:

```ts
    check(
      "platform_settings_receipt_amount_tolerance_cents_check",
      sql`${table.receiptAmountToleranceCents} between 0 and 5000`,
    ),
    check(
      "platform_settings_receipt_reject_below_percent_check",
      sql`${table.receiptRejectBelowPercent} between 1 and 99`,
    ),
```

Generate: `pnpm --filter @ooc/db db:generate --name receipt_validation_settings`
Expected: `packages/db/migrations/0020_receipt_validation_settings.sql` containing two `ALTER TABLE "platform_settings" ADD COLUMN … DEFAULT … NOT NULL` and two `ADD CONSTRAINT … CHECK`. Read the file and confirm it touches nothing else. Apply locally: `pnpm --filter @ooc/db db:migrate`.

- [ ] **Step 6: Repository**

`apps/api/src/infra/persistence/platform/DrizzlePlatformSettingsRepository.ts`:

```ts
const DEFAULTS: PlatformSettings = { checkoutHoldMinutes: 15, receiptAmountToleranceCents: 0, receiptRejectBelowPercent: 50 };
```

(update the comment: "they are the column defaults of migrations 0014 and 0020"), `get()` selects the two new columns:

```ts
      .select({
        checkoutHoldMinutes: platformSettings.checkoutHoldMinutes,
        receiptAmountToleranceCents: platformSettings.receiptAmountToleranceCents,
        receiptRejectBelowPercent: platformSettings.receiptRejectBelowPercent,
      })
```

and two setters, same upsert shape as `setCheckoutHoldMinutes`:

```ts
  async setReceiptAmountToleranceCents(cents: number, actorId: string): Promise<void> {
    await this.db
      .insert(platformSettings)
      .values({ id: true, receiptAmountToleranceCents: cents, updatedBy: actorId })
      .onConflictDoUpdate({
        target: platformSettings.id,
        set: { receiptAmountToleranceCents: cents, updatedBy: actorId, updatedAt: sql`now()` },
      });
  }

  async setReceiptRejectBelowPercent(percent: number, actorId: string): Promise<void> {
    await this.db
      .insert(platformSettings)
      .values({ id: true, receiptRejectBelowPercent: percent, updatedBy: actorId })
      .onConflictDoUpdate({
        target: platformSettings.id,
        set: { receiptRejectBelowPercent: percent, updatedBy: actorId, updatedAt: sql`now()` },
      });
  }
```

- [ ] **Step 7: Routes, container, app**

`apps/api/src/http/platform/UpdateReceiptAmountToleranceRoute.ts`:

```ts
import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const BodySchema = z.object({
  // Bounds are the usecase's (ReceiptAmountToleranceCentsSchema) and the
  // database's; here only the shape.
  cents: z.number().int(),
});

const ResponseSchema = z.object({
  receiptAmountToleranceCents: z.number().int(),
});

/**
 * How far above the plan price a receipt still approves on its own (OOC-21).
 * Management only, like the rest of the settings screen. Applies to the next
 * validation; writes audit_log.
 */
export const updateReceiptAmountToleranceRoute = RouteBuilder.put("/settings/receipt-amount-tolerance")
  .docs({
    tags: ["Platform"],
    summary: "Change the receipt amount tolerance, in cents",
    description: "Above the expected amount only. Applies to the next validation. Writes audit_log.",
  })
  .roles("master", "admin")
  .body(BodySchema)
  .response(200, ResponseSchema)
  .response(401, ErrorResponseSchema)
  .response(403, ErrorResponseSchema)
  .response(422, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const result = await container.useCases.platform.updateReceiptAmountTolerance.run({
      actorId: request.currentUser!.id,
      cents: request.body.cents,
    });

    reply.status(200).send(result);
  });
```

`apps/api/src/http/platform/UpdateReceiptRejectBelowPercentRoute.ts`:

```ts
import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const BodySchema = z.object({
  // Bounds are the usecase's (ReceiptRejectBelowPercentSchema) and the
  // database's; here only the shape.
  percent: z.number().int(),
});

const ResponseSchema = z.object({
  receiptRejectBelowPercent: z.number().int(),
});

/**
 * Below which percentage of the expected amount the traffic light suggests
 * rejecting (OOC-21). Management only. Applies to the next validation;
 * writes audit_log.
 */
export const updateReceiptRejectBelowPercentRoute = RouteBuilder.put("/settings/receipt-reject-below")
  .docs({
    tags: ["Platform"],
    summary: "Change the percentage below which rejection is suggested",
    description: "Suggested only — a person still rejects. Applies to the next validation. Writes audit_log.",
  })
  .roles("master", "admin")
  .body(BodySchema)
  .response(200, ResponseSchema)
  .response(401, ErrorResponseSchema)
  .response(403, ErrorResponseSchema)
  .response(422, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const result = await container.useCases.platform.updateReceiptRejectBelowPercent.run({
      actorId: request.currentUser!.id,
      percent: request.body.percent,
    });

    reply.status(200).send(result);
  });
```

`GetPlatformSettingsRoute.ts` — response schema:

```ts
const GetPlatformSettingsResponseSchema = z.object({
  checkoutHoldMinutes: z.number().int(),
  receiptAmountToleranceCents: z.number().int(),
  receiptRejectBelowPercent: z.number().int(),
});
```

`apps/api/src/container.ts`: import the two usecases from `@ooc/domain`; in `AppUseCases.platform` add `updateReceiptAmountTolerance: UpdateReceiptAmountToleranceUseCase;` and `updateReceiptRejectBelowPercent: UpdateReceiptRejectBelowPercentUseCase;`; next to `updateCheckoutHoldMinutes` construct:

```ts
  const updateReceiptAmountTolerance = new UpdateReceiptAmountToleranceUseCase(platformSettingsRepository, auditLogRepository);
  const updateReceiptRejectBelowPercent = new UpdateReceiptRejectBelowPercentUseCase(platformSettingsRepository, auditLogRepository);
```

and add both to `useCases.platform`.

`apps/api/src/app.ts`: import both routes next to `updateCheckoutHoldMinutesRoute` and register them right after it, the same way:

```ts
        instance.withTypeProvider<ZodTypeProvider>().route(updateReceiptAmountToleranceRoute);
        instance.withTypeProvider<ZodTypeProvider>().route(updateReceiptRejectBelowPercentRoute);
```

- [ ] **Step 8: Route authorization test (CI gate §6.5)**

`apps/api/src/tests/settings-routes-authorization.test.ts`:

```ts
import type { AuthenticatedUser, Role } from "@ooc/domain";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app.js";
import { container } from "@/container.js";
import { SESSION_COOKIE_NAME } from "@/infra/auth/betterAuth.js";

/**
 * CI gate §6.5 for the settings screen: management only. Billing settles
 * money but does not decide which money enters unseen. No database — the
 * authorization hook answers before the handler runs.
 */

const CASES: [string, string, Role][] = [
  ["GET", "/api/v1/settings", "billing"],
  ["PUT", "/api/v1/settings/checkout-hold", "enrollment_supervisor"],
  ["PUT", "/api/v1/settings/receipt-amount-tolerance", "billing"],
  ["PUT", "/api/v1/settings/receipt-amount-tolerance", "analyst"],
  ["PUT", "/api/v1/settings/receipt-reject-below", "billing"],
  ["PUT", "/api/v1/settings/receipt-reject-below", "support"],
];

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
});

describe("settings routes refuse undeclared roles", () => {
  it.each(CASES)("%s %s refuses %s", async (method, url, role) => {
    const user: AuthenticatedUser = { id: "u1", email: "x@example.com", name: "X", role };
    vi.spyOn(container.identity.currentSession, "resolve").mockResolvedValue(user);

    const response = await app.inject({
      method: method as "GET",
      url,
      cookies: { [SESSION_COOKIE_NAME]: "token" },
      payload: method === "GET" ? undefined : {},
    });

    expect(response.statusCode).toBe(403);
  });
});
```

- [ ] **Step 9: Run tests and typecheck**

Run: `pnpm --filter @ooc/api test -- receipt-validation-settings settings-routes-authorization seat-hold && pnpm --filter @ooc/domain typecheck && pnpm --filter @ooc/api typecheck && pnpm --filter @ooc/db typecheck`
Expected: all PASS, no type errors.

- [ ] **Step 10: Commit**

```bash
git add packages/db packages/domain apps/api/src
git commit -m "feat: receipt tolerance and red-line settings, audited (OOC-21)"
```

---

### Task 3: `ValidateReceiptUseCase` and its port

**Files:**
- Create: `packages/domain/src/enrollment/ReceiptValidationRepository.ts`
- Create: `packages/domain/src/enrollment/ValidateReceiptUseCase.ts`
- Modify: `packages/domain/src/index.ts`
- Test: `apps/api/src/tests/receipt-validation.test.ts`

**Interfaces:**
- Consumes: `decideReceiptVerdict`, `ReceiptVerdictOutcome`, `ReceiptVerdictReason`, `ReceiptValidationSettings` (Task 1); `IPlatformSettingsRepository.get()` (Task 2); `IEnrollmentEmailContextLookup.find({ studentId, classGroupId })`, `paymentApprovedEmails(facts, DEFAULT_LOCALE)`, `AuditLogEntry`, `EmailNotification`, `PaymentStatus` (existing).
- Produces:
  - `interface ReceiptValidationSubject { receiptUploadId; paymentId; enrollmentId; studentId; classGroupId: string; paymentStatus: PaymentStatus; expectedCents: number; declaredOperationNumber: string | null; readAmountCents: number | null; readOperationNumber: string | null }`
  - `interface ReceiptValidationDetail extends ReceiptValidationSettings { reason: ReceiptVerdictReason; expectedCents: number; readCents: number | null }`
  - `type ReceiptValidationEffect = "approved" | "routed_to_review" | "none" | "already_validated"`
  - `interface ReceiptAutoApproval { notifications: EmailNotification[]; audit: AuditLogEntry }`
  - `interface IReceiptValidationRepository { findSubject(receiptUploadId: string): Promise<ReceiptValidationSubject | null>; record(params: { subject; outcome: ReceiptVerdictOutcome; detail: ReceiptValidationDetail; approval: ReceiptAutoApproval | null }): Promise<ReceiptValidationEffect> }`
  - `RECEIPT_VALIDATION_ACTOR = "system:receipt-validation"`
  - `ValidateReceiptUseCase(repository, settings, emailContextLookup).run({ receiptUploadId }) → { outcome: ReceiptVerdictOutcome | null; effect: ReceiptValidationEffect | null }`

- [ ] **Step 1: Write the failing test**

`apps/api/src/tests/receipt-validation.test.ts`:

```ts
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

  it("does nothing when there is nothing to validate", async () => {
    const repository = new FakeValidationRepository(null);

    const result = await useCase(repository).run({ receiptUploadId: UPLOAD });

    expect(result).toEqual({ outcome: null, effect: null });
    expect(repository.recorded).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ooc/api test -- receipt-validation.test`
Expected: FAIL — `ValidateReceiptUseCase` not exported.

- [ ] **Step 3: Write the port**

`packages/domain/src/enrollment/ReceiptValidationRepository.ts`:

```ts
import type { AuditLogEntry } from "../identity/ports/IAuditLogRepository.js";
import type { EmailNotification } from "../notification/EmailNotification.js";
import type { PaymentStatus } from "./Payment.js";
import type { ReceiptValidationSettings, ReceiptVerdictOutcome, ReceiptVerdictReason } from "./ReceiptValidation.js";

/** A receipt ready for the traffic light: screened (level 0) and read at
 * level 1 — the reading may be a failure — and not validated yet. */
export interface ReceiptValidationSubject {
  receiptUploadId: string;
  paymentId: string;
  enrollmentId: string;
  studentId: string;
  classGroupId: string;
  paymentStatus: PaymentStatus;
  /** `payments.amount_cents` — the price frozen at enrollment, never today's. */
  expectedCents: number;
  /** What the person typed at checkout. */
  declaredOperationNumber: string | null;
  /** `null` when the reading failed or found no amount. */
  readAmountCents: number | null;
  readOperationNumber: string | null;
}

/** Stored with the verdict (`receipt_uploads.validation_detail`): what it was
 * decided with, so a later settings change never makes it unexplainable. */
export interface ReceiptValidationDetail extends ReceiptValidationSettings {
  reason: ReceiptVerdictReason;
  expectedCents: number;
  readCents: number | null;
}

/** What recording the verdict did to the payment. */
export type ReceiptValidationEffect =
  /** Green, latest upload, payment was `pending`: approved, seat confirmed. */
  | "approved"
  /** Not green (or green that could not approve), latest upload, payment
   * was `pending`: moved to `under_review`. */
  | "routed_to_review"
  /** Verdict recorded; the payment was not `pending` or this is not its
   * latest upload, so it was left alone. */
  | "none"
  /** Another delivery already recorded a verdict — nothing written. */
  | "already_validated";

export interface ReceiptAutoApproval {
  notifications: EmailNotification[];
  audit: AuditLogEntry;
}

export interface IReceiptValidationRepository {
  /** `null` when the upload is unknown, not attached to a payment, not
   * screened, has no level-1 row, or is already validated. */
  findSubject(receiptUploadId: string): Promise<ReceiptValidationSubject | null>;

  /**
   * One transaction: stamps the verdict once (`validated_at is null`), then
   * — only for the payment's latest upload and only while the payment is
   * still `pending` — approves (when `approval` is given and the seat was
   * not released: payment `approved`, seat `reserved → confirmed`, outbox,
   * audit) or moves the payment to `under_review`.
   */
  record(params: {
    subject: ReceiptValidationSubject;
    outcome: ReceiptVerdictOutcome;
    detail: ReceiptValidationDetail;
    approval: ReceiptAutoApproval | null;
  }): Promise<ReceiptValidationEffect>;
}
```

- [ ] **Step 4: Write the usecase**

`packages/domain/src/enrollment/ValidateReceiptUseCase.ts`:

```ts
import type { IPlatformSettingsRepository } from "../platform/ports/IPlatformSettingsRepository.js";
import { DEFAULT_LOCALE } from "../notification/EmailNotification.js";
import { paymentApprovedEmails } from "../notification/enrollmentEmails.js";
import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import type { IEnrollmentEmailContextLookup } from "./EnrollmentEmailContextLookup.js";
import { decideReceiptVerdict, type ReceiptVerdictOutcome } from "./ReceiptValidation.js";
import type {
  IReceiptValidationRepository,
  ReceiptAutoApproval,
  ReceiptValidationEffect,
  ReceiptValidationSubject,
} from "./ReceiptValidationRepository.js";

/** `audit_log.actor_id` of an approval nobody clicked. Text, no FK — the
 * column already holds Better Auth ids, which are text too. */
export const RECEIPT_VALIDATION_ACTOR = "system:receipt-validation";

export interface ValidateReceiptInput {
  receiptUploadId: string;
}

export interface ValidateReceiptOutput {
  /** `null` when there was nothing to validate. */
  outcome: ReceiptVerdictOutcome | null;
  effect: ReceiptValidationEffect | null;
}

/**
 * The receipt traffic light (OOC-21, ROADMAP Sessão 27), run by the
 * `receipt-validate` worker once a receipt is both screened and read.
 * Compares the amount read with the payment's frozen price under the
 * backoffice's settings, then hands the verdict to the repository.
 *
 * Green settles the payment on its own — the same seat, e-mail and audit
 * trail as `SettlePaymentUseCase`, signed by `RECEIPT_VALIDATION_ACTOR` —
 * but only out of `pending`: a payment the screening already sent to review
 * is a person's to decide. Red only suggests: rejecting hands back a seat,
 * and an OCR misreading must never do that to someone who paid in full.
 */
export class ValidateReceiptUseCase extends BaseUseCase<ValidateReceiptInput, ValidateReceiptOutput> {
  constructor(
    private readonly repository: IReceiptValidationRepository,
    private readonly settings: IPlatformSettingsRepository,
    private readonly emailContextLookup: IEnrollmentEmailContextLookup,
  ) {
    super();
  }

  async run(input: ValidateReceiptInput): Promise<ValidateReceiptOutput> {
    const subject = await this.repository.findSubject(input.receiptUploadId);
    if (!subject) {
      return { outcome: null, effect: null };
    }

    const current = await this.settings.get();
    const settings = {
      toleranceCents: current.receiptAmountToleranceCents,
      rejectBelowPercent: current.receiptRejectBelowPercent,
    };

    const outcome = decideReceiptVerdict({
      expectedCents: subject.expectedCents,
      declaredOperationNumber: subject.declaredOperationNumber,
      readAmountCents: subject.readAmountCents,
      readOperationNumber: subject.readOperationNumber,
      settings,
    });

    const approval =
      outcome.verdict === "approve" && subject.paymentStatus === "pending" ? await this.approval(subject, outcome) : null;

    const effect = await this.repository.record({
      subject,
      outcome,
      detail: { reason: outcome.reason, expectedCents: subject.expectedCents, readCents: subject.readAmountCents, ...settings },
      approval,
    });

    return { outcome, effect };
  }

  /** Built before the transaction, like `SettlePaymentUseCase` does; the
   * repository drops it if the payment moved in the meantime. */
  private async approval(subject: ReceiptValidationSubject, outcome: ReceiptVerdictOutcome): Promise<ReceiptAutoApproval> {
    const context = await this.emailContextLookup.find({
      studentId: subject.studentId,
      classGroupId: subject.classGroupId,
    });

    return {
      notifications: context ? paymentApprovedEmails({ paymentId: subject.paymentId, ...context }, DEFAULT_LOCALE) : [],
      audit: {
        actorId: RECEIPT_VALIDATION_ACTOR,
        action: "payment.auto_approved",
        targetId: subject.paymentId,
        metadata: { enrollmentId: subject.enrollmentId, receiptUploadId: subject.receiptUploadId, reason: outcome.reason },
        at: new Date(),
      },
    };
  }
}
```

`packages/domain/src/index.ts` — after the Task 1 export block:

```ts
export type {
  IReceiptValidationRepository,
  ReceiptAutoApproval,
  ReceiptValidationDetail,
  ReceiptValidationEffect,
  ReceiptValidationSubject,
} from "./enrollment/ReceiptValidationRepository.js";
export {
  RECEIPT_VALIDATION_ACTOR,
  ValidateReceiptUseCase,
  type ValidateReceiptInput,
  type ValidateReceiptOutput,
} from "./enrollment/ValidateReceiptUseCase.js";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @ooc/api test -- receipt-validation && pnpm --filter @ooc/domain typecheck`
Expected: PASS (both receipt-validation files), no type errors.

- [ ] **Step 6: Commit**

```bash
git add packages/domain apps/api/src/tests/receipt-validation.test.ts
git commit -m "feat(domain): ValidateReceiptUseCase settles green, suggests red (OOC-21)"
```

---

### Task 4: The transaction — verdict columns, repository, relay query

**Files:**
- Modify: `packages/db/src/schema.ts` (`receiptUploads`, ~line 625)
- Create (generated): `packages/db/migrations/0021_receipt_validation_verdict.sql` + snapshot + journal
- Create: `apps/api/src/infra/persistence/enrollment/DrizzleReceiptValidationRepository.ts`
- Modify: `apps/api/src/infra/persistence/enrollment/DrizzleReceiptUploadRepository.ts` (`IReceiptNormalizationStore` + `listValidatableIds`)
- Test: `apps/api/src/infra/persistence/enrollment/DrizzleReceiptValidationRepository.integration.test.ts`

**Interfaces:**
- Consumes: `IReceiptValidationRepository`, `ReceiptValidationSubject`, `ReceiptValidationEffect` (Task 3); `RECEIPT_EXTRACTION_TIER_PRIMARY`; `insertOutboxEmails(tx, notifications)` from `@/infra/persistence/notification/DrizzleOutboxRepository.js`.
- Produces:
  - Columns `receipt_uploads.validation_verdict text`, `validation_detail jsonb`, `validated_at timestamptz`; Drizzle fields `validationVerdict`, `validationDetail`, `validatedAt`.
  - `DrizzleReceiptValidationRepository(db)`
  - `IReceiptNormalizationStore.listValidatableIds(limit: number, tier: number): Promise<string[]>`

- [ ] **Step 1: Schema + migration**

In `receiptUploads`, after `screenedAt`:

```ts
    // The receipt traffic light (OOC-21), stamped once after the screening
    // and the level-1 reading: 'approve' | 'review' | 'reject_suggested',
    // and `validation_detail` holds the reason and the numbers it was decided
    // with (ReceiptValidationDetail). Null validated_at = not validated yet.
    validationVerdict: text("validation_verdict"),
    validationDetail: jsonb("validation_detail"),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
```

In the table callback:

```ts
    check(
      "receipt_uploads_validation_verdict_check",
      sql`${table.validationVerdict} is null or ${table.validationVerdict} in ('approve', 'review', 'reject_suggested')`,
    ),
    check(
      "receipt_uploads_validation_stamp_check",
      sql`(${table.validationVerdict} is null) = (${table.validatedAt} is null)`,
    ),
    // The validation relay's query: screened, attached, not validated. The
    // level-1 reading is an anti-join on payment_receipts' unique index.
    index("receipt_uploads_validate_pending_idx")
      .on(table.createdAt)
      .where(sql`${table.paymentId} is not null and ${table.screenedAt} is not null and ${table.validatedAt} is null`),
```

Generate: `pnpm --filter @ooc/db db:generate --name receipt_validation_verdict` → `0021_receipt_validation_verdict.sql` with three `ADD COLUMN`, two `ADD CONSTRAINT … CHECK`, one `CREATE INDEX`. Read it; apply: `pnpm --filter @ooc/db db:migrate`.

- [ ] **Step 2: Write the failing integration test**

`apps/api/src/infra/persistence/enrollment/DrizzleReceiptValidationRepository.integration.test.ts`:

```ts
import * as schema from "@ooc/db";
import {
  academicPeriods,
  auditLog,
  classGroups,
  courses,
  enrollments,
  outbox,
  paymentReceipts,
  payments,
  planPrices,
  plans,
  receiptUploads,
  seatHolds,
  students,
} from "@ooc/db";
import {
  DEFAULT_LOCALE,
  RECEIPT_EXTRACTION_TIER_PRIMARY,
  RECEIPT_VALIDATION_ACTOR,
  paymentApprovedEmails,
  type ReceiptAutoApproval,
  type ReceiptValidationDetail,
  type ReceiptVerdictOutcome,
} from "@ooc/domain";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/infra/db/client.js";
import { DrizzleReceiptUploadRepository } from "./DrizzleReceiptUploadRepository.js";
import { DrizzleReceiptValidationRepository } from "./DrizzleReceiptValidationRepository.js";

/**
 * The traffic light's SQL (OOC-21): which receipts the relay offers, the
 * once-only verdict stamp, and the payment/seat moving with it in one
 * transaction — only for the latest upload, only out of `pending`.
 *
 * Same harness as DrizzleReceiptExtractionRepository.integration.test.ts:
 * every test runs in a transaction that is always rolled back (payments and
 * payment_receipts are under the 0011 delete lock).
 */

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required: this suite exercises the receipt validation SQL against a real, migrated Postgres.");
}

const PERIOD = "018f2b5c-6200-7000-8000-000000000001";
const COURSE = "018f2b5c-6200-7000-8000-000000000002";
const PLAN = "018f2b5c-6200-7000-8000-000000000003";
const PLAN_PRICE = "018f2b5c-6200-7000-8000-000000000004";
const GROUP = "018f2b5c-6200-7000-8000-000000000005";
const TIER = RECEIPT_EXTRACTION_TIER_PRIMARY;

let pool: pg.Pool;
let db: Db;

beforeAll(() => {
  pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
  db = drizzle(pool, { schema, casing: "snake_case" });
});

afterAll(async () => {
  await pool.end();
});

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
class RolledBack extends Error {}

async function rolledBack(fn: (tx: Tx) => Promise<void>): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      await seedCatalog(tx);
      await fn(tx);
      throw new RolledBack();
    });
  } catch (error) {
    if (!(error instanceof RolledBack)) throw error;
  }
}

async function seedCatalog(tx: Tx): Promise<void> {
  await tx.insert(academicPeriods).values({
    id: PERIOD,
    name: "Ciclo de prueba (receipt validation integration)",
    startsOn: new Date("2026-03-01T00:00:00.000Z"),
    endsOn: new Date("2026-07-31T00:00:00.000Z"),
  });
  await tx.insert(courses).values({ id: COURSE, name: "Curso (validation integration)", language: "Prueba", minAge: 12 });
  await tx.insert(plans).values({ id: PLAN, courseId: COURSE, name: "Paquete completo" });
  await tx.insert(planPrices).values({ id: PLAN_PRICE, planId: PLAN, amountCents: 15000 });
  await tx.insert(classGroups).values({
    id: GROUP,
    courseId: COURSE,
    academicPeriodId: PERIOD,
    schedule: "Lun/Mié 19:00",
    startsOn: new Date("2026-03-02T00:00:00.000Z"),
    endsOn: new Date("2026-06-30T00:00:00.000Z"),
    capacity: 50,
    seatsTaken: 10,
  });
}

let sequence = 0;

interface Seeded {
  paymentId: string;
  enrollmentId: string;
}

async function payment(
  tx: Tx,
  params: { status?: string; seatStatus?: "reserved" | "confirmed" | "released" } = {},
): Promise<Seeded> {
  const n = ++sequence;
  const [student] = await tx
    .insert(students)
    .values({
      firstName: `Alumno${n}`,
      lastName: "Validacion",
      nationalIdType: "DNI",
      nationalId: `VALIDATE${n}`,
      email: `validate.${n}@gmail.com`,
      phone: "+51900000000",
      birthDate: new Date("2000-01-01T00:00:00.000Z"),
      country: "PE",
      city: "Lima",
    })
    .returning({ id: students.id });
  const [enrollment] = await tx
    .insert(enrollments)
    .values({
      studentId: student!.id,
      classGroupId: GROUP,
      planPriceId: PLAN_PRICE,
      origin: "web",
      seatStatus: params.seatStatus ?? "reserved",
    })
    .returning({ id: enrollments.id });
  const [row] = await tx
    .insert(payments)
    .values({
      enrollmentId: enrollment!.id,
      idempotencyKey: `validate-integration-${n}`,
      status: params.status ?? "pending",
      method: "yape",
      amountCents: 15000,
      operationNumber: "08312457",
    })
    .returning({ id: payments.id });
  return { paymentId: row!.id, enrollmentId: enrollment!.id };
}

/** A processed upload attached to the payment; screened and read unless told otherwise. */
async function receipt(
  tx: Tx,
  paymentId: string,
  params: { screened?: boolean; read?: "read" | "failed" | "none"; createdAt?: Date } = {},
): Promise<string> {
  const n = ++sequence;
  const [hold] = await tx
    .insert(seatHolds)
    .values({ classGroupId: GROUP, origin: "web", status: "released", expiresAt: new Date(), settledAt: new Date() })
    .returning({ id: seatHolds.id });
  const createdAt = params.createdAt ?? new Date();
  const [row] = await tx
    .insert(receiptUploads)
    .values({
      seatHoldId: hold!.id,
      paymentId,
      objectKey: `receipts/raw/validate-integration/${n}`,
      status: "processed",
      processedObjectKey: `receipts/processed/validate-integration/${n}.jpg`,
      screenedAt: params.screened === false ? null : new Date(),
      fraudSignals: [],
      createdAt,
      updatedAt: createdAt,
    })
    .returning({ id: receiptUploads.id });

  const read = params.read ?? "read";
  if (read === "read") {
    await tx.insert(paymentReceipts).values({
      paymentId,
      receiptUploadId: row!.id,
      tier: TIER,
      modelName: "google/gemini-3.1-flash-lite",
      amountCents: 15000,
      operationNumber: "08312457",
      extractedFields: [],
    });
  } else if (read === "failed") {
    await tx.insert(paymentReceipts).values({
      paymentId,
      receiptUploadId: row!.id,
      tier: TIER,
      modelName: "google/gemini-3.1-flash-lite",
      failureReason: "provider_unavailable",
    });
  }
  return row!.id;
}

const GREEN: ReceiptVerdictOutcome = { verdict: "approve", reason: "exact" };
const RED: ReceiptVerdictOutcome = { verdict: "reject_suggested", reason: "far_below" };

function detail(outcome: ReceiptVerdictOutcome, readCents: number | null = 15000): ReceiptValidationDetail {
  return { reason: outcome.reason, expectedCents: 15000, readCents, toleranceCents: 0, rejectBelowPercent: 50 };
}

/** Built by the domain's own e-mail builder, so the outbox row is exactly
 * what the usecase would hand over. Adult student, no guardian: one e-mail. */
function approval(paymentId: string): ReceiptAutoApproval {
  return {
    notifications: paymentApprovedEmails(
      {
        paymentId,
        student: { firstName: "Alumno", lastName: "Validacion", email: "validate@gmail.com", birthDate: new Date("2000-01-01T00:00:00.000Z") },
        guardian: null,
        courseName: "Curso (validation integration)",
        classGroupStartsOn: new Date("2026-03-02T00:00:00.000Z"),
      },
      DEFAULT_LOCALE,
    ),
    audit: {
      actorId: RECEIPT_VALIDATION_ACTOR,
      action: "payment.auto_approved",
      targetId: paymentId,
      metadata: { reason: "exact" },
      at: new Date(),
    },
  };
}

async function state(tx: Tx, seeded: Seeded) {
  const [row] = await tx
    .select({ status: payments.status, seatStatus: enrollments.seatStatus })
    .from(payments)
    .innerJoin(enrollments, eq(enrollments.id, payments.enrollmentId))
    .where(eq(payments.id, seeded.paymentId));
  return row!;
}

describe("listValidatableIds + findSubject", () => {
  it("offers only screened receipts with a level-1 row (read or failed) and no verdict yet", async () => {
    await rolledBack(async (tx) => {
      const uploads = new DrizzleReceiptUploadRepository(tx as unknown as Db);
      const repository = new DrizzleReceiptValidationRepository(tx as unknown as Db);

      const ready = await receipt(tx, (await payment(tx)).paymentId);
      const failedRead = await receipt(tx, (await payment(tx)).paymentId, { read: "failed" });
      const notScreened = await receipt(tx, (await payment(tx)).paymentId, { screened: false });
      const notRead = await receipt(tx, (await payment(tx)).paymentId, { read: "none" });
      const done = await receipt(tx, (await payment(tx)).paymentId);
      await repository.record({ subject: (await repository.findSubject(done))!, outcome: RED, detail: detail(RED), approval: null });

      const offered = await uploads.listValidatableIds(1000, TIER);
      expect(offered).toEqual(expect.arrayContaining([ready, failedRead]));
      expect(offered).not.toContain(notScreened);
      expect(offered).not.toContain(notRead);
      expect(offered).not.toContain(done);

      expect(await repository.findSubject(notScreened)).toBeNull();
      expect(await repository.findSubject(notRead)).toBeNull();
      expect(await repository.findSubject(done)).toBeNull();
      expect(await repository.findSubject(failedRead)).toMatchObject({ readAmountCents: null, readOperationNumber: null });
      expect(await repository.findSubject(ready)).toMatchObject({
        paymentStatus: "pending",
        expectedCents: 15000,
        declaredOperationNumber: "08312457",
        readAmountCents: 15000,
        readOperationNumber: "08312457",
      });
    });
  });
});

describe("record", () => {
  it("approves a green pending payment: payment, seat, outbox and audit together", async () => {
    await rolledBack(async (tx) => {
      const repository = new DrizzleReceiptValidationRepository(tx as unknown as Db);
      const seeded = await payment(tx);
      const uploadId = await receipt(tx, seeded.paymentId);

      const effect = await repository.record({
        subject: (await repository.findSubject(uploadId))!,
        outcome: GREEN,
        detail: detail(GREEN),
        approval: approval(seeded.paymentId),
      });

      expect(effect).toBe("approved");
      expect(await state(tx, seeded)).toEqual({ status: "approved", seatStatus: "confirmed" });
      const [upload] = await tx.select().from(receiptUploads).where(eq(receiptUploads.id, uploadId));
      expect(upload).toMatchObject({ validationVerdict: "approve", validationDetail: detail(GREEN) });
      expect(upload!.validatedAt).not.toBeNull();
      const audits = await tx.select().from(auditLog).where(eq(auditLog.targetId, seeded.paymentId));
      expect(audits).toMatchObject([{ actorId: RECEIPT_VALIDATION_ACTOR, action: "payment.auto_approved" }]);
      const [expected] = approval(seeded.paymentId).notifications;
      const emails = await tx.select().from(outbox).where(eq(outbox.dedupeKey, expected!.dedupeKey));
      expect(emails).toMatchObject([{ templateKey: "payment_approved" }]);
    });
  });

  it("routes a red pending payment to review and never rejects it", async () => {
    await rolledBack(async (tx) => {
      const repository = new DrizzleReceiptValidationRepository(tx as unknown as Db);
      const seeded = await payment(tx);
      const uploadId = await receipt(tx, seeded.paymentId);

      const effect = await repository.record({
        subject: (await repository.findSubject(uploadId))!,
        outcome: RED,
        detail: detail(RED, 4000),
        approval: null,
      });

      expect(effect).toBe("routed_to_review");
      expect(await state(tx, seeded)).toEqual({ status: "under_review", seatStatus: "reserved" });
      const [group] = await tx.select({ seatsTaken: classGroups.seatsTaken }).from(classGroups).where(eq(classGroups.id, GROUP));
      expect(group!.seatsTaken).toBe(10);
    });
  });

  it("only records the verdict for a payment already under review — green never approves it", async () => {
    await rolledBack(async (tx) => {
      const repository = new DrizzleReceiptValidationRepository(tx as unknown as Db);
      const seeded = await payment(tx, { status: "under_review" });
      const uploadId = await receipt(tx, seeded.paymentId);

      const effect = await repository.record({
        subject: (await repository.findSubject(uploadId))!,
        outcome: GREEN,
        detail: detail(GREEN),
        approval: approval(seeded.paymentId),
      });

      expect(effect).toBe("none");
      expect(await state(tx, seeded)).toEqual({ status: "under_review", seatStatus: "reserved" });
      const [upload] = await tx.select().from(receiptUploads).where(eq(receiptUploads.id, uploadId));
      expect(upload!.validationVerdict).toBe("approve");
    });
  });

  it("is a no-op the second time", async () => {
    await rolledBack(async (tx) => {
      const repository = new DrizzleReceiptValidationRepository(tx as unknown as Db);
      const seeded = await payment(tx);
      const uploadId = await receipt(tx, seeded.paymentId);
      const subject = (await repository.findSubject(uploadId))!;

      await repository.record({ subject, outcome: RED, detail: detail(RED), approval: null });
      const second = await repository.record({ subject, outcome: GREEN, detail: detail(GREEN), approval: approval(seeded.paymentId) });

      expect(second).toBe("already_validated");
      expect(await state(tx, seeded)).toEqual({ status: "under_review", seatStatus: "reserved" });
      const [upload] = await tx.select().from(receiptUploads).where(eq(receiptUploads.id, uploadId));
      expect(upload!.validationVerdict).toBe("reject_suggested");
    });
  });

  it("does not approve onto a released seat — it routes to review instead", async () => {
    await rolledBack(async (tx) => {
      const repository = new DrizzleReceiptValidationRepository(tx as unknown as Db);
      const seeded = await payment(tx, { seatStatus: "released" });
      const uploadId = await receipt(tx, seeded.paymentId);

      const effect = await repository.record({
        subject: (await repository.findSubject(uploadId))!,
        outcome: GREEN,
        detail: detail(GREEN),
        approval: approval(seeded.paymentId),
      });

      expect(effect).toBe("routed_to_review");
      expect(await state(tx, seeded)).toEqual({ status: "under_review", seatStatus: "released" });
    });
  });

  it("lets only the latest upload move the payment", async () => {
    await rolledBack(async (tx) => {
      const repository = new DrizzleReceiptValidationRepository(tx as unknown as Db);
      const seeded = await payment(tx);
      const older = await receipt(tx, seeded.paymentId, { createdAt: new Date(Date.now() - 60_000) });
      await receipt(tx, seeded.paymentId, { createdAt: new Date() });

      const effect = await repository.record({
        subject: (await repository.findSubject(older))!,
        outcome: GREEN,
        detail: detail(GREEN),
        approval: approval(seeded.paymentId),
      });

      expect(effect).toBe("none");
      expect(await state(tx, seeded)).toEqual({ status: "pending", seatStatus: "reserved" });
    });
  });
});
```

> `DEFAULT_LOCALE` and `paymentApprovedEmails` are already exported from `@ooc/domain`; `outbox.dedupeKey` is the Drizzle field for `dedupe_key`.

- [ ] **Step 3: Run test to verify it fails**

Run: `DATABASE_URL=<local> pnpm --filter @ooc/api test:db -- DrizzleReceiptValidationRepository`
Expected: FAIL — `DrizzleReceiptValidationRepository` module not found.

- [ ] **Step 4: Relay query**

`DrizzleReceiptUploadRepository.ts` — in `IReceiptNormalizationStore` add:

```ts
  /** Screened, attached to a payment, with a level-1 row (a reading or a
   * recorded failure) and no verdict yet — what the relay offers to the
   * `receipt-validate` queue (OOC-21). */
  listValidatableIds(limit: number, tier: number): Promise<string[]>;
```

and implement after `listExtractableIds`:

```ts
  async listValidatableIds(limit: number, tier: number): Promise<string[]> {
    const rows = await this.db
      .select({ id: receiptUploads.id })
      .from(receiptUploads)
      .where(
        and(
          isNotNull(receiptUploads.paymentId),
          isNotNull(receiptUploads.screenedAt),
          isNull(receiptUploads.validatedAt),
          sql`exists (
            select 1 from ${paymentReceipts}
             where ${paymentReceipts.receiptUploadId} = ${receiptUploads.id}
               and ${paymentReceipts.tier} = ${tier}
          )`,
        ),
      )
      .orderBy(asc(receiptUploads.createdAt))
      .limit(limit);

    return rows.map((row) => row.id);
  }
```

- [ ] **Step 5: The repository**

`apps/api/src/infra/persistence/enrollment/DrizzleReceiptValidationRepository.ts`:

```ts
import {
  RECEIPT_EXTRACTION_TIER_PRIMARY,
  type IReceiptValidationRepository,
  type PaymentStatus,
  type ReceiptValidationEffect,
  type ReceiptValidationSubject,
} from "@ooc/domain";
import { auditLog, enrollments, paymentReceipts, payments, receiptUploads } from "@ooc/db";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";
import { insertOutboxEmails } from "@/infra/persistence/notification/DrizzleOutboxRepository.js";

/**
 * The receipt traffic light's writes (OOC-21). The automatic approval
 * reuses the manual settlement's moves (payment out of an open state, seat
 * `reserved → confirmed`, outbox, audit) but not its usecase: that one
 * demands a person and accepts `under_review`, and this one must do
 * neither.
 */
export class DrizzleReceiptValidationRepository implements IReceiptValidationRepository {
  constructor(private readonly db: Db) {}

  async findSubject(receiptUploadId: string): Promise<ReceiptValidationSubject | null> {
    const [row] = await this.db
      .select({
        receiptUploadId: receiptUploads.id,
        paymentId: payments.id,
        enrollmentId: enrollments.id,
        studentId: enrollments.studentId,
        classGroupId: enrollments.classGroupId,
        paymentStatus: payments.status,
        expectedCents: payments.amountCents,
        declaredOperationNumber: payments.operationNumber,
        readAmountCents: paymentReceipts.amountCents,
        readOperationNumber: paymentReceipts.operationNumber,
      })
      .from(receiptUploads)
      .innerJoin(payments, eq(payments.id, receiptUploads.paymentId))
      .innerJoin(enrollments, eq(enrollments.id, payments.enrollmentId))
      // The level-1 row — a failed reading has one too, with null columns,
      // and validates as `amount_unread`.
      .innerJoin(
        paymentReceipts,
        and(eq(paymentReceipts.receiptUploadId, receiptUploads.id), eq(paymentReceipts.tier, RECEIPT_EXTRACTION_TIER_PRIMARY)),
      )
      .where(
        and(eq(receiptUploads.id, receiptUploadId), isNotNull(receiptUploads.screenedAt), isNull(receiptUploads.validatedAt)),
      )
      .limit(1);

    return row ? { ...row, paymentStatus: row.paymentStatus as PaymentStatus } : null;
  }

  async record(params: Parameters<IReceiptValidationRepository["record"]>[0]): Promise<ReceiptValidationEffect> {
    const { subject, outcome, detail, approval } = params;

    return this.db.transaction(async (tx) => {
      const [stamped] = await tx
        .update(receiptUploads)
        .set({ validationVerdict: outcome.verdict, validationDetail: detail, validatedAt: sql`now()`, updatedAt: sql`now()` })
        .where(and(eq(receiptUploads.id, subject.receiptUploadId), isNull(receiptUploads.validatedAt)))
        .returning({ id: receiptUploads.id });
      if (!stamped) return "already_validated";

      // Only the upload that speaks for the payment moves it — the most
      // recent one, by the same order the review queue uses
      // (ListPaymentReviewQueueQuery's `latestUpload`).
      const [newer] = await tx
        .select({ id: receiptUploads.id })
        .from(receiptUploads)
        .where(
          and(
            eq(receiptUploads.paymentId, subject.paymentId),
            sql`(${receiptUploads.createdAt}, ${receiptUploads.id}) > (
              select self.created_at, self.id from ${receiptUploads} self where self.id = ${subject.receiptUploadId}
            )`,
          ),
        )
        .limit(1);
      if (newer) return "none";

      // Locks the payment and its enrollment: a reviewer settling the same
      // payment right now serialises behind (or ahead of) this.
      const [current] = await tx
        .select({ status: payments.status, seatStatus: enrollments.seatStatus })
        .from(payments)
        .innerJoin(enrollments, eq(enrollments.id, payments.enrollmentId))
        .where(eq(payments.id, subject.paymentId))
        .for("update");
      if (!current || current.status !== "pending") return "none";

      if (outcome.verdict === "approve" && approval && current.seatStatus !== "released") {
        await tx
          .update(payments)
          .set({ status: "approved", updatedAt: sql`now()` })
          .where(and(eq(payments.id, subject.paymentId), eq(payments.status, "pending")));
        // A monthly module's seat is already confirmed and stays as it is.
        await tx
          .update(enrollments)
          .set({ seatStatus: "confirmed", updatedAt: sql`now()` })
          .where(and(eq(enrollments.id, subject.enrollmentId), eq(enrollments.seatStatus, "reserved")));
        await insertOutboxEmails(tx, approval.notifications);
        await tx.insert(auditLog).values({
          actorId: approval.audit.actorId,
          action: approval.audit.action,
          targetId: approval.audit.targetId,
          metadata: approval.audit.metadata ?? null,
          createdAt: approval.audit.at,
        });
        return "approved";
      }

      await tx
        .update(payments)
        .set({ status: "under_review", updatedAt: sql`now()` })
        .where(and(eq(payments.id, subject.paymentId), eq(payments.status, "pending")));
      return "routed_to_review";
    });
  }
}
```

> If drizzle renders `${receiptUploads}` with a schema prefix that breaks the `self` alias, replace that subquery with `sql.raw` on the literal table name `receipt_uploads` — check the generated SQL in the failing test output.

- [ ] **Step 6: Run the integration test**

Run: `DATABASE_URL=<local> pnpm --filter @ooc/api test:db -- DrizzleReceiptValidationRepository`
Expected: PASS (7 tests).

- [ ] **Step 7: Run the whole DB suite (nothing else broke)**

Run: `DATABASE_URL=<local> pnpm --filter @ooc/api test:db && DATABASE_URL=<local> pnpm --filter @ooc/db test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/db apps/api/src/infra/persistence/enrollment
git commit -m "feat(api): record the receipt verdict and settle green in one transaction (OOC-21)"
```

---

### Task 5: The worker — queue, relay offer, wiring

**Files:**
- Create: `packages/queue/src/jobs/receipt-validate.job.ts`
- Create: `packages/queue/src/producers/receipt-validate.producer.ts`
- Modify: `packages/queue/src/index.ts`
- Create: `apps/api/src/workers/receipt-validate.worker.ts`
- Modify: `apps/api/src/workers/receipt-upload-relay.worker.ts`
- Modify: `apps/api/src/container.ts` (repository + `useCases.enrollment.validateReceipt`)
- Modify: `apps/api/src/index.ts`

**Interfaces:**
- Consumes: `ValidateReceiptUseCase` (Task 3), `DrizzleReceiptValidationRepository` and `listValidatableIds` (Task 4).
- Produces: `RECEIPT_VALIDATE_QUEUE = "receipt-validate"`, `ReceiptValidatePayloadSchema`, `type ReceiptValidatePayload`, `RECEIPT_VALIDATE_ATTEMPTS = 3`, `createReceiptValidateQueue(connection)`, `enqueueReceiptValidate(queue, payload)`; `startReceiptValidateWorker(connection, logger, { validateReceipt })`; `container.useCases.enrollment.validateReceipt`.

- [ ] **Step 1: Queue job + producer**

`packages/queue/src/jobs/receipt-validate.job.ts`:

```ts
import { z } from "zod";

export const RECEIPT_VALIDATE_QUEUE = "receipt-validate";

/** Only a pointer to the `receipt_uploads` row — the amounts stay in
 * Postgres, never Redis (same as the screen and extract jobs). */
export const ReceiptValidatePayloadSchema = z.object({
  receiptUploadId: z.string().uuid(),
});

export type ReceiptValidatePayload = z.infer<typeof ReceiptValidatePayloadSchema>;
```

`packages/queue/src/producers/receipt-validate.producer.ts`:

```ts
import { Queue, type ConnectionOptions } from "bullmq";
import { RECEIPT_VALIDATE_QUEUE, ReceiptValidatePayloadSchema, type ReceiptValidatePayload } from "../jobs/receipt-validate.job.js";

/** Validation only fails on something transient (database timeout) — same
 * short ladder as the screening. */
export const RECEIPT_VALIDATE_ATTEMPTS = 3;

export function createReceiptValidateQueue(connection: ConnectionOptions): Queue<ReceiptValidatePayload> {
  return new Queue<ReceiptValidatePayload>(RECEIPT_VALIDATE_QUEUE, {
    connection,
    defaultJobOptions: {
      attempts: RECEIPT_VALIDATE_ATTEMPTS,
      backoff: { type: "exponential", delay: 10_000 },
      removeOnComplete: true,
      removeOnFail: { age: 7 * 24 * 60 * 60 },
    },
  });
}

/** Job id derived from the row, so the relay can offer it on every sweep
 * until `validated_at` is stamped (same reasoning as `enqueueReceiptScreen`). */
export async function enqueueReceiptValidate(
  queue: Queue<ReceiptValidatePayload>,
  payload: ReceiptValidatePayload,
): Promise<void> {
  const parsed = ReceiptValidatePayloadSchema.parse(payload);
  await queue.add(RECEIPT_VALIDATE_QUEUE, parsed, { jobId: `receipt-validate-${parsed.receiptUploadId}` });
}
```

`packages/queue/src/index.ts` — append:

```ts
export { RECEIPT_VALIDATE_QUEUE, ReceiptValidatePayloadSchema } from "./jobs/receipt-validate.job.js";
export type { ReceiptValidatePayload } from "./jobs/receipt-validate.job.js";
export {
  RECEIPT_VALIDATE_ATTEMPTS,
  createReceiptValidateQueue,
  enqueueReceiptValidate,
} from "./producers/receipt-validate.producer.js";
```

- [ ] **Step 2: Worker**

`apps/api/src/workers/receipt-validate.worker.ts`:

```ts
import { Worker, type ConnectionOptions } from "bullmq";
import { RECEIPT_VALIDATE_QUEUE, ReceiptValidatePayloadSchema, type ReceiptValidatePayload } from "@ooc/queue";
import type { ValidateReceiptUseCase } from "@ooc/domain";
import type { FastifyBaseLogger } from "fastify";

/**
 * The receipt traffic light (OOC-21): hands the row to
 * `ValidateReceiptUseCase` once the relay sees it screened and read. Logs
 * ids, the verdict, its reason and what happened to the payment — never the
 * amount read nor the amount expected (CLAUDE.md §6, PII in logs).
 */
export function startReceiptValidateWorker(
  connection: ConnectionOptions,
  logger: FastifyBaseLogger,
  deps: { validateReceipt: ValidateReceiptUseCase },
): Worker<ReceiptValidatePayload> {
  return new Worker<ReceiptValidatePayload>(
    RECEIPT_VALIDATE_QUEUE,
    async (job) => {
      const { receiptUploadId } = ReceiptValidatePayloadSchema.parse(job.data);

      try {
        const { outcome, effect } = await deps.validateReceipt.run({ receiptUploadId });
        if (!outcome) {
          return;
        }
        logger.info({ receiptUploadId, verdict: outcome.verdict, reason: outcome.reason, effect }, "receipt validated");
      } catch (error) {
        logger.warn({ receiptUploadId, attempt: job.attemptsMade + 1 }, "receipt validate attempt failed, will retry");
        throw error;
      }
    },
    { connection, concurrency: 3 },
  );
}
```

- [ ] **Step 3: Relay offers it**

`receipt-upload-relay.worker.ts`: import `enqueueReceiptValidate` and `type ReceiptValidatePayload` from `@ooc/queue`; add `validateQueue: Queue<ReceiptValidatePayload>;` to `deps`; append to the docblock:

```ts
 *
 * The traffic light (OOC-21) waits for both: a receipt is offered to the
 * validate queue only once it is screened AND has its level-1 row (a
 * reading or a recorded failure). Without a model key nothing is ever read,
 * so nothing is ever offered — the pipeline stays as it was before OCR.
```

and after the extract block, inside the handler:

```ts
      const validatable = await deps.store.listValidatableIds(RELAY_BATCH, RECEIPT_EXTRACTION_TIER_PRIMARY);
      for (const receiptUploadId of validatable) {
        await enqueueReceiptValidate(deps.validateQueue, { receiptUploadId });
      }
      if (validatable.length > 0) {
        logger.debug({ offered: validatable.length }, "receipt upload relay offered rows to validate");
      }
```

- [ ] **Step 4: Container**

`apps/api/src/container.ts`: import `ValidateReceiptUseCase` from `@ooc/domain` and `DrizzleReceiptValidationRepository` from `./infra/persistence/enrollment/DrizzleReceiptValidationRepository.js`. In `AppUseCases.enrollment` add:

```ts
    /** Run by the `receipt-validate` worker, never a route (OOC-21). Pure
     * comparison — no AI module, so it may live in the container. */
    validateReceipt: ValidateReceiptUseCase;
```

Construct after `screenReceiptUpload` (it needs `enrollmentEmailContextLookup`, so place it after that is built — next to `settlePayment` is safe):

```ts
  const receiptValidationRepository = new DrizzleReceiptValidationRepository(db);
  const validateReceipt = new ValidateReceiptUseCase(
    receiptValidationRepository,
    platformSettingsRepository,
    enrollmentEmailContextLookup,
  );
```

and add `validateReceipt,` to `useCases.enrollment`.

- [ ] **Step 5: `index.ts` wiring**

Import `createReceiptValidateQueue` from `@ooc/queue` and `startReceiptValidateWorker` from `./workers/receipt-validate.worker.js`. Next to `receiptScreenQueue`:

```ts
const receiptValidateQueue = createReceiptValidateQueue(connection);
```

Pass `validateQueue: receiptValidateQueue` to `startReceiptUploadRelayWorker`. After the screen worker:

```ts
const receiptValidateWorker = startReceiptValidateWorker(connection, logger, {
  validateReceipt: useCases.enrollment.validateReceipt,
});
```

Add `receipt-validate` to the "Workers started: …" log line, and in shutdown close `receiptValidateWorker` next to `receiptScreenWorker.close()` and `receiptValidateQueue` next to `receiptScreenQueue.close()`. Extend the comment block above the relay (OCR level 1 paragraph) with one line: "The traffic light (OOC-21) rides the same relay once a receipt is both screened and read."

- [ ] **Step 6: Verify**

Run: `pnpm --filter @ooc/queue typecheck && pnpm --filter @ooc/api typecheck && pnpm --filter @ooc/api lint && pnpm --filter @ooc/api test`
Expected: all PASS.

Smoke (local, optional but recommended): `pnpm --filter @ooc/api dev` with Redis + Postgres up; the log shows `receipt-validate` in "Workers started".

- [ ] **Step 7: Commit**

```bash
git add packages/queue apps/api/src
git commit -m "feat(api): receipt-validate worker offered once screened and read (OOC-21)"
```

---

### Task 6: The review queue carries the verdict

**Files:**
- Modify: `apps/api/src/infra/persistence/payment/ListPaymentReviewQueueQuery.ts`
- Modify: `apps/api/src/http/payment/ListPaymentReviewQueueRoute.ts`
- Test: `apps/api/src/infra/persistence/payment/PaymentQueries.integration.test.ts`

**Interfaces:**
- Consumes: `RECEIPT_VERDICTS`, `RECEIPT_VERDICT_REASONS`, `isReceiptVerdict`, `isReceiptVerdictReason`, `type ReceiptVerdictOutcome` (Task 1); columns from Task 4.
- Produces: `PaymentReviewItem.verdict: ReceiptVerdictOutcome | null` (API shape `{ verdict, reason } | null`).

- [ ] **Step 1: Write the failing test**

In `PaymentQueries.integration.test.ts`, inside `describe("ListPaymentReviewQueueQuery", …)`, add (import `eq` from `drizzle-orm` if not already imported):

```ts
  it("carries the traffic light's verdict of the latest receipt (OOC-21)", async () => {
    await rolledBack(async (tx) => {
      const seeded = await seedPayments(tx, "read");
      await tx
        .update(receiptUploads)
        .set({
          validationVerdict: "reject_suggested",
          validationDetail: { reason: "far_below", expectedCents: 15000, readCents: 4000, toleranceCents: 0, rejectBelowPercent: 50 },
          validatedAt: new Date(),
        })
        .where(eq(receiptUploads.paymentId, seeded.underReview));

      const queue = await new ListPaymentReviewQueueQuery(tx as unknown as Db).run({ academicPeriodId: PERIOD });

      expect(queue.items[0]!.verdict).toBeNull();
      expect(queue.items[1]!.verdict).toEqual({ verdict: "reject_suggested", reason: "far_below" });
    });
  });

  it("reads an odd stored verdict as no verdict, never a 500", async () => {
    await rolledBack(async (tx) => {
      const seeded = await seedPayments(tx, "read");
      await tx
        .update(receiptUploads)
        .set({ validationVerdict: "review", validationDetail: { reason: "reason_from_a_later_version" }, validatedAt: new Date() })
        .where(eq(receiptUploads.paymentId, seeded.underReview));

      const queue = await new ListPaymentReviewQueueQuery(tx as unknown as Db).run({ academicPeriodId: PERIOD });

      expect(queue.items[1]!.verdict).toBeNull();
    });
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `DATABASE_URL=<local> pnpm --filter @ooc/api test:db -- PaymentQueries`
Expected: FAIL — `verdict` is `undefined`.

- [ ] **Step 3: Implement**

`ListPaymentReviewQueueQuery.ts`:
- import `isReceiptVerdict`, `isReceiptVerdictReason`, `type ReceiptVerdictOutcome` from `@ooc/domain`;
- `PaymentReviewItem` gains, after `reading`:

```ts
  /** The traffic light's verdict on the latest receipt (OOC-21) — `null`
   * while it has not run (no receipt, not screened or read yet, or no OCR
   * key configured). */
  verdict: ReceiptVerdictOutcome | null;
```

- update the `ReviewReceiptReading` docblock: replace "Only shown, never judged here: comparing it with the price is the validation step (ROADMAP Sessão 27)." with "The judgement is `verdict`, next to it (OOC-21)."
- add, next to `signalKinds`:

```ts
/** The verdict stamped on `receipt_uploads`. Same defence as `signalKinds`:
 * a value this version does not know reads as no verdict, never a 500. */
function receiptVerdict(verdict: string | null, detail: unknown): ReceiptVerdictOutcome | null {
  const reason = (detail as { reason?: unknown } | null)?.reason;
  if (!isReceiptVerdict(verdict) || !isReceiptVerdictReason(reason)) return null;
  return { verdict, reason };
}
```

- in `latestUpload` select add `validationVerdict: receiptUploads.validationVerdict, validationDetail: receiptUploads.validationDetail,`
- in the rows select add `validationVerdict: latestUpload.validationVerdict, validationDetail: latestUpload.validationDetail,`
- in the item mapping add `verdict: receiptVerdict(row.validationVerdict, row.validationDetail),` after `reading`.

`ListPaymentReviewQueueRoute.ts`: import `RECEIPT_VERDICTS, RECEIPT_VERDICT_REASONS` from `@ooc/domain`; change the comment above `ReadingSchema` to "What OCR level 1 read off the latest receipt (OOC-20). Null while there is no processed receipt to read."; add to `ItemSchema` after `reading`:

```ts
  verdict: z.object({ verdict: z.enum(RECEIPT_VERDICTS), reason: z.enum(RECEIPT_VERDICT_REASONS) }).nullable(),
```

(The handler spreads `row`, so `verdict` passes through unchanged.)

- [ ] **Step 4: Run tests**

Run: `DATABASE_URL=<local> pnpm --filter @ooc/api test:db -- PaymentQueries && pnpm --filter @ooc/api typecheck && pnpm --filter @ooc/api test -- payment-routes-authorization`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/infra/persistence/payment apps/api/src/http/payment
git commit -m "feat(api): review queue carries the receipt verdict (OOC-21)"
```

---

### Task 7: Backoffice — settings saved for real, verdict in the review dialog

**Files:**
- Modify: `apps/app/src/lib/backoffice/platform-settings.ts`
- Modify: `apps/app/src/lib/backoffice/types.ts` (`PaymentSettings` ~line 1020; `ReceiptReading` docblock ~line 950; `PaymentReviewItem` ~line 974)
- Modify: `apps/app/src/lib/backoffice/mock-data.ts` (`getPaymentSettings`, ~line 422)
- Modify: `apps/app/src/app/[locale]/backoffice/(panel)/(gated)/settings/receipts/page.tsx`
- Modify: `apps/app/src/app/[locale]/backoffice/(panel)/(gated)/settings/receipts/receipts-form.tsx`
- Modify: `apps/app/src/app/[locale]/backoffice/(panel)/(gated)/payments/review/receipt-review-dialog.tsx`
- Modify: `apps/app/src/messages/backoffice/es-PE.json`, `pt-BR.json`, `en.json`

**Interfaces:**
- Consumes: `GET /api/v1/settings` (three fields), `PUT /api/v1/settings/receipt-amount-tolerance` `{cents}`, `PUT /api/v1/settings/receipt-reject-below` `{percent}` (Task 2); `verdict` on `GET /api/v1/payments/review` (Task 6).
- Produces: UI only.

- [ ] **Step 1: Types and data**

`platform-settings.ts`:

```ts
export interface PlatformSettingsRow {
  checkoutHoldMinutes: number
  receiptAmountToleranceCents: number
  receiptRejectBelowPercent: number
}
```

`types.ts` — `PaymentSettings`: change the `toleranceCents` doc to `/** How far ABOVE the frozen price a receipt may land and still pass on its own — never below (CLAUDE.md §1, "Sem descontos"). */` and add after it:

```ts
  /** Below this percentage of the frozen price, rejection is suggested to the reviewer (1–99). */
  rejectBelowPercent: number
```

Add near `ReceiptReading`, and update `ReceiptReading`'s docblock to "Shown to the reviewer next to the receipt; the judgement on it is `ReviewVerdict` (OOC-21).":

```ts
/** The receipt traffic light's verdict (OOC-21). */
export type ReceiptVerdict = 'approve' | 'review' | 'reject_suggested'

export type ReceiptVerdictReason =
  | 'exact'
  | 'within_tolerance'
  | 'overpaid'
  | 'underpaid'
  | 'far_below'
  | 'amount_unread'
  | 'operation_number_unread'
  | 'operation_number_mismatch'

export interface ReviewVerdict {
  verdict: ReceiptVerdict
  reason: ReceiptVerdictReason
}
```

`PaymentReviewItem` gains after `reading`:

```ts
  /** The traffic light's verdict on the latest receipt; `null` while it has not run. */
  verdict: ReviewVerdict | null
```

`mock-data.ts` `getPaymentSettings()`: `toleranceCents: 0` (the server default, migration 0020) and add `rejectBelowPercent: 50`.

`settings/receipts/page.tsx` — replace the merge and its comment:

```tsx
  // What `apps/api` already enforces is read from there; the rest is still the
  // screen-only defaults.
  const platform = await getPlatformSettings()
  const receipts = {
    ...getGeneralSettings().receipts,
    ...(platform
      ? {
          checkoutHoldMinutes: platform.checkoutHoldMinutes,
          toleranceCents: platform.receiptAmountToleranceCents,
          rejectBelowPercent: platform.receiptRejectBelowPercent,
        }
      : {}),
  }
```

- [ ] **Step 2: Settings form**

`receipts-form.tsx` — docblock last paragraph becomes: "The checkout hold, the tolerance and the red line reach the server (`PUT /settings/…`, each appending to `audit_log`); the confidence floor and the reservation days still change on screen only, and the toast after saving says so." Replace `save()`:

```tsx
  /** One PUT per server-side number that changed; the first failure stops. */
  async function save() {
    const writes: { changed: boolean; path: string; body: Record<string, number> }[] = [
      {
        changed: draft.checkoutHoldMinutes !== saved.checkoutHoldMinutes,
        path: '/api/v1/settings/checkout-hold',
        body: { minutes: draft.checkoutHoldMinutes },
      },
      {
        changed: draft.toleranceCents !== saved.toleranceCents,
        path: '/api/v1/settings/receipt-amount-tolerance',
        body: { cents: draft.toleranceCents },
      },
      {
        changed: draft.rejectBelowPercent !== saved.rejectBelowPercent,
        path: '/api/v1/settings/receipt-reject-below',
        body: { percent: draft.rejectBelowPercent },
      },
    ]

    for (const write of writes.filter((entry) => entry.changed)) {
      const response = await fetch(write.path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(write.body),
      }).catch(() => null)

      if (!response?.ok) {
        setToast(t('settings.receipts_save_failed_toast'))
        return
      }
    }
    setSaved(draft)
    setToast(t('settings.receipts_saved_toast'))
  }
```

Tolerance input: `step={0.1}` (was 0.5), keep `min={0}` `max={50}`. Add a row right after the tolerance row:

```tsx
          <Row
            helpLabel={t('common.help')}
            label={t('settings.reject_below_label')}
            hint={t('settings.reject_below_hint')}
            value={t('settings.reject_below_value', { percent: draft.rejectBelowPercent })}
          >
            <input
              type="number"
              min={1}
              max={99}
              aria-label={t('settings.reject_below_label')}
              value={draft.rejectBelowPercent}
              onChange={(event) => set('rejectBelowPercent', Number(event.target.value))}
              className={numberClass}
            />
          </Row>
```

- [ ] **Step 3: Review dialog**

`receipt-review-dialog.tsx`: import `ReviewVerdict` from `@/lib/backoffice/types`; render the verdict right before the reading:

```tsx
              {payment.verdict && <VerdictNotice verdict={payment.verdict} />}
              {payment.reading && <ReadingSection reading={payment.reading} />}
```

Add the component below `ReadingSection`'s docblock neighbour (before it):

```tsx
/**
 * The receipt traffic light's verdict (OOC-21), in words. A suggested
 * rejection is only that — the reviewer still rejects, with a reason. A green
 * verdict only shows up here when something else (the screening) had already
 * sent the payment to a person.
 */
function VerdictNotice({ verdict }: { verdict: ReviewVerdict }) {
  const t = useTranslations('bo')
  const tone =
    verdict.verdict === 'reject_suggested'
      ? 'border-red-200 bg-red-50 text-red-800'
      : verdict.verdict === 'review'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-emerald-200 bg-emerald-50 text-emerald-800'

  return (
    <section>
      <SectionTitle icon="shield">{t('receipt_review.verdict_title')}</SectionTitle>
      <p className={`mt-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${tone}`}>
        <BoIcon name="alert" size={14} className="mt-0.5 shrink-0" />
        <span>
          <strong className="font-semibold">{t(`receipt_review.verdict_${verdict.verdict}`)}</strong>
          {' · '}
          {t(`receipt_review.verdict_reason_${verdict.reason}`)}
        </span>
      </p>
    </section>
  )
}
```

`ReadingSection` docblock: replace "Guidance next to the image, never a verdict: no colour says right or wrong, because comparing the reading with the price and choosing a confidence threshold are the validation step's (ROADMAP Sessão 27), measured on real receipts first (docs/OCR-AVALIACAO.md)." with "The judgement on it is `VerdictNotice`, above; the confidence threshold is still level 2's (Sessão 29), measured on real receipts first (docs/OCR-AVALIACAO.md)."

- [ ] **Step 4: Locales (three files, same keys)**

In `bo.receipt_review` (next to the `reading_*` keys) add, and **replace** `reading_intro`:

es-PE:
```json
"reading_intro": "Lo que la IA leyó en el comprobante. La confianza la informa el propio modelo.",
"verdict_title": "Validación automática",
"verdict_approve": "Monto y número de operación coinciden",
"verdict_review": "Necesita revisión",
"verdict_reject_suggested": "Rechazo sugerido",
"verdict_reason_exact": "el monto leído es exactamente el precio del plan.",
"verdict_reason_within_tolerance": "el monto leído está por encima del precio, dentro de la tolerancia.",
"verdict_reason_overpaid": "el monto leído supera el precio más allá de la tolerancia.",
"verdict_reason_underpaid": "el monto leído está por debajo del precio del plan.",
"verdict_reason_far_below": "el monto leído está muy por debajo del precio del plan. Confirma en la imagen antes de rechazar.",
"verdict_reason_amount_unread": "la IA no pudo leer el monto.",
"verdict_reason_operation_number_unread": "el monto coincide, pero la IA no leyó el número de operación.",
"verdict_reason_operation_number_mismatch": "el monto coincide, pero el número de operación leído no es el que declaró el alumno."
```

pt-BR:
```json
"reading_intro": "O que a IA leu no comprovante. A confiança é informada pelo próprio modelo.",
"verdict_title": "Validação automática",
"verdict_approve": "Valor e número de operação conferem",
"verdict_review": "Precisa de revisão",
"verdict_reject_suggested": "Rejeição sugerida",
"verdict_reason_exact": "o valor lido é exatamente o preço do plano.",
"verdict_reason_within_tolerance": "o valor lido está acima do preço, dentro da tolerância.",
"verdict_reason_overpaid": "o valor lido passa do preço além da tolerância.",
"verdict_reason_underpaid": "o valor lido está abaixo do preço do plano.",
"verdict_reason_far_below": "o valor lido está muito abaixo do preço do plano. Confira na imagem antes de rejeitar.",
"verdict_reason_amount_unread": "a IA não conseguiu ler o valor.",
"verdict_reason_operation_number_unread": "o valor confere, mas a IA não leu o número de operação.",
"verdict_reason_operation_number_mismatch": "o valor confere, mas o número de operação lido não é o que o aluno declarou."
```

en:
```json
"reading_intro": "What the AI read on the receipt. The confidence is the model's own report.",
"verdict_title": "Automatic validation",
"verdict_approve": "Amount and operation number match",
"verdict_review": "Needs review",
"verdict_reject_suggested": "Rejection suggested",
"verdict_reason_exact": "the amount read is exactly the plan price.",
"verdict_reason_within_tolerance": "the amount read is above the price, within the tolerance.",
"verdict_reason_overpaid": "the amount read exceeds the price beyond the tolerance.",
"verdict_reason_underpaid": "the amount read is below the plan price.",
"verdict_reason_far_below": "the amount read is far below the plan price. Check the image before rejecting.",
"verdict_reason_amount_unread": "the AI could not read the amount.",
"verdict_reason_operation_number_unread": "the amount matches, but the AI did not read the operation number.",
"verdict_reason_operation_number_mismatch": "the amount matches, but the operation number read is not the one the student declared."
```

In `bo.settings` **replace** `tolerance_hint`, `locked_body` stays, **replace** `receipts_saved_toast`, and add the three `reject_below_*` keys after `tolerance_hint`:

es-PE:
```json
"tolerance_hint": "Cuánto puede pasarse el comprobante del precio del plan y aun así aprobarse solo. Nunca hacia abajo: un centavo menos siempre va a revisión.",
"reject_below_label": "Rechazo sugerido",
"reject_below_hint": "Si el monto leído queda por debajo de este porcentaje del precio, la revisión lo marca como rechazo sugerido. Rechazar sigue siendo de una persona.",
"reject_below_value": "{percent}% del precio",
"receipts_saved_toast": "Guardado: vale para los próximos comprobantes. La confianza mínima y la vigencia de la reserva todavía se cambian solo en pantalla."
```

pt-BR:
```json
"tolerance_hint": "O quanto o comprovante pode passar do preço do plano e ainda ser aprovado sozinho. Nunca para baixo: um centavo a menos sempre vai para revisão.",
"reject_below_label": "Rejeição sugerida",
"reject_below_hint": "Se o valor lido ficar abaixo desta porcentagem do preço, a revisão marca como rejeição sugerida. Rejeitar continua sendo de uma pessoa.",
"reject_below_value": "{percent}% do preço",
"receipts_saved_toast": "Salvo: vale para os próximos comprovantes. A confiança mínima e a vigência da reserva ainda mudam só na tela."
```

en:
```json
"tolerance_hint": "How far above the plan price a receipt may land and still pass on its own. Never below: one cent short always goes to review.",
"reject_below_label": "Suggested rejection",
"reject_below_hint": "If the amount read falls below this percentage of the price, review flags it as a suggested rejection. Rejecting is still a person's call.",
"reject_below_value": "{percent}% of the price",
"receipts_saved_toast": "Saved: applies to the next receipts. Minimum confidence and reservation validity still change on screen only."
```

> Use the existing pt-BR / en text style of each file (check the neighbouring keys' tone before pasting). Keep key order identical across the three files.

- [ ] **Step 5: Verify**

Run: `pnpm --filter @ooc/app typecheck && pnpm --filter @ooc/app lint && pnpm --filter @ooc/app build`
Expected: PASS (lint enforces no literal strings; build catches a missing message key only at runtime, so also do Step 6).

- [ ] **Step 6: See it working**

With API + app running locally (`pnpm --filter @ooc/api dev`, `pnpm --filter @ooc/app dev`, logged in as `admin@admin.com`): open `/backoffice/settings/receipts`, change the tolerance to S/0,50 and the percentage to 60, save, reload — both persist; `audit_log` has `platform_settings.receipt_amount_tolerance_cents` and `…reject_below_percent`. Open `/backoffice/payments` review: a payment whose latest receipt has a verdict shows the notice in all three locales (`/`, `/pt`, `/en`).

- [ ] **Step 7: Commit**

```bash
git add apps/app/src
git commit -m "feat(app): receipt tolerance and red line saved, verdict shown in review (OOC-21)"
```

---

### Task 8: Living documentation

**Files:**
- Modify: `apps/api/CLAUDE.md` (Pagamento; OCR "Nível 1 — como está construído" bullets "Só lê, não decide" and "Onde ver a leitura"; Antifraude bullet on `operation_number`)
- Modify: `README.md` (Estado atual)
- Modify: `apps/api/README.md` if it lists workers/queues

- [ ] **Step 1: `apps/api/CLAUDE.md`**

- Pagamento: replace "Tolerância de validação **configurável no backoffice**, não constante no código." with:
  "Tolerância de validação **configurável no backoffice**, não constante no código — `platform_settings.receipt_amount_tolerance_cents` (padrão 0, CHECK 0–5000) e `receipt_reject_below_percent` (padrão 50, provisório, CHECK 1–99), cada uma com usecase, `audit_log` e `PUT /settings/…` (`master`/`admin`). **Só pra cima** (OOC-21, decisão 03/10/2026): \"Sem descontos\" — um centavo a menos nunca aprova sozinho."
- Same section, "Ainda não existe": remove "OCR" from the list (keep credenciais, cron, trâmite).
- OCR: add a new subsection after "Nível 1 — como está construído":

```markdown
### Semáforo (OOC-21, 03/10/2026)

- **Worker `receipt-validate`**, oferecido pelo `receipt-upload-relay` quando o comprovante **já passou pela triagem e já tem a linha nível 1** (lida ou falha) e ainda não tem veredito. Espera a triagem de propósito: as duas rodam em paralelo, e sem isso o verde aprovaria um arquivo que a triagem mandaria pra fila. Sem chave de OCR nada é lido, então nada é oferecido.
- **Regra pura** (`packages/domain/src/enrollment/ReceiptValidation.ts`), só inteiros. Esperado = `payments.amount_cents` (preço congelado, nunca o de hoje). Igual ou acima até a tolerância → **verde**; acima além dela → revisão (`overpaid`); abaixo mas ≥ X% → revisão (`underpaid`); abaixo de X% (estrito) → **rejeição sugerida** (`far_below`); valor não lido → revisão. Verde de valor ainda exige o **nº de operação lido = digitado** (normalizado); não lido ou divergente → revisão.
- **Verde liquida, vermelho sugere** (decisão do dono). Verde aprova só pagamento **`pending`**, na mesma transação que grava o veredito: vaga `reserved → confirmed`, e-mail `payment_approved`, `audit_log` `payment.auto_approved` com ator `system:receipt-validation`. O que a triagem já mandou pra `under_review` nunca é aprovado sozinho. Amarelo e vermelho levam `pending → under_review`; **nada rejeita sozinho**. Vaga `released` não aprova — vai pra revisão.
- **Só o upload mais recente do pagamento** (mesma ordem da fila de revisão) mexe no status; upload antigo recebe o veredito e para por aí.
- Veredito em `receipt_uploads.validation_verdict` + `validation_detail` (motivo e os números daquele momento: esperado, lido, tolerância, X) + `validated_at`, uma vez só. Mudar a configuração não refaz veredito gravado.
- Log: ids, veredito, motivo e efeito — nunca valor lido nem esperado.
```

- In "Nível 1 — como está construído": the bullet "**Só lê, não decide.** …" becomes "**Só lê.** Quem decide é o semáforo (abaixo). Escalar no nível 2 é a Sessão 29; o nº de operação **lido** ainda não entra no `operationNumberGuard` (hoje só o digitado) nem o titular lido no `payerNameMatches`." — and in "**Onde ver a leitura.**" replace "Só exibição: nenhuma cor diz certo ou errado (limiar e comparação são da Sessão 27)" with "Ao lado, o veredito do semáforo (`verdict`: `{verdict, reason}` ou `null`), em texto do locale".
- Antifraude, bullet "Nº de operação já usado…": its last sentence becomes "Hoje o número checado no submit é o digitado; o lido (`payment_receipts.operation_number`, OOC-20) só é comparado com o digitado no verde do semáforo (OOC-21), não no guard."

- [ ] **Step 2: README.md — Estado atual**

Find the OCR / pagamento lines in "Estado atual" and add: "Semáforo do comprovante (OOC-21): compara o valor lido com o preço congelado sob tolerância (só pra cima) e limite de rejeição configuráveis no backoffice; verde aprova sozinho pagamento pendente, amarelo e vermelho vão pra revisão — vermelho como rejeição sugerida." Keep the README's existing tone and bullet format.

- [ ] **Step 3: ROADMAP — signal only**

Do **not** edit `docs/ROADMAP.md` (CLAUDE.md §10). In the final report to the user, flag: "Sessão 27 (`☐ 27 Semáforo e validação`) pode virar ☑ — falta a sua confirmação para editar o ROADMAP."

- [ ] **Step 4: Commit**

```bash
git add apps/api/CLAUDE.md README.md apps/api/README.md
git commit -m "docs: receipt traffic light (OOC-21)"
```

---

## Final verification (before claiming done)

- [ ] `pnpm -r typecheck && pnpm -r lint`
- [ ] `pnpm --filter @ooc/api test`
- [ ] `DATABASE_URL=<local> pnpm --filter @ooc/api test:db && DATABASE_URL=<local> pnpm --filter @ooc/db test`
- [ ] `pnpm --filter @ooc/app build`
- [ ] The four done-criteria cases pass by name in `receipt-validation-rule.test.ts` (exact → approve, cents short → review, cents over → review / approve within tolerance, far below → reject_suggested).
