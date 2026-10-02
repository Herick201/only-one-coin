# OOC-55 — Matrícula em revisão vai para Pagos — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Matrículas e Alunos mostram só quem entrou; o que está aberto vive em Pagos, onde `master`/`admin`/`billing` aprovam ou rejeitam e isso finaliza (ou devolve) a matrícula.

**Architecture:** Duas leituras existentes ganham um filtro (vaga `confirmed` no livro de matrículas; "só reservada" fora do diretório). Pagos deixa o mock: duas consultas novas em `apps/api` (livro + fila) e um caso de uso `SettlePaymentUseCase` em `packages/domain`, cujo repositório faz pagamento, vaga, `seats_taken`, outbox e `audit_log` numa transação curta com UPDATE condicional. As telas leem a API por URL, igual Matrículas.

**Tech Stack:** Fastify + Drizzle (Postgres/Neon) + zod, `packages/domain` puro, Next.js App Router + next-intl, vitest.

**Spec:** `docs/superpowers/specs/2026-10-01-ooc-55-review-to-payments-design.md`

## Global Constraints

- Código, commits, comentários em inglês; docs internas em português (CLAUDE.md §4/§9).
- Zero string de UI em `.ts/.tsx`: toda chave nova nos três arquivos `apps/app/src/messages/backoffice/{es-PE,pt-BR,en}.json`, mesma estrutura.
- Nenhum código de domínio na tela (`identical_file`, `amount_mismatch` sempre via locale).
- Dinheiro em `amount_cents` inteiro; datas `timestamptz`.
- Sem delete físico: testes que escrevem `students`/`payments`/`audit_log` rodam dentro de transação revertida.
- Toda rota declara papéis (`.roles(...)`).
- Papéis: aprovar/rejeitar = `master`, `admin`, `billing`. Ler Pagos = `master`, `admin`, `analyst`, `billing`, `support`. Imagem do comprovante = `master`, `admin`, `analyst`, `billing`.
- Janela de revisão: `REVIEW_WINDOW_DAYS = 5` (provisória, mesma do `RESERVATION_WINDOW_DAYS` atual).
- E-mail de aprovação/rejeição em `es-PE` (`DEFAULT_LOCALE`).
- Comandos: `pnpm typecheck:api`, `pnpm typecheck:domain`, `pnpm typecheck:app`, `pnpm test:api`, `pnpm test:api:db` (lê `DATABASE_URL` de `apps/api/.env` — rodar com `pnpm --filter @ooc/api exec dotenv -e .env -- vitest run --config vitest.integration.config.ts <arquivo>` ou exportar a variável), `pnpm lint`.

---

### Task 1: Livro de matrículas mostra só vaga confirmada

**Files:**
- Modify: `apps/api/src/infra/persistence/enrollment/ListEnrollmentsQuery.ts`
- Modify: `apps/api/src/http/enrollment/ListEnrollmentsRoute.ts`
- Test: `apps/api/src/infra/persistence/enrollment/ListEnrollmentsQuery.integration.test.ts`

**Interfaces:**
- Produces: `EnrollmentListFilters` sem `status`/`seatStatus`; `EnrollmentListMetrics = { periodName: string; total: number; active: number }`. Remove o export `RESERVATION_WINDOW_DAYS, RESERVATION_WARNING_HOURS` (vão para a Task 6).

- [ ] **Step 1: Reescrever o seed e os testes**

No arquivo de teste, troque `COMBOS`, `ENROLLMENT_COUNT` e os testes de filtro/busca:

```ts
/** Seat × latest payment. Only the first two are enrollments; the rest are
 * still being settled in Payments and must never reach the ledger. */
const COMBOS: { seat: "reserved" | "confirmed" | "released"; payment: string | null }[] = [
  { seat: "confirmed", payment: "approved" },
  { seat: "confirmed", payment: "under_review" },
  { seat: "reserved", payment: "pending" },
  { seat: "released", payment: "rejected" },
];

const ENROLLMENT_COUNT = 40;

const isVisible = (i: number) => COMBOS[i % COMBOS.length]!.seat === "confirmed";
const VISIBLE = Array.from({ length: ENROLLMENT_COUNT }, (_, i) => i).filter(isVisible);
```

Substitua `describe("paging")`, `describe("filters")` e `describe("search")` por:

```ts
describe("visibility", () => {
  it("lists only enrollments whose seat is confirmed", async () => {
    const all = await readAll();

    expect(all.total).toBe(VISIBLE.length);
    expect(all.rows.every((row) => row.seatStatus === "confirmed")).toBe(true);
  });

  it("does not find a reserved enrollment even by its operation number", async () => {
    const found = await readAll({ q: "OPLEDGER0002" });

    expect(found.total).toBe(0);
  });
});

describe("paging", () => {
  it("splits the ledger into pages that cover every row once, newest first", async () => {
    const first = await query.run({ academicPeriodId: PERIOD, page: 1 });
    const second = await query.run({ academicPeriodId: PERIOD, page: 2 });

    expect(first.total).toBe(VISIBLE.length);
    expect(first.items).toHaveLength(PAGE_SIZE);
    expect(second.items).toHaveLength(VISIBLE.length - PAGE_SIZE);

    const ids = [...first.items, ...second.items].map((row) => row.id);
    expect(new Set(ids).size).toBe(VISIBLE.length);

    const times = [...first.items, ...second.items].map((row) => row.createdAt.getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it("reverses the order for oldest first", async () => {
    const newest = await readAll();
    const oldest = await readAll({ sort: "oldest" });

    expect(oldest.rows.map((row) => row.id)).toEqual(newest.rows.map((row) => row.id).reverse());
  });
});

describe("filters", () => {
  it("filters by language", async () => {
    const filtered = await readAll({ language: LANGUAGE_B });

    expect(filtered.total).toBe(VISIBLE.filter((i) => i % 2 === 1).length);
    expect(filtered.rows.every((row) => row.language?.name === LANGUAGE_B)).toBe(true);
  });

  it("offers every language and period in the catalog, not only the ones on the page", async () => {
    const result = await query.run({ academicPeriodId: PERIOD, language: LANGUAGE_A });

    expect(result.filterOptions.languages).toEqual(expect.arrayContaining([LANGUAGE_A, LANGUAGE_B]));
    expect(result.filterOptions.periods).toEqual(
      expect.arrayContaining([{ id: PERIOD, name: "Ciclo de prueba (ledger integration)" }]),
    );
  });
});

describe("search", () => {
  it("finds every row by the tracking code the student was given", async () => {
    const all = await readAll();

    for (const row of all.rows) {
      const found = await query.run({ academicPeriodId: PERIOD, q: row.code });
      expect(found.items.map((item) => item.id)).toContain(row.id);
    }
  }, 60_000);

  it("finds a row by the operation number on its latest payment", async () => {
    const found = await readAll({ q: "OPLEDGER0004" });

    expect(found.rows).toHaveLength(1);
    expect(found.rows[0]!.operationNumber).toBe("OPLEDGER0004");
  });

  it("finds rows by student name", async () => {
    const found = await readAll({ q: "Alumno1" });

    const expected = VISIBLE.filter((i) => `Alumno${i}`.includes("Alumno1")).length;
    expect(found.total).toBe(expected);
  });
});
```

Remova o import de `EnrollmentListStatus` se não for mais usado.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @ooc/api test:db -- ListEnrollmentsQuery` (com `DATABASE_URL` exportada)
Expected: FAIL — `visibility` conta 40, não 20.

- [ ] **Step 3: Implementar**

Em `ListEnrollmentsQuery.ts`:
1. `EnrollmentListFilters`: remover `status` e `seatStatus`. Remover `statusCondition` e os dois `if` correspondentes em `filterConditions`.
2. Em `run`, a cláusula `where` ganha a condição base:

```ts
    const where = and(
      isNull(enrollments.deletedAt),
      // OOC-55: the ledger is who got in. A seat still reserved (payment open)
      // or already handed back (payment refused) is settled in Payments and
      // never reaches this list. The seat decides, not the latest payment: a
      // monthly student whose next module is still open is still a student.
      eq(enrollments.seatStatus, "confirmed"),
      ...this.filterConditions(filters, latestPayment),
    );
```

3. `EnrollmentListMetrics` vira `{ periodName: string; total: number; active: number }`. Em `metrics(now)`: remover o parâmetro `now`, `expiryThreshold`, e as colunas `reserved`, `expiringSoon`, `released`; adicionar `eq(enrollments.seatStatus, "confirmed")` ao `where` do `totals`. Remover `RESERVATION_WINDOW_DAYS`, `RESERVATION_WARNING_HOURS`, `HOUR_MS` e o export deles; o export final vira `export { PAGE_SIZE };`. A assinatura de `run` vira `run(filters: EnrollmentListFilters = {})`.
4. Atualizar o JSDoc da classe: "every confirmed seat"; o `deriveStatus` fica (o status por linha ainda distingue `active` de módulo mensal em aberto).

Em `ListEnrollmentsRoute.ts`: remover `status` e `seat` do `ListEnrollmentsQuerySchema` e do handler; `metrics` no response schema vira `z.object({ periodName: z.string(), total: z.number().int(), active: z.number().int() })`. Remover `SeatStatusSchema` se não for mais usado fora do row schema (o row continua com `seatStatus`, então manter).

- [ ] **Step 4: Rodar testes e typecheck**

Run: `pnpm --filter @ooc/api test:db -- ListEnrollmentsQuery` e `pnpm typecheck:api`
Expected: PASS. Se o typecheck acusar outro leitor de `RESERVATION_WINDOW_DAYS`, ele é da Task 6 — mova a constante para lá agora em vez de reexportar.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/infra/persistence/enrollment/ListEnrollmentsQuery.ts apps/api/src/http/enrollment/ListEnrollmentsRoute.ts apps/api/src/infra/persistence/enrollment/ListEnrollmentsQuery.integration.test.ts
git commit -m "feat(api): enrollment ledger lists only confirmed seats (OOC-55)"
```

---

### Task 2: Diretório de alunos esconde quem só está em revisão

**Files:**
- Modify: `apps/api/src/infra/persistence/student/ListStudentsQuery.ts`
- Create: `apps/api/src/infra/persistence/student/ListStudentsQuery.integration.test.ts`

**Interfaces:**
- Produces: nada novo; `ListStudentsQuery.run(q?, cursor?)` mantém a assinatura.

- [ ] **Step 1: Escrever o teste**

```ts
import * as schema from "@ooc/db";
import { academicPeriods, classGroups, courses, enrollments, planPrices, plans, students } from "@ooc/db";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/infra/db/client.js";
import { ListStudentsQuery } from "./ListStudentsQuery.js";

/**
 * OOC-55: the student directory is people who got in, plus people registered
 * by hand who have not enrolled yet. Someone whose only enrollment is still
 * being settled in Payments is not listed — but the manual enrollment
 * picker (`q`) still finds them, or staff would open a second file.
 *
 * `students` is under the delete lock (migration 0011): every test runs in a
 * transaction that is always rolled back. The rows are created in 2099 so
 * they are the first page of a newest-first browse whatever else the
 * database holds.
 */

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required: this suite exercises ListStudentsQuery against a real, migrated Postgres.");
}

const PERIOD = "018f2b5c-7000-7000-8000-000000000001";
const COURSE = "018f2b5c-7000-7000-8000-000000000002";
const PLAN = "018f2b5c-7000-7000-8000-000000000003";
const PLAN_PRICE = "018f2b5c-7000-7000-8000-000000000004";
const GROUP = "018f2b5c-7000-7000-8000-000000000005";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
class RolledBack extends Error {}

let pool: pg.Pool;
let db: Db;

beforeAll(() => {
  pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
  db = drizzle(pool, { schema, casing: "snake_case" });
});

afterAll(async () => {
  await pool.end();
});

async function rolledBack(fn: (tx: Tx) => Promise<void>): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      await fn(tx);
      throw new RolledBack();
    });
  } catch (error) {
    if (!(error instanceof RolledBack)) throw error;
  }
}

/** One student per seat shape: none, reserved only, confirmed, released only, confirmed + reserved. */
const SHAPES: { name: string; seats: ("reserved" | "confirmed" | "released")[]; listed: boolean }[] = [
  { name: "SinMatricula", seats: [], listed: true },
  { name: "SoloReservada", seats: ["reserved"], listed: false },
  { name: "Confirmada", seats: ["confirmed"], listed: true },
  { name: "SoloLiberada", seats: ["released"], listed: true },
  { name: "ConfirmadaYReservada", seats: ["confirmed", "reserved"], listed: true },
];

async function seed(tx: Tx): Promise<Map<string, string>> {
  await tx.insert(academicPeriods).values({
    id: PERIOD,
    name: "Ciclo de prueba (students integration)",
    startsOn: new Date("2026-03-01T00:00:00.000Z"),
    endsOn: new Date("2026-07-31T00:00:00.000Z"),
  });
  await tx.insert(courses).values({ id: COURSE, name: "Curso (students integration)", language: "Prueba", minAge: 12 });
  await tx.insert(plans).values({ id: PLAN, courseId: COURSE, name: "Paquete completo" });
  await tx.insert(planPrices).values({ id: PLAN_PRICE, planId: PLAN, amountCents: 10000 });
  await tx.insert(classGroups).values({
    id: GROUP,
    courseId: COURSE,
    academicPeriodId: PERIOD,
    schedule: "Lun/Mié 19:00",
    startsOn: new Date("2026-03-02T00:00:00.000Z"),
    endsOn: new Date("2026-06-30T00:00:00.000Z"),
    capacity: 50,
  });

  const rows = await tx
    .insert(students)
    .values(
      SHAPES.map((shape, i) => ({
        firstName: shape.name,
        lastName: "Directorio",
        nationalIdType: "DNI",
        nationalId: `DIRTEST${i}`,
        email: `dir.${i}@gmail.com`,
        phone: "+51900000000",
        birthDate: new Date("2000-01-01T00:00:00.000Z"),
        country: "PE",
        city: "Lima",
        createdAt: new Date(Date.UTC(2099, 0, 1, 0, i)),
      })),
    )
    .returning({ id: students.id, firstName: students.firstName });
  const idOf = new Map(rows.map((row) => [row.firstName, row.id]));

  const seats = SHAPES.flatMap((shape) =>
    shape.seats.map((seatStatus) => ({
      studentId: idOf.get(shape.name)!,
      classGroupId: GROUP,
      planPriceId: PLAN_PRICE,
      seatStatus,
    })),
  );
  await tx.insert(enrollments).values(seats);

  return idOf;
}

describe("student directory (no q)", () => {
  it("leaves out a student whose only enrollment is still being settled", async () => {
    await rolledBack(async (tx) => {
      const query = new ListStudentsQuery(tx as unknown as Db);
      const before = await query.run();
      const idOf = await seed(tx);
      const after = await query.run();

      const listed = new Set(after.items.map((row) => row.id));
      for (const shape of SHAPES) {
        expect(listed.has(idOf.get(shape.name)!), shape.name).toBe(shape.listed);
      }
      expect(after.total! - before.total!).toBe(SHAPES.filter((shape) => shape.listed).length);
    });
  });
});

describe("manual enrollment picker (q)", () => {
  it("still finds the student under review, so nobody opens a second file", async () => {
    await rolledBack(async (tx) => {
      const query = new ListStudentsQuery(tx as unknown as Db);
      const idOf = await seed(tx);
      const found = await query.run("SoloReservada");

      expect(found.items.map((row) => row.id)).toContain(idOf.get("SoloReservada"));
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @ooc/api test:db -- ListStudentsQuery`
Expected: FAIL em "leaves out" — `SoloReservada` aparece.

- [ ] **Step 3: Implementar**

Em `ListStudentsQuery.run`:

```ts
    // OOC-55: a student whose only enrollments are still reserved is being
    // settled in Payments, not enrolled — the directory leaves them out. The
    // picker (`q`) does not: staff searching a national id must find the file
    // that already exists, or they would register the person twice.
    const underReviewOnly = sql`count(${enrollments.id}) filter (where ${enrollments.seatStatus} = 'confirmed') = 0
      and count(${enrollments.id}) filter (where ${enrollments.seatStatus} = 'reserved') > 0`;
```

- Na query de linhas, depois de `.groupBy(students.id)`, adicionar `.having(needle ? undefined : sql`not (${underReviewOnly})`)`.
- O `totalPromise` passa a contar o mesmo conjunto:

```ts
    const totalPromise =
      !needle && !cursor
        ? this.db
            .select({ value: sql<number>`count(*)`.mapWith(Number) })
            .from(
              this.db
                .select({ id: students.id })
                .from(students)
                .leftJoin(enrollments, and(eq(enrollments.studentId, students.id), isNull(enrollments.deletedAt)))
                .where(isNull(students.deletedAt))
                .groupBy(students.id)
                .having(sql`not (${underReviewOnly})`)
                .as("listed_students"),
            )
        : null;
```

- Atualizar o JSDoc da classe ("`under_review` only reaches the picker").

- [ ] **Step 4: Rodar testes e typecheck**

Run: `pnpm --filter @ooc/api test:db -- ListStudentsQuery` e `pnpm typecheck:api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/infra/persistence/student/
git commit -m "feat(api): student directory leaves out students still under review (OOC-55)"
```

---

### Task 3: Telas de Matrículas e Alunos seguem a regra

**Files:**
- Modify: `apps/app/src/lib/backoffice/enrollment-ledger-query.ts` (remover `status`/`seat`)
- Modify: `apps/app/src/lib/backoffice/types.ts` (`EnrollmentMetrics` = `{ periodName; total; active }`)
- Modify: `apps/app/src/app/[locale]/backoffice/(panel)/(gated)/enrollments/enrollments-view.tsx`
- Modify: `apps/app/src/app/[locale]/backoffice/(panel)/(gated)/enrollments/page.tsx` (tirar a aba Reservas — `SectionTabs` some se sobrar uma aba só)
- Delete: `apps/app/src/app/[locale]/backoffice/(panel)/(gated)/enrollments/reservations/` (página + view) — `git rm -r`
- Modify: `apps/app/src/app/[locale]/backoffice/(panel)/(gated)/students/students-table.tsx`
- Modify: `apps/app/src/messages/backoffice/{es-PE,pt-BR,en}.json`
- Modify: `apps/app/src/lib/backoffice/mock-data.ts` (remover `listSeatReservations` se ficar sem leitor)

**Interfaces:**
- Consumes: `GET /enrollments` da Task 1 (sem `status`/`seat`, métricas com 3 campos).

- [ ] **Step 1: Ledger query do app**

Em `enrollment-ledger-query.ts`, remover `status` e `seat` de `EnrollmentLedgerQuery`, de `parseEnrollmentLedgerQuery` e de `enrollmentLedgerSearchParams` (e as listas `STATUSES`/`SEATS`). Um link antigo com `?status=` simplesmente é ignorado.

- [ ] **Step 2: `enrollments-view.tsx`**

- Remover os dois `StatCard` de `metrics.reserved`/`metrics.released`; ficam total e ativos.
- Remover os grupos de filtro de status e vaga do `FiltersDropdown` (e `activeFilters` passa a contar só idioma e período).
- Depois que a matrícula manual é criada (o callback que hoje chama `router.refresh()`, ~linha 333), mostrar o `Toast` (`@/components/backoffice/controls`, já usado em `review-queue-view.tsx`) com `t('enrollments.created_sent_to_payments')`. A linha não vai aparecer na lista — o aviso é o que diz para onde ela foi.

- [ ] **Step 3: `students-table.tsx`**

`STATUS_FILTERS` vira `['all', 'active', 'inactive']`; `counts` deixa de calcular `under_review`. O tipo de linha continua aceitando `under_review` (a ficha e o seletor ainda recebem).

- [ ] **Step 4: Locales (três arquivos, mesma chave)**

Adicionar em `enrollments`:
- es-PE: `"created_sent_to_payments": "Matrícula registrada. Aparecerá aquí cuando Pagos confirme el pago."`
- pt-BR: `"created_sent_to_payments": "Matrícula registrada. Ela aparece aqui quando Pagos confirmar o pagamento."`
- en: `"created_sent_to_payments": "Enrollment recorded. It shows up here once Payments confirms the payment."`

Remover as chaves que ficaram sem leitor (`enrollments.metric_reserved*`, `enrollments.metric_released*`, `reservations.*`, abas) — `pnpm lint` e `rg "reservations\." apps/app/src` confirmam.

- [ ] **Step 5: Verificar**

Run: `pnpm typecheck:app && pnpm --filter @ooc/app lint`
Expected: PASS, sem `no-literal-string`.

- [ ] **Step 6: Commit**

```bash
git add -A apps/app
git commit -m "feat(app): enrollments and students screens show only who got in (OOC-55)"
```

---

### Task 4: Caso de uso de liquidação do pagamento (domínio)

**Files:**
- Create: `packages/domain/src/enrollment/PaymentSettlement.ts`
- Create: `packages/domain/src/enrollment/SettlePaymentUseCase.ts`
- Modify: `packages/domain/src/enrollment/errors.ts`
- Modify: `packages/domain/src/notification/enrollmentEmails.ts`
- Modify: `packages/domain/src/index.ts`
- Test: `apps/api/src/tests/settle-payment.test.ts`

**Interfaces:**
- Produces:

```ts
// PaymentSettlement.ts
export const PaymentRejectionReasonSchema = z.enum(["amount_mismatch", "illegible", "duplicate", "not_a_receipt", "other"]);
export type PaymentRejectionReason = z.infer<typeof PaymentRejectionReasonSchema>;
export type PaymentDecision = { kind: "approve" } | { kind: "reject"; reason: PaymentRejectionReason; note: string };
export interface PaymentToSettle {
  paymentId: string; enrollmentId: string; studentId: string; classGroupId: string;
  status: PaymentStatus; seatStatus: SeatStatus;
}
export interface IPaymentSettlementRepository {
  findForSettlement(paymentId: string): Promise<PaymentToSettle | null>;
  settle(params: {
    paymentId: string; enrollmentId: string; classGroupId: string;
    to: "approved" | "rejected";
    notifications: EmailNotification[];
    audit: AuditLogEntry;
  }): Promise<{ seatStatus: SeatStatus }>;
}
// SettlePaymentUseCase.ts
export interface SettlePaymentInput { actorId: string; paymentId: string; decision: PaymentDecision }
export interface SettlePaymentOutput { paymentId: string; status: "approved" | "rejected"; seatStatus: SeatStatus }
// errors.ts
PaymentNotFoundError (404, "payment.not_found")
PaymentAlreadySettledError (409, "payment.already_settled")
PaymentSeatReleasedError (409, "payment.seat_released")
// enrollmentEmails.ts
export interface PaymentEmailFacts { paymentId: string; student: ...; guardian: ...; courseName: string; classGroupStartsOn: Date }
export function paymentApprovedEmails(facts: PaymentEmailFacts, locale: Locale): EmailNotification[]
export function paymentRejectedEmails(facts: PaymentEmailFacts, locale: Locale): EmailNotification[]
```

- [ ] **Step 1: Escrever o teste (fakes, sem banco)**

```ts
import {
  PaymentAlreadySettledError,
  PaymentNotFoundError,
  PaymentSeatReleasedError,
  SettlePaymentUseCase,
  type EnrollmentEmailContext,
  type IEnrollmentEmailContextLookup,
  type IPaymentSettlementRepository,
  type PaymentToSettle,
} from "@ooc/domain";
import { beforeEach, describe, expect, it } from "vitest";

/**
 * Payments is where an enrollment is finished (OOC-55): approving confirms
 * the seat, rejecting hands it back. The usecase decides; the repository
 * makes it atomic. Pure domain here — fakes, no database.
 */

const ACTOR = "usr_billing";
const PAYMENT = "018f2b5c-0000-7000-8000-00000000p001";

class FakeSettlementRepository implements IPaymentSettlementRepository {
  public settled: Parameters<IPaymentSettlementRepository["settle"]>[0][] = [];
  constructor(public target: PaymentToSettle | null) {}

  async findForSettlement(): Promise<PaymentToSettle | null> {
    return this.target;
  }

  async settle(params: Parameters<IPaymentSettlementRepository["settle"]>[0]) {
    this.settled.push(params);
    const seatStatus =
      this.target!.seatStatus === "reserved" ? (params.to === "approved" ? "confirmed" : "released") : this.target!.seatStatus;
    return { seatStatus };
  }
}

class FakeEmailContextLookup implements IEnrollmentEmailContextLookup {
  constructor(private readonly context: EnrollmentEmailContext | null) {}
  async find() {
    return this.context;
  }
}

const MINOR_CONTEXT: EnrollmentEmailContext = {
  student: { firstName: "Ana", lastName: "Quispe", email: "ana@gmail.com", birthDate: new Date("2014-05-01T00:00:00.000Z") },
  guardian: { firstName: "Rosa", email: "rosa@example.com" },
  courseName: "Inglés Básico",
  classGroupStartsOn: new Date("2026-11-02T00:00:00.000Z"),
};

function target(overrides: Partial<PaymentToSettle> = {}): PaymentToSettle {
  return {
    paymentId: PAYMENT,
    enrollmentId: "018f2b5c-0000-7000-8000-00000000e001",
    studentId: "018f2b5c-0000-7000-8000-00000000s001",
    classGroupId: "018f2b5c-0000-7000-8000-00000000g001",
    status: "pending",
    seatStatus: "reserved",
    ...overrides,
  };
}

let repository: FakeSettlementRepository;
let useCase: SettlePaymentUseCase;

beforeEach(() => {
  repository = new FakeSettlementRepository(target());
  useCase = new SettlePaymentUseCase(repository, new FakeEmailContextLookup(MINOR_CONTEXT));
});

describe("SettlePaymentUseCase", () => {
  it("approves an open payment and confirms the seat", async () => {
    const result = await useCase.run({ actorId: ACTOR, paymentId: PAYMENT, decision: { kind: "approve" } });

    expect(result).toEqual({ paymentId: PAYMENT, status: "approved", seatStatus: "confirmed" });
    expect(repository.settled[0]!.to).toBe("approved");
    expect(repository.settled[0]!.audit).toMatchObject({ actorId: ACTOR, action: "payment.approved", targetId: PAYMENT });
  });

  it("tells the student and, for a minor, the guardian", async () => {
    await useCase.run({ actorId: ACTOR, paymentId: PAYMENT, decision: { kind: "approve" } });

    const emails = repository.settled[0]!.notifications;
    expect(emails.map((email) => [email.templateKey, email.to])).toEqual([
      ["payment_approved", "ana@gmail.com"],
      ["payment_approved", "rosa@example.com"],
    ]);
    expect(emails.every((email) => email.locale === "es-PE")).toBe(true);
  });

  it("rejects with a reason and the note in the audit trail", async () => {
    const result = await useCase.run({
      actorId: ACTOR,
      paymentId: PAYMENT,
      decision: { kind: "reject", reason: "amount_mismatch", note: "Pagó S/ 50" },
    });

    expect(result.status).toBe("rejected");
    expect(result.seatStatus).toBe("released");
    expect(repository.settled[0]!.audit.metadata).toMatchObject({ reason: "amount_mismatch", note: "Pagó S/ 50" });
    expect(repository.settled[0]!.notifications[0]!.templateKey).toBe("payment_rejected");
  });

  it("refuses a payment that does not exist", async () => {
    repository.target = null;

    await expect(useCase.run({ actorId: ACTOR, paymentId: PAYMENT, decision: { kind: "approve" } })).rejects.toBeInstanceOf(
      PaymentNotFoundError,
    );
  });

  it.each(["approved", "rejected"] as const)("refuses a payment already %s", async (status) => {
    repository.target = target({ status });

    await expect(useCase.run({ actorId: ACTOR, paymentId: PAYMENT, decision: { kind: "approve" } })).rejects.toBeInstanceOf(
      PaymentAlreadySettledError,
    );
    expect(repository.settled).toHaveLength(0);
  });

  it("refuses to approve money for a seat already handed back", async () => {
    repository.target = target({ seatStatus: "released" });

    await expect(useCase.run({ actorId: ACTOR, paymentId: PAYMENT, decision: { kind: "approve" } })).rejects.toBeInstanceOf(
      PaymentSeatReleasedError,
    );
  });

  it("still rejects when the seat is already gone — the money question stays open otherwise", async () => {
    repository.target = target({ seatStatus: "released" });

    const result = await useCase.run({
      actorId: ACTOR,
      paymentId: PAYMENT,
      decision: { kind: "reject", reason: "other", note: "" },
    });

    expect(result).toMatchObject({ status: "rejected", seatStatus: "released" });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @ooc/api test -- settle-payment`
Expected: FAIL — `SettlePaymentUseCase` não exportado.

- [ ] **Step 3: Erros** — em `packages/domain/src/enrollment/errors.ts` (importar `ConflictError` de `../shared/base/errors/ConflictError.js`):

```ts
export class PaymentNotFoundError extends NotFoundError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({ reason: "payment.not_found", message: "No payment with that id.", ...params });
  }
}

/** Somebody — or the same click twice — already decided this payment. */
export class PaymentAlreadySettledError extends ConflictError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({ reason: "payment.already_settled", message: "The payment was already approved or rejected.", ...params });
  }
}

/** Approving money for a seat that was already handed back would enroll
 * somebody into a place another student may now hold. */
export class PaymentSeatReleasedError extends ConflictError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({ reason: "payment.seat_released", message: "The enrollment's seat was already released.", ...params });
  }
}
```

- [ ] **Step 4: E-mails** — em `enrollmentEmails.ts`, mudar a assinatura de `enrollmentRecipients` para `(facts: Pick<EnrollmentEmailFacts, "student" | "guardian">)` e acrescentar:

```ts
/** What a payment decision e-mail needs — the enrollment's people and course,
 * keyed by the payment so a second decision e-mail can never be emitted. */
export interface PaymentEmailFacts {
  paymentId: string;
  student: EnrollmentEmailFacts["student"];
  guardian: EnrollmentEmailFacts["guardian"];
  courseName: string;
  classGroupStartsOn: Date;
}

/** "Your payment was approved" — the enrollment is now real (OOC-55). */
export function paymentApprovedEmails(facts: PaymentEmailFacts, locale: Locale): EmailNotification[] {
  const studentName = `${facts.student.firstName} ${facts.student.lastName}`;

  return enrollmentRecipients(facts).map((recipient) => ({
    templateKey: "payment_approved",
    to: recipient.to,
    locale,
    vars: {
      recipientName: recipient.name,
      studentName,
      courseName: facts.courseName,
      startsOn: facts.classGroupStartsOn.toISOString(),
    },
    dedupeKey: `payment_approved:${facts.paymentId}:${recipient.kind}`,
  }));
}

/** "Your payment could not be confirmed" — the seat went back to the class group. */
export function paymentRejectedEmails(facts: PaymentEmailFacts, locale: Locale): EmailNotification[] {
  const studentName = `${facts.student.firstName} ${facts.student.lastName}`;

  return enrollmentRecipients(facts).map((recipient) => ({
    templateKey: "payment_rejected",
    to: recipient.to,
    locale,
    vars: { recipientName: recipient.name, studentName, courseName: facts.courseName },
    dedupeKey: `payment_rejected:${facts.paymentId}:${recipient.kind}`,
  }));
}
```

- [ ] **Step 5: `PaymentSettlement.ts`** — exatamente as declarações do bloco **Interfaces** acima, com imports `z` de `zod`, `AuditLogEntry` de `../identity/ports/IAuditLogRepository.js`, `EmailNotification` de `../notification/EmailNotification.js`, `PaymentStatus` de `./Payment.js`, `SeatStatus` de `./Enrollment.js`. JSDoc no `settle`: "One short transaction: the payment moves only out of `pending`/`under_review` (zero rows → `PaymentAlreadySettledError`); approving confirms a reserved seat and refuses a released one (`PaymentSeatReleasedError`); rejecting releases a reserved seat and gives it back to the class group; a confirmed seat (a monthly module) is left alone either way. Outbox and audit entry in the same transaction."

- [ ] **Step 6: `SettlePaymentUseCase.ts`**

```ts
import { DEFAULT_LOCALE } from "../notification/EmailNotification.js";
import { paymentApprovedEmails, paymentRejectedEmails } from "../notification/enrollmentEmails.js";
import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import type { SeatStatus } from "./Enrollment.js";
import type { IEnrollmentEmailContextLookup } from "./EnrollmentEmailContextLookup.js";
import { PaymentAlreadySettledError, PaymentNotFoundError, PaymentSeatReleasedError } from "./errors.js";
import type { IPaymentSettlementRepository, PaymentDecision } from "./PaymentSettlement.js";

export interface SettlePaymentInput {
  actorId: string;
  paymentId: string;
  decision: PaymentDecision;
}

export interface SettlePaymentOutput {
  paymentId: string;
  status: "approved" | "rejected";
  seatStatus: SeatStatus;
}

/**
 * Where an enrollment is finished (OOC-55): a person in Payments looks at the
 * receipt and decides. Approving confirms the seat — only now is the student
 * enrolled; rejecting hands the seat back to the class group. Never automatic
 * and never from the enrollment screen: whoever opens a manual enrollment is
 * not who settles its money (CLAUDE.md §1, lock (d)).
 *
 * The e-mail goes out in es-PE: the enrollment does not record the language
 * its form was filled in.
 */
export class SettlePaymentUseCase extends BaseUseCase<SettlePaymentInput, SettlePaymentOutput> {
  constructor(
    private readonly settlements: IPaymentSettlementRepository,
    private readonly emailContextLookup: IEnrollmentEmailContextLookup,
  ) {
    super();
  }

  async run(input: SettlePaymentInput): Promise<SettlePaymentOutput> {
    const target = await this.settlements.findForSettlement(input.paymentId);
    if (!target) throw new PaymentNotFoundError();
    if (target.status === "approved" || target.status === "rejected") throw new PaymentAlreadySettledError();

    const approving = input.decision.kind === "approve";
    if (approving && target.seatStatus === "released") throw new PaymentSeatReleasedError();

    const context = await this.emailContextLookup.find({
      studentId: target.studentId,
      classGroupId: target.classGroupId,
    });
    const facts = context ? { paymentId: target.paymentId, ...context } : null;
    const notifications = facts
      ? approving
        ? paymentApprovedEmails(facts, DEFAULT_LOCALE)
        : paymentRejectedEmails(facts, DEFAULT_LOCALE)
      : [];

    const to = approving ? "approved" : "rejected";
    const { seatStatus } = await this.settlements.settle({
      paymentId: target.paymentId,
      enrollmentId: target.enrollmentId,
      classGroupId: target.classGroupId,
      to,
      notifications,
      audit: {
        actorId: input.actorId,
        action: approving ? "payment.approved" : "payment.rejected",
        targetId: target.paymentId,
        metadata:
          input.decision.kind === "reject"
            ? { enrollmentId: target.enrollmentId, reason: input.decision.reason, note: input.decision.note }
            : { enrollmentId: target.enrollmentId },
        at: new Date(),
      },
    });

    return { paymentId: target.paymentId, status: to, seatStatus };
  }
}
```

- [ ] **Step 7: Exports** — em `packages/domain/src/index.ts`, junto dos exports de enrollment:

```ts
export {
  PaymentRejectionReasonSchema,
  type PaymentRejectionReason,
  type PaymentDecision,
  type PaymentToSettle,
  type IPaymentSettlementRepository,
} from "./enrollment/PaymentSettlement.js";
export { SettlePaymentUseCase, type SettlePaymentInput, type SettlePaymentOutput } from "./enrollment/SettlePaymentUseCase.js";
```

e acrescentar `PaymentNotFoundError, PaymentAlreadySettledError, PaymentSeatReleasedError` ao bloco que já reexporta `./enrollment/errors.js`, e `paymentApprovedEmails, paymentRejectedEmails, type PaymentEmailFacts` ao bloco de `./notification/enrollmentEmails.js`.

- [ ] **Step 8: Rodar testes e typecheck**

Run: `pnpm typecheck:domain && pnpm --filter @ooc/api test -- settle-payment enrollment-emails`
Expected: PASS (inclusive o teste de e-mails existente, que não deve quebrar com a assinatura alargada).

- [ ] **Step 9: Commit**

```bash
git add packages/domain/src apps/api/src/tests/settle-payment.test.ts
git commit -m "feat(domain): settle a payment and finish or release its enrollment (OOC-55)"
```

---

### Task 5: Repositório de liquidação no Postgres

**Files:**
- Create: `apps/api/src/infra/persistence/payment/DrizzlePaymentSettlementRepository.ts`
- Test: `apps/api/src/infra/persistence/payment/DrizzlePaymentSettlementRepository.integration.test.ts`

**Interfaces:**
- Consumes: `IPaymentSettlementRepository`, erros da Task 4; `insertOutboxEmails(tx, notifications)` de `@/infra/persistence/notification/DrizzleOutboxRepository.js`.
- Produces: `class DrizzlePaymentSettlementRepository implements IPaymentSettlementRepository { constructor(db: Db) }`.

- [ ] **Step 1: Escrever o teste** (padrão de `DrizzleReceiptScreeningRepository.integration.test.ts`: transação sempre revertida, repositório recebe o `tx`, a transação dele vira savepoint)

```ts
import * as schema from "@ooc/db";
import { academicPeriods, auditLog, classGroups, courses, enrollments, outbox, payments, planPrices, plans, students } from "@ooc/db";
import { PaymentAlreadySettledError, PaymentSeatReleasedError, type AuditLogEntry } from "@ooc/domain";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/infra/db/client.js";
import { DrizzlePaymentSettlementRepository } from "./DrizzlePaymentSettlementRepository.js";

/**
 * The SQL that finishes an enrollment (OOC-55): the conditional UPDATEs are
 * the whole guard against two reviewers deciding the same payment, and the
 * seat counter has to come back exactly once on a rejection.
 *
 * `payments`, `students` and `audit_log` are under the delete lock (0011):
 * every test runs in a transaction that is always rolled back.
 */

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required: this suite exercises the payment settlement SQL against a real, migrated Postgres.");
}

const PERIOD = "018f2b5c-8000-7000-8000-000000000001";
const COURSE = "018f2b5c-8000-7000-8000-000000000002";
const PLAN = "018f2b5c-8000-7000-8000-000000000003";
const PLAN_PRICE = "018f2b5c-8000-7000-8000-000000000004";
const GROUP = "018f2b5c-8000-7000-8000-000000000005";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
class RolledBack extends Error {}

let pool: pg.Pool;
let db: Db;

beforeAll(() => {
  pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
  db = drizzle(pool, { schema, casing: "snake_case" });
});

afterAll(async () => {
  await pool.end();
});

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
    name: "Ciclo de prueba (settlement integration)",
    startsOn: new Date("2026-03-01T00:00:00.000Z"),
    endsOn: new Date("2026-07-31T00:00:00.000Z"),
  });
  await tx.insert(courses).values({ id: COURSE, name: "Curso (settlement integration)", language: "Prueba", minAge: 12 });
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
    seatsTaken: 1,
  });
}

let sequence = 0;

/** What a submit leaves behind: a student, a reserved seat and an open payment. */
async function openPayment(
  tx: Tx,
  params: { seatStatus?: "reserved" | "confirmed" | "released"; status?: string } = {},
): Promise<{ paymentId: string; enrollmentId: string }> {
  sequence += 1;
  const [student] = await tx
    .insert(students)
    .values({
      firstName: "Pago",
      lastName: `Liquidacion${sequence}`,
      nationalIdType: "DNI",
      nationalId: `SETTLE${sequence}`,
      email: `settle.${sequence}@gmail.com`,
      phone: "+51900000000",
      birthDate: new Date("2000-01-01T00:00:00.000Z"),
      country: "PE",
      city: "Lima",
    })
    .returning({ id: students.id });
  const [enrollment] = await tx
    .insert(enrollments)
    .values({ studentId: student!.id, classGroupId: GROUP, planPriceId: PLAN_PRICE, seatStatus: params.seatStatus ?? "reserved" })
    .returning({ id: enrollments.id });
  const [payment] = await tx
    .insert(payments)
    .values({
      enrollmentId: enrollment!.id,
      idempotencyKey: `settle-integration-${sequence}-${Date.now()}`,
      status: params.status ?? "pending",
      method: "yape",
      amountCents: 15000,
      operationNumber: `OPSETTLE${sequence}${Date.now()}`,
    })
    .returning({ id: payments.id });
  return { paymentId: payment!.id, enrollmentId: enrollment!.id };
}

function audit(paymentId: string, action: string): AuditLogEntry {
  return { actorId: "usr_billing", action, targetId: paymentId, metadata: { test: true }, at: new Date() };
}

async function seatsTaken(tx: Tx): Promise<number> {
  const [row] = await tx.select({ value: classGroups.seatsTaken }).from(classGroups).where(eq(classGroups.id, GROUP));
  return row!.value;
}

describe("DrizzlePaymentSettlementRepository", () => {
  it("reads what the usecase needs to decide", async () => {
    await rolledBack(async (tx) => {
      const repository = new DrizzlePaymentSettlementRepository(tx as unknown as Db);
      const { paymentId, enrollmentId } = await openPayment(tx);

      const found = await repository.findForSettlement(paymentId);

      expect(found).toMatchObject({ paymentId, enrollmentId, classGroupId: GROUP, status: "pending", seatStatus: "reserved" });
    });
  });

  it("approving confirms the seat, writes the audit entry and the e-mail", async () => {
    await rolledBack(async (tx) => {
      const repository = new DrizzlePaymentSettlementRepository(tx as unknown as Db);
      const { paymentId, enrollmentId } = await openPayment(tx);

      const result = await repository.settle({
        paymentId,
        enrollmentId,
        classGroupId: GROUP,
        to: "approved",
        notifications: [
          {
            templateKey: "payment_approved",
            to: "settle@gmail.com",
            locale: "es-PE",
            vars: { recipientName: "Pago", studentName: "Pago L", courseName: "Curso", startsOn: "2026-03-02T00:00:00.000Z" },
            dedupeKey: `payment_approved:${paymentId}:student`,
          },
        ],
        audit: audit(paymentId, "payment.approved"),
      });

      expect(result.seatStatus).toBe("confirmed");
      const [payment] = await tx.select({ status: payments.status }).from(payments).where(eq(payments.id, paymentId));
      expect(payment!.status).toBe("approved");
      const entries = await tx.select().from(auditLog).where(eq(auditLog.targetId, paymentId));
      expect(entries.map((entry) => entry.action)).toEqual(["payment.approved"]);
      const mails = await tx.select().from(outbox).where(eq(outbox.dedupeKey, `payment_approved:${paymentId}:student`));
      expect(mails).toHaveLength(1);
      expect(await seatsTaken(tx)).toBe(1);
    });
  });

  it("rejecting releases the seat and gives it back to the class group once", async () => {
    await rolledBack(async (tx) => {
      const repository = new DrizzlePaymentSettlementRepository(tx as unknown as Db);
      const { paymentId, enrollmentId } = await openPayment(tx);

      const result = await repository.settle({
        paymentId,
        enrollmentId,
        classGroupId: GROUP,
        to: "rejected",
        notifications: [],
        audit: audit(paymentId, "payment.rejected"),
      });

      expect(result.seatStatus).toBe("released");
      expect(await seatsTaken(tx)).toBe(0);
    });
  });

  it("a second decision on the same payment is refused and changes nothing", async () => {
    await rolledBack(async (tx) => {
      const repository = new DrizzlePaymentSettlementRepository(tx as unknown as Db);
      const { paymentId, enrollmentId } = await openPayment(tx);
      const params = { paymentId, enrollmentId, classGroupId: GROUP, notifications: [] };

      await repository.settle({ ...params, to: "rejected", audit: audit(paymentId, "payment.rejected") });
      await expect(
        repository.settle({ ...params, to: "approved", audit: audit(paymentId, "payment.approved") }),
      ).rejects.toBeInstanceOf(PaymentAlreadySettledError);

      const [payment] = await tx.select({ status: payments.status }).from(payments).where(eq(payments.id, paymentId));
      expect(payment!.status).toBe("rejected");
      expect(await seatsTaken(tx)).toBe(0);
    });
  });

  it("refuses to approve over a released seat and rolls the payment back", async () => {
    await rolledBack(async (tx) => {
      const repository = new DrizzlePaymentSettlementRepository(tx as unknown as Db);
      const { paymentId, enrollmentId } = await openPayment(tx, { seatStatus: "released" });

      await expect(
        repository.settle({
          paymentId,
          enrollmentId,
          classGroupId: GROUP,
          to: "approved",
          notifications: [],
          audit: audit(paymentId, "payment.approved"),
        }),
      ).rejects.toBeInstanceOf(PaymentSeatReleasedError);

      const [payment] = await tx.select({ status: payments.status }).from(payments).where(eq(payments.id, paymentId));
      expect(payment!.status).toBe("pending");
    });
  });

  it("a confirmed seat (a monthly module) is left alone when its payment is rejected", async () => {
    await rolledBack(async (tx) => {
      const repository = new DrizzlePaymentSettlementRepository(tx as unknown as Db);
      const { paymentId, enrollmentId } = await openPayment(tx, { seatStatus: "confirmed" });

      const result = await repository.settle({
        paymentId,
        enrollmentId,
        classGroupId: GROUP,
        to: "rejected",
        notifications: [],
        audit: audit(paymentId, "payment.rejected"),
      });

      expect(result.seatStatus).toBe("confirmed");
      expect(await seatsTaken(tx)).toBe(1);
    });
  });
});
```

Nota: o teste de aprovação usa um `EmailNotification` qualquer só para provar que o outbox é escrito na mesma transação; o conteúdo do e-mail é coberto pela Task 4.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @ooc/api test:db -- DrizzlePaymentSettlementRepository`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

```ts
import {
  PaymentAlreadySettledError,
  PaymentSeatReleasedError,
  type IPaymentSettlementRepository,
  type PaymentStatus,
  type PaymentToSettle,
  type SeatStatus,
} from "@ooc/domain";
import { auditLog, classGroups, enrollments, payments } from "@ooc/db";
import { and, eq, gt, inArray, sql } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";
import { insertOutboxEmails } from "@/infra/persistence/notification/DrizzleOutboxRepository.js";

const OPEN: PaymentStatus[] = ["pending", "under_review"];

export class DrizzlePaymentSettlementRepository implements IPaymentSettlementRepository {
  constructor(private readonly db: Db) {}

  async findForSettlement(paymentId: string): Promise<PaymentToSettle | null> {
    const [row] = await this.db
      .select({
        paymentId: payments.id,
        enrollmentId: enrollments.id,
        studentId: enrollments.studentId,
        classGroupId: enrollments.classGroupId,
        status: payments.status,
        seatStatus: enrollments.seatStatus,
      })
      .from(payments)
      .innerJoin(enrollments, eq(enrollments.id, payments.enrollmentId))
      .where(eq(payments.id, paymentId));

    return row ? { ...row, status: row.status as PaymentStatus, seatStatus: row.seatStatus as SeatStatus } : null;
  }

  async settle(params: Parameters<IPaymentSettlementRepository["settle"]>[0]): Promise<{ seatStatus: SeatStatus }> {
    return this.db.transaction(async (tx) => {
      // The guard against two reviewers (or one double click): the payment
      // only moves out of an open state, and Postgres serialises the two
      // UPDATEs on the row lock — the second sees the first's status.
      const [moved] = await tx
        .update(payments)
        .set({ status: params.to, updatedAt: sql`now()` })
        .where(and(eq(payments.id, params.paymentId), inArray(payments.status, OPEN)))
        .returning({ id: payments.id });
      if (!moved) throw new PaymentAlreadySettledError();

      const seatStatus = params.to === "approved" ? await this.confirmSeat(tx, params) : await this.releaseSeat(tx, params);

      await insertOutboxEmails(tx, params.notifications);
      await tx.insert(auditLog).values({
        actorId: params.audit.actorId,
        action: params.audit.action,
        targetId: params.audit.targetId,
        metadata: params.audit.metadata ?? null,
        createdAt: params.audit.at,
      });

      return { seatStatus };
    });
  }

  /** reserved → confirmed. Already confirmed (a monthly module) stays; released refuses. */
  private async confirmSeat(tx: Tx, params: { enrollmentId: string }): Promise<SeatStatus> {
    const [confirmed] = await tx
      .update(enrollments)
      .set({ seatStatus: "confirmed", updatedAt: sql`now()` })
      .where(and(eq(enrollments.id, params.enrollmentId), eq(enrollments.seatStatus, "reserved")))
      .returning({ id: enrollments.id });
    if (confirmed) return "confirmed";

    const current = await this.currentSeat(tx, params.enrollmentId);
    if (current !== "confirmed") throw new PaymentSeatReleasedError();
    return current;
  }

  /** reserved → released, and the seat goes back to the class group in the same
   * transaction. Any other seat is left as it is. */
  private async releaseSeat(tx: Tx, params: { enrollmentId: string; classGroupId: string }): Promise<SeatStatus> {
    const [released] = await tx
      .update(enrollments)
      .set({ seatStatus: "released", updatedAt: sql`now()` })
      .where(and(eq(enrollments.id, params.enrollmentId), eq(enrollments.seatStatus, "reserved")))
      .returning({ id: enrollments.id });
    if (!released) return this.currentSeat(tx, params.enrollmentId);

    await tx
      .update(classGroups)
      .set({ seatsTaken: sql`${classGroups.seatsTaken} - 1` })
      .where(and(eq(classGroups.id, params.classGroupId), gt(classGroups.seatsTaken, 0)));
    return "released";
  }

  private async currentSeat(tx: Tx, enrollmentId: string): Promise<SeatStatus> {
    const [row] = await tx
      .select({ seatStatus: enrollments.seatStatus })
      .from(enrollments)
      .where(eq(enrollments.id, enrollmentId));
    return row!.seatStatus as SeatStatus;
  }
}

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
```

- [ ] **Step 4: Rodar testes**

Run: `pnpm --filter @ooc/api test:db -- DrizzlePaymentSettlementRepository` e `pnpm typecheck:api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/infra/persistence/payment/
git commit -m "feat(api): settle a payment, its seat, outbox and audit in one transaction (OOC-55)"
```

---

### Task 6: Leituras de Pagos — livro e fila

**Files:**
- Create: `apps/api/src/infra/persistence/payment/ListPaymentsQuery.ts`
- Create: `apps/api/src/infra/persistence/payment/ListPaymentReviewQueueQuery.ts`
- Test: `apps/api/src/infra/persistence/payment/PaymentQueries.integration.test.ts`

**Interfaces:**
- Produces:

```ts
// ListPaymentsQuery.ts
export const PAYMENTS_PAGE_SIZE = 15;
export type PaymentListStatus = "pending" | "under_review" | "approved" | "rejected";
export interface PaymentListFilters {
  status?: PaymentListStatus; method?: PaymentMethod; academicPeriodId?: string;
  q?: string; sort?: "newest" | "oldest"; page?: number;
}
export interface PaymentListRow {
  id: string; enrollmentId: string; studentId: string; studentName: string; courseName: string;
  status: PaymentListStatus; method: PaymentMethod; methodDetail: string | null; operationNumber: string | null;
  amountCents: number; expectedAmountCents: number; currency: "PEN";
  submittedAt: Date; decidedAt: Date | null; decidedByName: string | null;
}
export interface PaymentListMetrics {
  periodName: string; inReview: number; oldestOpenHours: number | null;
  approved: number; collectedCents: number; rejected: number;
}
export interface PaymentListResult { items: PaymentListRow[]; total: number; page: number; pageSize: number; metrics: PaymentListMetrics }
export class ListPaymentsQuery { constructor(db: Db); run(filters?: PaymentListFilters): Promise<PaymentListResult> }

// ListPaymentReviewQueueQuery.ts
export const REVIEW_WINDOW_DAYS = 5;
export type ReviewReceiptState = "missing" | "uploading" | "ready" | "refused";
export interface PaymentReviewItem {
  id: string; enrollmentId: string; studentId: string; studentName: string;
  courseName: string; classGroupName: string; planName: string;
  status: "pending" | "under_review";
  method: PaymentMethod; methodDetail: string | null; operationNumber: string | null;
  expectedAmountCents: number; currency: "PEN";
  receipt: ReviewReceiptState;
  fraudSignals: ReceiptFraudSignalKind[];
  submittedAt: Date; reviewDeadline: Date;
}
export interface PaymentReviewQueue { items: PaymentReviewItem[]; total: number; page: number; pageSize: number }
export class ListPaymentReviewQueueQuery { constructor(db: Db); run(filters?: { q?: string; academicPeriodId?: string; page?: number }): Promise<PaymentReviewQueue> }
```

- `receipt`: da última `receipt_uploads` do pagamento — nenhuma → `missing`; `pending`/`uploaded` → `uploading`; `processed` → `ready`; `rejected` → `refused`.
- `fraudSignals`: `kind` de cada sinal em `receipt_uploads.fraud_signals` daquela linha, sem duplicata, na ordem gravada (só o tipo — o detalhe carrega ids de outro aluno).
- `reviewDeadline = submittedAt + REVIEW_WINDOW_DAYS`.
- `decidedAt`/`decidedByName`: do `audit_log` mais recente com `target_id = payment.id` e `action in ('payment.approved','payment.rejected')`; nome via `(select "name" from "user" where "id" = audit_log.actor_id)` (tabela do Better Auth, SQL cru como em `DrizzleStaffUserLookup`).
- Métricas sobre o período corrente (o mais recente já iniciado e não aposentado, mesma regra de `ListEnrollmentsQuery.metrics`), via join `payments → enrollments → class_groups`: `inReview` = abertos, `oldestOpenHours` = horas desde o `created_at` do aberto mais antigo (null se nenhum), `approved`/`rejected` = contagens, `collectedCents` = soma de `amount_cents` aprovados.
- Ordem do livro: `created_at` desc (ou asc com `sort=oldest`), desempate por id. Fila: sempre `created_at` asc.
- Busca `q` (ILIKE): nome do aluno, curso, nº de operação. Filtros aplicados no Postgres.
- Só matrícula não aposentada (`enrollments.deleted_at is null`).

- [ ] **Step 1: Escrever o teste**

Seed (transação revertida, mesmo `rolledBack`/`seedCatalog` da Task 5 com ids `018f2b5c-9000-…`) com quatro pagamentos no período do teste: `pending` sem upload, `under_review` com upload `processed` e `fraud_signals = [{"kind":"identical_file","receiptUploadId":"…","paymentId":"…"}]`, `approved` (com linha em `audit_log` `payment.approved`), `rejected`. Para `receipt_uploads` é preciso uma `seat_holds` (`status: "consumed"`, `enrollmentId`, `settledAt: new Date()`, `expiresAt: new Date()`, `origin: "web"`) e `objectKey`/`processedObjectKey` únicos.

```ts
describe("ListPaymentReviewQueueQuery", () => {
  it("lists only open payments, oldest first, with receipt state, signals and deadline", async () => {
    await rolledBack(async (tx) => {
      const seeded = await seedPayments(tx);
      const queue = await new ListPaymentReviewQueueQuery(tx as unknown as Db).run({ academicPeriodId: PERIOD });

      expect(queue.items.map((item) => item.id)).toEqual([seeded.pending, seeded.underReview]);
      expect(queue.items[0]!.receipt).toBe("missing");
      expect(queue.items[1]!.receipt).toBe("ready");
      expect(queue.items[1]!.fraudSignals).toEqual(["identical_file"]);
      const item = queue.items[0]!;
      expect(item.reviewDeadline.getTime() - item.submittedAt.getTime()).toBe(REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);
      expect(item.expectedAmountCents).toBe(15000);
    });
  });
});

describe("ListPaymentsQuery", () => {
  it("lists every payment of the period, newest first", async () => {
    await rolledBack(async (tx) => {
      const seeded = await seedPayments(tx);
      const ledger = await new ListPaymentsQuery(tx as unknown as Db).run({ academicPeriodId: PERIOD });

      expect(ledger.total).toBe(4);
      expect(ledger.items.map((row) => row.id)).toEqual([seeded.rejected, seeded.approved, seeded.underReview, seeded.pending]);
    });
  });

  it("filters by status in Postgres", async () => {
    await rolledBack(async (tx) => {
      const seeded = await seedPayments(tx);
      const ledger = await new ListPaymentsQuery(tx as unknown as Db).run({ academicPeriodId: PERIOD, status: "approved" });

      expect(ledger.items.map((row) => row.id)).toEqual([seeded.approved]);
    });
  });

  it("names who decided and when, from the audit trail", async () => {
    await rolledBack(async (tx) => {
      const seeded = await seedPayments(tx);
      const ledger = await new ListPaymentsQuery(tx as unknown as Db).run({ academicPeriodId: PERIOD, status: "approved" });

      expect(ledger.items[0]!.decidedAt).not.toBeNull();
      // The actor id in the seed matches no Better Auth user: the name is null, not an error.
      expect(ledger.items[0]!.decidedByName).toBeNull();
      expect(ledger.items[0]!.id).toBe(seeded.approved);
    });
  });

  it("finds a payment by its operation number", async () => {
    await rolledBack(async (tx) => {
      const seeded = await seedPayments(tx);
      const ledger = await new ListPaymentsQuery(tx as unknown as Db).run({ academicPeriodId: PERIOD, q: seeded.operationOf.approved });

      expect(ledger.items.map((row) => row.id)).toEqual([seeded.approved]);
    });
  });
});
```

`seedPayments(tx)` devolve `{ pending, underReview, approved, rejected, operationOf }` e cria os pagamentos com `createdAt` um minuto à parte, nessa ordem (pending mais antigo).

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @ooc/api test:db -- PaymentQueries`
Expected: FAIL — módulos não existem.

- [ ] **Step 3: Implementar `ListPaymentReviewQueueQuery`**

Estrutura: `select` de `payments` com `innerJoin` `enrollments`, `students`, `classGroups`, `courses`, `planPrices`, `plans`; `leftJoin` num subquery `latest_upload` (`selectDistinctOn([receiptUploads.paymentId], { paymentId, status, fraudSignals }).from(receiptUploads).where(isNotNull(receiptUploads.paymentId)).orderBy(receiptUploads.paymentId, desc(receiptUploads.createdAt))`); `where` = `inArray(payments.status, ["pending","under_review"])`, `isNull(enrollments.deletedAt)`, filtro de período e `q`; `orderBy(asc(payments.createdAt), asc(payments.id))`; `limit(PAYMENTS_PAGE_SIZE)`/`offset`. Total com o mesmo `where` (`count(*)`). Mapeamento:

```ts
function receiptState(status: string | null): ReviewReceiptState {
  if (status === null) return "missing";
  if (status === "processed") return "ready";
  if (status === "rejected") return "refused";
  return "uploading";
}

function signalKinds(raw: unknown): ReceiptFraudSignalKind[] {
  if (!Array.isArray(raw)) return [];
  const kinds = raw.map((signal) => (signal as { kind?: unknown }).kind).filter((kind): kind is ReceiptFraudSignalKind => typeof kind === "string");
  return [...new Set(kinds)];
}
```

`classGroupName = classGroupCode || schedule` (mesma regra do livro de matrículas); `planName = plans.name`; `expectedAmountCents = planPrices.amountCents`.

- [ ] **Step 4: Implementar `ListPaymentsQuery`**

Mesmos joins (sem upload) + `leftJoin` num subquery `decision` (`selectDistinctOn([auditLog.targetId], { targetId, actorId, createdAt }).from(auditLog).where(inArray(auditLog.action, ["payment.approved","payment.rejected"])).orderBy(auditLog.targetId, desc(auditLog.createdAt))`) com `eq(decision.targetId, sql\`${payments.id}::text\`)` (o `target_id` é `text`). `decidedByName: sql<string | null>\`(select "name" from "user" where "id" = ${decision.actorId})\``. Filtros `status`, `method`, `academicPeriodId` (via `classGroups.academicPeriodId`), `q`. Métricas: período corrente como em `ListEnrollmentsQuery` e

```ts
      .select({
        inReview: sql<number>`count(*) filter (where ${payments.status} in ('pending','under_review'))`.mapWith(Number),
        oldestOpenAt: sql<Date | null>`min(${payments.createdAt}) filter (where ${payments.status} in ('pending','under_review'))`,
        approved: sql<number>`count(*) filter (where ${payments.status} = 'approved')`.mapWith(Number),
        collectedCents: sql<number>`coalesce(sum(${payments.amountCents}) filter (where ${payments.status} = 'approved'), 0)`.mapWith(Number),
        rejected: sql<number>`count(*) filter (where ${payments.status} = 'rejected')`.mapWith(Number),
      })
```

restrito a `classGroups.academicPeriodId = período corrente`; `oldestOpenHours = oldestOpenAt ? Math.floor((Date.now() - new Date(oldestOpenAt).getTime()) / 3_600_000) : null`. Sem período corrente → métricas zeradas com `periodName: ""`.

- [ ] **Step 5: Rodar testes**

Run: `pnpm --filter @ooc/api test:db -- PaymentQueries` e `pnpm typecheck:api`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/infra/persistence/payment/
git commit -m "feat(api): payment ledger and review queue read from Postgres (OOC-55)"
```

---

### Task 7: Rotas de Pagos, URL do comprovante e container

**Files:**
- Create: `apps/api/src/http/payment/paymentRoles.ts`
- Create: `apps/api/src/http/payment/ListPaymentsRoute.ts`
- Create: `apps/api/src/http/payment/ListPaymentReviewQueueRoute.ts`
- Create: `apps/api/src/http/payment/GetPaymentReceiptRoute.ts`
- Create: `apps/api/src/http/payment/SettlePaymentRoute.ts` (exporta `approvePaymentRoute` e `rejectPaymentRoute`)
- Create: `apps/api/src/infra/persistence/payment/PaymentReceiptImageQuery.ts`
- Modify: `apps/api/src/infra/storage/ReceiptObjectStore.ts` (`createReadUrl`)
- Modify: `apps/api/package.json` (`@aws-sdk/s3-request-presigner`, mesma versão de `@aws-sdk/client-s3`)
- Modify: `apps/api/src/container.ts`, `apps/api/src/app.ts`
- Test: `apps/api/src/tests/payment-routes-authorization.test.ts`

**Interfaces:**
- Consumes: Tasks 4–6.
- Produces (HTTP, prefixo `/api/v1`):
  - `GET /payments?page&status&method&period&q&sort` → `{ items, total, page, pageSize, metrics }` (datas em ISO).
  - `GET /payments/review?page&period&q` → `{ items, total, page, pageSize }`.
  - `GET /payments/:id/receipt` → `{ url: string, expiresAt: string }` ou 404 `payment.receipt_not_found`.
  - `POST /payments/:id/approve` (body `{}`) → `{ id, status: "approved", seatStatus }`.
  - `POST /payments/:id/reject` body `{ reason: PaymentRejectionReason, note: string (max 500) }` → `{ id, status: "rejected", seatStatus }`.
  - Erros: 404 `payment.not_found`, 409 `payment.already_settled` / `payment.seat_released`.

- [ ] **Step 1: Teste de autorização** (copiar a estrutura de `catalog-routes-authorization.test.ts`, inclusive o `app.inject` e a asserção de 403)

```ts
const CASES: [string, string, Role][] = [
  ["GET", "/api/v1/payments", "enrollment_supervisor"],
  ["GET", "/api/v1/payments", "teacher"],
  ["GET", "/api/v1/payments/review", "sales"],
  ["GET", `/api/v1/payments/${ID}/receipt`, "support"],
  ["GET", `/api/v1/payments/${ID}/receipt`, "enrollment_supervisor"],
  // Whoever opens a manual enrollment does not settle its money (CLAUDE.md §1, lock (d)).
  ["POST", `/api/v1/payments/${ID}/approve`, "enrollment_supervisor"],
  ["POST", `/api/v1/payments/${ID}/approve`, "analyst"],
  ["POST", `/api/v1/payments/${ID}/approve`, "support"],
  ["POST", `/api/v1/payments/${ID}/reject`, "enrollment_supervisor"],
  ["POST", `/api/v1/payments/${ID}/reject`, "sales"],
];
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @ooc/api test -- payment-routes-authorization`
Expected: FAIL (404 em vez de 403 — rotas não existem).

- [ ] **Step 3: Papéis**

```ts
// paymentRoles.ts
import type { Role } from "@ooc/domain";

/** Who reads Payments — matches `canViewPayments` (apps/app/src/lib/backoffice/permissions.ts). */
export const PAYMENT_READ_ROLES = ["master", "admin", "analyst", "billing", "support"] as const satisfies readonly Role[];

/** Who opens the receipt image — personal data, so the reviewers and the analyst who observes them. */
export const PAYMENT_RECEIPT_ROLES = ["master", "admin", "analyst", "billing"] as const satisfies readonly Role[];

/** Who settles money — `canReviewPayments`. Never enrollment_supervisor (CLAUDE.md §1, lock (d)). */
export const PAYMENT_SETTLE_ROLES = ["master", "admin", "billing"] as const satisfies readonly Role[];
```

- [ ] **Step 4: Rotas de decisão**

```ts
// SettlePaymentRoute.ts
import { PaymentRejectionReasonSchema } from "@ooc/domain";
import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";
import { PAYMENT_SETTLE_ROLES } from "./paymentRoles.js";

const ParamsSchema = z.object({ id: z.string().uuid() });
const ResultSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  seatStatus: z.enum(["reserved", "confirmed", "released"]),
});

/** Approving finishes the enrollment: the seat is confirmed (OOC-55). */
export const approvePaymentRoute = RouteBuilder.post("/payments/:id/approve")
  .docs({ tags: ["Payments"], summary: "Approve a payment and confirm its enrollment" })
  .roles(...PAYMENT_SETTLE_ROLES)
  .params(ParamsSchema)
  .response(200, ResultSchema)
  .response(404, ErrorResponseSchema)
  .response(409, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const result = await container.useCases.payment.settlePayment.run({
      actorId: request.currentUser!.id,
      paymentId: request.params.id,
      decision: { kind: "approve" },
    });
    reply.status(200).send({ id: result.paymentId, status: result.status, seatStatus: result.seatStatus });
  });

/** Rejecting hands the seat back to the class group. */
export const rejectPaymentRoute = RouteBuilder.post("/payments/:id/reject")
  .docs({ tags: ["Payments"], summary: "Reject a payment and release its seat" })
  .roles(...PAYMENT_SETTLE_ROLES)
  .params(ParamsSchema)
  .body(z.object({ reason: PaymentRejectionReasonSchema, note: z.string().trim().max(500) }))
  .response(200, ResultSchema)
  .response(400, ErrorResponseSchema)
  .response(404, ErrorResponseSchema)
  .response(409, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const result = await container.useCases.payment.settlePayment.run({
      actorId: request.currentUser!.id,
      paymentId: request.params.id,
      decision: { kind: "reject", reason: request.body.reason, note: request.body.note },
    });
    reply.status(200).send({ id: result.paymentId, status: result.status, seatStatus: result.seatStatus });
  });
```

(Se o `RouteBuilder.post` exigir `.body(...)`, usar `.body(z.object({}))` no approve — ver `AdvanceClassGroupStatusRoute` / outra rota POST sem corpo.)

- [ ] **Step 5: Rotas de leitura** — `ListPaymentsRoute.ts` e `ListPaymentReviewQueueRoute.ts` no molde exato de `ListEnrollmentsRoute.ts`: schema de query com zod (`page` coerce 1..100000 default 1; `status` enum; `method` = `PaymentMethodSchema`; `period` uuid; `q` trim min 2 max 100; `sort` default `newest`), response schema espelhando as interfaces da Task 6 com datas como `z.string()`, handler convertendo `Date` em `toISOString()`. Roles `PAYMENT_READ_ROLES`. `fraudSignals` como `z.array(z.enum(["identical_file","similar_image","edited_with_software","modified_after_capture","payer_name_mismatch"]))`, `receipt` como `z.enum(["missing","uploading","ready","refused"])`.

- [ ] **Step 6: Imagem do comprovante**

`ReceiptObjectStore`:

```ts
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

  /** A GET URL that dies in `expiresInSeconds` — the only way a person sees a
   * receipt (CLAUDE.md §8: 5 minutes, scoped, access logged by the caller). */
  async createReadUrl(key: string, expiresInSeconds: number): Promise<string> {
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: expiresInSeconds });
  }
```

`PaymentReceiptImageQuery`:

```ts
import { auditLog, receiptUploads } from "@ooc/db";
import { NotFoundError } from "@ooc/domain";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";
import type { ReceiptObjectStore } from "@/infra/storage/ReceiptObjectStore.js";

export const RECEIPT_URL_TTL_SECONDS = 5 * 60;

/**
 * The processed receipt of a payment, as a 5-minute URL (CLAUDE.md §8). Every
 * look is written to the audit log in the same breath — a receipt is
 * somebody's bank screen, and who opened it is part of the record.
 */
export class PaymentReceiptImageQuery {
  constructor(
    private readonly db: Db,
    private readonly objectStore: ReceiptObjectStore,
  ) {}

  async run(params: { paymentId: string; actorId: string }): Promise<{ url: string; expiresAt: Date }> {
    const [upload] = await this.db
      .select({ id: receiptUploads.id, key: receiptUploads.processedObjectKey })
      .from(receiptUploads)
      .where(and(eq(receiptUploads.paymentId, params.paymentId), isNotNull(receiptUploads.processedObjectKey)))
      .orderBy(desc(receiptUploads.createdAt))
      .limit(1);
    if (!upload?.key) {
      throw new NotFoundError({ reason: "payment.receipt_not_found", message: "The payment has no processed receipt." });
    }

    const url = await this.objectStore.createReadUrl(upload.key, RECEIPT_URL_TTL_SECONDS);
    await this.db.insert(auditLog).values({
      actorId: params.actorId,
      action: "payment.receipt_viewed",
      targetId: params.paymentId,
      metadata: { receiptUploadId: upload.id },
    });

    return { url, expiresAt: new Date(Date.now() + RECEIPT_URL_TTL_SECONDS * 1000) };
  }
}
```

(`NotFoundError` já é exportado por `@ooc/domain`.)

`GetPaymentReceiptRoute.ts`: `RouteBuilder.get("/payments/:id/receipt")`, roles `PAYMENT_RECEIPT_ROLES`, response `{ url: z.string().url(), expiresAt: z.string() }` + 404.

- [ ] **Step 7: Container e app** — em `container.ts`:
  - `const paymentSettlementRepository = new DrizzlePaymentSettlementRepository(db);`
  - `const settlePayment = new SettlePaymentUseCase(paymentSettlementRepository, enrollmentEmailContextLookup);`
  - `AppUseCases` ganha `payment: { settlePayment: SettlePaymentUseCase }`.
  - `AppQueries` ganha `listPayments: ListPaymentsQuery; listPaymentReviewQueue: ListPaymentReviewQueueQuery; paymentReceiptImage: PaymentReceiptImageQuery;` instanciados com `db` (e `receiptObjectStore` para o último).
  - Em `app.ts`, importar e registrar as cinco rotas logo depois de `listEnrollmentsRoute`.
  - Rodar `pnpm --filter @ooc/api add @aws-sdk/s3-request-presigner@<versão do client-s3>`.

- [ ] **Step 8: Rodar testes**

Run: `pnpm typecheck:api && pnpm test:api`
Expected: PASS, incluindo o teste de autorização novo e os existentes.

- [ ] **Step 9: Commit**

```bash
git add apps/api pnpm-lock.yaml
git commit -m "feat(api): payment routes to list, review, view receipts and settle (OOC-55)"
```

---

### Task 8: Tela de Pagos lê a API

**Files:**
- Create: `apps/app/src/lib/backoffice/payments.ts`
- Create: `apps/app/src/lib/backoffice/payment-ledger-query.ts`
- Modify: `apps/app/src/lib/backoffice/types.ts` (`PaymentRow`, `PaymentMetrics` reais; novo `PaymentReviewItem`)
- Modify: `apps/app/src/app/[locale]/backoffice/(panel)/(gated)/payments/page.tsx`
- Modify: `apps/app/src/app/[locale]/backoffice/(panel)/(gated)/payments/payments-view.tsx`
- Modify: `apps/app/src/app/[locale]/backoffice/(panel)/(gated)/payments/payment-detail-dialog.tsx`
- Modify: `apps/app/src/messages/backoffice/{es-PE,pt-BR,en}.json`

**Interfaces:**
- Consumes: `GET /api/v1/payments` (Task 7).
- Produces:

```ts
// payment-ledger-query.ts
export interface PaymentLedgerQuery { page: number; status: PaymentStatus | null; method: PaymentMethod | null; q: string; sort: 'newest' | 'oldest' }
export function parsePaymentLedgerQuery(params: Record<string, string | string[] | undefined>): PaymentLedgerQuery
export function paymentLedgerSearchParams(query: PaymentLedgerQuery): URLSearchParams
// payments.ts
export interface PaymentLedger { items: PaymentRow[]; total: number; page: number; pageSize: number; metrics: PaymentMetrics }
export async function listPayments(query: PaymentLedgerQuery): Promise<PaymentLedger | null>
export async function listPaymentReviewQueue(query: { page: number; q: string }): Promise<PaymentReviewQueue | null>
```

- [ ] **Step 1: Tipos** — em `types.ts`, `PaymentRow` passa a ser o formato da API (datas em string ISO): `{ id, enrollmentId, studentId, studentName, courseName, status, method, methodDetail, operationNumber, amountCents, expectedAmountCents, currency: 'PEN', submittedAt, decidedAt, decidedByName }` (sai `concept` e `flag` — só matrícula usa `payments` hoje). `PaymentMetrics` = `{ periodName, inReview, oldestOpenHours: number | null, approved, collectedCents, rejected }`. Novo `PaymentReviewItem` espelhando a Task 6 (com `ReviewReceiptState` e `ReceiptFraudSignalKind` como uniões de string) e `PaymentReviewQueue`.

- [ ] **Step 2: `payment-ledger-query.ts` e `payments.ts`** — copiar o desenho de `enrollment-ledger-query.ts` / `enrollments.ts` (`apiFetch`, `null` em falha, valores fora das uniões descartados).

- [ ] **Step 3: `page.tsx`** — vira `async` com `searchParams`, lê `listPayments(parsePaymentLedgerQuery(search))`; se `null`, `EmptyState` de erro (`payments.load_error_title`/`_body`), como em Matrículas.

- [ ] **Step 4: `payments-view.tsx`** — filtros, busca e paginação deixam de rodar no navegador: o componente reescreve a URL (`useRouter`/`usePathname` de `@/i18n/navigation`, como `enrollments-view.tsx`) e recebe `ledger` + `query` por props. Sai o filtro de conceito. Métricas: "em revisão" (com dica "mais antigo há N h" quando `oldestOpenHours` não é null), aprovados, arrecadado (`formatMoney`), rejeitados. `Pager` usa `total`/`pageSize` do servidor.

- [ ] **Step 5: `payment-detail-dialog.tsx`** — usar os campos novos (curso no lugar de `concept`, `decidedByName ?? t('payments.decided_by_unknown')`). Para pagamento aberto, botão "Revisar" com `Link` para `/backoffice/payments/review?receipt=<id>` quando `canReview`.

- [ ] **Step 6: Locales** — chaves novas nos três arquivos (`payments.load_error_title`, `payments.load_error_body`, `payments.metric_oldest_hint` com `{hours}`, `payments.decided_by_unknown`, `payments.open_review`), e remoção das que ficaram sem leitor (`document_type` continua se outra tela usar — conferir com `rg`).

- [ ] **Step 7: Verificar**

Run: `pnpm typecheck:app && pnpm --filter @ooc/app lint`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A apps/app
git commit -m "feat(app): payments ledger reads the API (OOC-55)"
```

---

### Task 9: Fila de revisão real — aprovar e rejeitar

**Files:**
- Modify: `apps/app/src/app/[locale]/backoffice/(panel)/(gated)/payments/review/page.tsx`
- Modify: `apps/app/src/app/[locale]/backoffice/(panel)/(gated)/payments/review/review-queue-view.tsx`
- Modify: `apps/app/src/app/[locale]/backoffice/(panel)/(gated)/payments/review/receipt-review-dialog.tsx`
- Create: `apps/app/src/lib/backoffice/payment-client.ts`
- Modify: `apps/app/src/middleware.ts` + `apps/app/.env.example` (`RECEIPT_IMAGE_ORIGIN`)
- Modify: `apps/app/src/messages/backoffice/{es-PE,pt-BR,en}.json`
- Modify: `apps/app/src/lib/backoffice/mock-data.ts` (remover `listPayments`, `getPaymentMetrics`, `listReviewQueue`, `listReceiptExtractions` e tipos que ficarem órfãos — `rg` antes)

**Interfaces:**
- Consumes: `GET /api/v1/payments/review`, `GET /api/v1/payments/:id/receipt`, `POST /api/v1/payments/:id/approve|reject` pelo proxy same-origin.
- Produces:

```ts
// payment-client.ts
export type PaymentErrorKey = 'already_settled' | 'seat_released' | 'not_found' | 'receipt_not_found' | 'generic'
export type PaymentWriteResult<T> = { ok: true; data: T } | { ok: false; error: PaymentErrorKey }
export async function approvePayment(id: string): Promise<PaymentWriteResult<{ id: string }>>
export async function rejectPayment(id: string, reason: RejectionReason, note: string): Promise<PaymentWriteResult<{ id: string }>>
export async function fetchReceiptUrl(id: string): Promise<PaymentWriteResult<{ url: string }>>
```

- [ ] **Step 1: `payment-client.ts`** — no molde de `catalog-client.ts`: `fetch('/api/v1/payments/...')`, `reason` com prefixo `payment.` vira a chave; desconhecido → `generic`.

- [ ] **Step 2: `review/page.tsx`** — lê `listPaymentReviewQueue({ page, q })` dos `searchParams`; erro → `EmptyState`. Passa `items`, `total`, `pageSize`, `canReview`, `openReceiptId`.

- [ ] **Step 3: `review-queue-view.tsx`** — busca e página na URL. Colunas: aluno, curso/turma, valor esperado, recebido em, **prazo** (`reviewDeadline`, em vermelho quando faltar menos de 24 h ou já passou), comprovante (`receipt` → badge: `missing` em âmbar "sem comprovante", `uploading`, `ready`, `refused`), sinais (badge por tipo). Sai o filtro por `ReviewFlag` (era de OCR). Depois de decidir: `router.refresh()` + `Toast` (`review.approved_toast` / `review.rejected_toast`); em `already_settled`, toast de aviso e `router.refresh()` (outra pessoa decidiu).

- [ ] **Step 4: `receipt-review-dialog.tsx`** — recebe `PaymentReviewItem`. Ao abrir com `receipt === 'ready'`, chama `fetchReceiptUrl` e mostra `<img src={url} alt={t('receipt_review.image_alt')}>` (falha → placeholder atual com `receipt_review.image_unavailable`); `missing` → aviso âmbar `receipt_review.no_receipt_warning` ("Aprovar sem comprovante: confirme o depósito no extrato antes."). Seções: o que a pessoa declarou (meio via `formatPaymentMethod`, nº de operação), valor esperado (preço congelado), sinais da triagem em texto (`fraud_signal.<kind>`), prazo. Sai tudo de OCR (`fields`, `tier`, `modelName`, `secondOpinion`, `toleranceCents`, `duplicateOf`). Aprovar/rejeitar chamam o `onDecide` existente, agora assíncrono, com botão desabilitado durante o envio (guarda de duplo clique).

- [ ] **Step 5: CSP** — em `middleware.ts`, `img-src 'self' data:${receiptOrigin}` onde `receiptOrigin = process.env.RECEIPT_IMAGE_ORIGIN ? \` ${process.env.RECEIPT_IMAGE_ORIGIN}\` : ''`, validado como URL de origem (`new URL(x).origin === x`, senão ignorado). Comentário: a URL assinada vem do bucket (Tigris em produção, LocalStack local), e sem a origem no `img-src` o navegador recusa a imagem. Documentar a variável em `apps/app/.env.example`.

- [ ] **Step 6: Locales** — chaves novas nos três arquivos: `review.approved_toast`, `review.rejected_toast`, `review.already_settled_toast`, `review.seat_released_toast`, `review.col_deadline`, `review.col_receipt`, `review.col_signals`, `review.deadline_overdue`, `review.load_error_title`, `review.load_error_body`, `receipt_state.{missing,uploading,ready,refused}`, `fraud_signal.{identical_file,similar_image,edited_with_software,modified_after_capture,payer_name_mismatch}`, `receipt_review.image_alt`, `receipt_review.image_unavailable`, `receipt_review.no_receipt_warning`, `receipt_review.declared_title`, `receipt_review.signals_title`, `receipt_review.signals_none`. Remover chaves de OCR sem leitor (`review_flag.*`, `extraction_field.*`, `receipt_review.second_opinion_*`, `receipt_review.extraction_*`, `receipt_review.check_tolerance`, `receipt_review.duplicate_*`) — conferir com `rg` (a home pode usar `review_flag`; se usar, manter).

- [ ] **Step 7: Verificar no app** — `pnpm typecheck:app && pnpm --filter @ooc/app lint`; depois subir `pnpm dev:stack` e, com uma matrícula manual recém-criada: (1) não aparece em Matrículas; (2) aparece na fila de Pagos; (3) aprovar → some da fila, aparece em Matrículas como ativa; (4) outra matrícula rejeitada → vaga da turma volta (`seats_taken` cai 1).

- [ ] **Step 8: Commit**

```bash
git add -A apps/app
git commit -m "feat(app): review queue approves and rejects real payments (OOC-55)"
```

---

### Task 10: Documentação viva

**Files:**
- Modify: `CLAUDE.md` (§1, regra nova)
- Modify: `apps/api/CLAUDE.md` ("Pagamento")
- Modify: `apps/app/CLAUDE.md` se ele listar a aba Reservas ou o mock de Pagos (conferir com `rg`)
- Modify: `README.md` ("Estado atual")
- Modify: `docs/ARCHITECTURE.md` §3 se a tabela RBAC citar Pagos/aprovação (conferir)

- [ ] **Step 1: `CLAUDE.md` §1** — depois do item "Matrícula aberta pelo backoffice…", acrescentar:

> - **Matrícula só existe nas listas depois que o dinheiro é confirmado (OOC-55, 01/10/2026).** Matrículas mostra só vaga `confirmed`; Alunos esconde quem tem matrícula reservada e nenhuma confirmada (o seletor da matrícula manual ainda acha, pra não duplicar ficha). Tudo que está aberto — pendente, em revisão — vive em **Pagos**, e é lá que `master`/`admin`/`billing` aprovam (vaga `reserved → confirmed`, e-mail `payment_approved`) ou rejeitam com motivo (vaga `released`, devolvida à turma, e-mail `payment_rejected`). Aprovar vale também para pagamento `pending` (sem OCR, todo checkout fica `pending`); sem comprovante, a tela avisa e não bloqueia. Rejeitada não volta pra Matrículas. **Fora:** credenciais do portal na aprovação (não existe conta de aluno), cron da janela de 5 dias.

- [ ] **Step 2: `apps/api/CLAUDE.md` "Pagamento"** — acrescentar: rotas (`GET /payments`, `GET /payments/review`, `GET /payments/:id/receipt`, `POST /payments/:id/approve|reject`), papéis, a transação de `DrizzlePaymentSettlementRepository` (UPDATE condicional → 409; vaga confirmada de módulo mensal intocada; `seats_taken - 1` só na rejeição de vaga reservada; outbox e `audit_log` na mesma transação), `payment.receipt_viewed` no `audit_log`, `RECEIPT_IMAGE_ORIGIN` no CSP do app.

- [ ] **Step 3: README** — "Estado atual": Pagos e a fila leem o banco e aprovam/rejeitam; Matrículas/Alunos mostram só quem entrou; aba Reservas removida.

- [ ] **Step 4: ROADMAP** — **não editar.** Na mensagem final ao dono, sinalizar que a Sessão 32 (Bandeja de comprovantes) avançou: aprovar/rejeitar e comparação imagem × dados existem; faltam ordenação por confiança, atalhos de teclado e reprocessar.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md apps/api/CLAUDE.md apps/app/CLAUDE.md README.md docs/ARCHITECTURE.md
git commit -m "docs: enrollments finish in payments (OOC-55)"
```

---

## Verificação final

- `pnpm typecheck:domain && pnpm typecheck:api && pnpm typecheck:app && pnpm lint && pnpm test:api`
- `pnpm test:api:db` (suite inteira, com `DATABASE_URL`)
- Passo manual da Task 9, Step 7.
