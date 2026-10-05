# Autenticação real do aluno — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Só quem tem credencial real entra no portal do aluno: conta criada na primeira aprovação de pagamento, login por e-mail ou documento, recuperação de senha, anti-enumeração e auto-cadastro fechado.

**Architecture:** A conta é uma linha `"user"` (Better Auth, `role = 'student'`) ligada à ficha por `students.user_id`, criada dentro da transação da liquidação. A senha nasce por um link de uso único (`portal_access_tokens`, guardado como SHA-256). O login é uma rota própria em `apps/api` que resolve e-mail/documento no servidor e delega hash, tempo constante, sessão e cookie ao `auth.api.signInEmail`. O portal (`apps/app`) passa a exigir sessão real via `/api/v1/portal/me`; os dados das telas continuam mock, só a identidade é real.

**Tech Stack:** Fastify 5 + Better Auth 1.7.1 + Drizzle (Postgres) em `apps/api`; domínio puro em `packages/domain`; Next.js App Router + next-intl em `apps/app`; Vitest.

**Spec:** [`docs/superpowers/specs/2026-10-05-student-auth-design.md`](../specs/2026-10-05-student-auth-design.md)

## Global Constraints

- Código, commits, branch, PR e comentários **em inglês**; conversa e docs internas em português (`CLAUDE.md` §4, §9).
- **Zero string de UI em `.ts`/`.tsx`** — todo texto visível sai dos locales, nos três: `es-PE` (padrão), `pt-BR`, `en`, mesma estrutura de chaves (`CLAUDE.md` §4). O lint `i18next/no-literal-string` quebra o build.
- **Zero código de domínio na tela** (`national_id`, `activation`, `email_conflict` → sempre via locale).
- Política de senha do aluno: **mínimo 10, máximo 128, ao menos uma letra e um dígito**. Staff: `STAFF_PASSWORD_MIN_LENGTH = 12` + letra + dígito (já existe).
- Validade: token `activation` **7 dias**, `reset` **60 minutos**; cooldown de **60 s** por conta entre pedidos.
- Anti-enumeração: sign-in responde **204** ou **401 `auth.invalid_credentials`**, nada mais (formato inválido inclusive). Pedido de recuperação responde **sempre 202 `{}`**.
- Rate limits (provisórios): sign-in **30/10 min por IP** e **10/15 min por identificador**; pedido de recuperação **10/10 min por IP** e **3/60 min por identificador**; rotas de token **30/10 min por IP**; `sign-in/email` do catch-all **10/15 min por e-mail**.
- Senha **nunca** vai em e-mail nem em `outbox.vars` — só link.
- `portal_credentials` e `portal_password_reset` vão **só pro aluno**, nunca pro apoderado.
- A aprovação de pagamento **nunca falha por causa da conta**.
- Migrations só aditivas; nunca editar uma migration já mergeada (`packages/db/CLAUDE.md`).
- `timestamptz` sempre. Sem PII em log.
- Commits pequenos, convencionais (`feat:`, `fix:`, `test:`, `docs:`), terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

### Comandos

| O quê | Comando (raiz do repo) |
| --- | --- |
| Testes de `apps/api` sem banco | `pnpm test:api` (ou `pnpm --filter @ooc/api exec vitest run <arquivo>`) |
| Testes contra o Postgres | `pnpm db:up && pnpm db:migrate` uma vez; depois `DATABASE_URL=postgres://ooc:ooc@localhost:5432/ooc_dev pnpm test:api:db` |
| Testes de trava do banco | `DATABASE_URL=postgres://ooc:ooc@localhost:5432/ooc_dev pnpm test:db` |
| Typecheck | `pnpm typecheck:domain && pnpm typecheck:api && pnpm typecheck:db && pnpm typecheck:app` |
| Lint | `pnpm lint` |

### Mapa de arquivos

**`packages/domain/src/identity/`**
- `StudentPasswordPolicy.ts` (novo) — regra de senha do aluno, sem imports (o app importa pelo subpath `@ooc/domain/password-policy`).
- `portal/PortalAccess.ts` (novo) — tipos, constantes, `newPortalToken`, `hashPortalToken`, `parsePortalIdentifier`.
- `portal/ports.ts` (novo) — `IPortalAccessRepository`, `IPortalLinkBuilder`, `IPortalPasswordSetter`, `PortalAccountProvisioning`, `IssuePortalTokenRequest`.
- `portal/portalEmails.ts` (novo) — `portalCredentialsEmail`, `portalPasswordResetEmail`.
- `portal/ResolvePortalSignInEmailUseCase.ts`, `portal/RequestPortalPasswordResetUseCase.ts`, `portal/CompletePortalAccessUseCase.ts`, `portal/IssuePortalAccessUseCase.ts` (novos).
- `../enrollment/SettlePaymentUseCase.ts`, `../enrollment/PaymentSettlement.ts` (alterados) — provisionamento na aprovação.
- `../notification/EmailNotification.ts` (alterado) — template `portal_password_reset`.
- `../index.ts`, `packages/domain/package.json` (alterados) — exports.

**`packages/db/`**
- `src/schema.ts` (alterado) — `students.user_id` + índices; tabela `portalAccessTokens`.
- `migrations/0022_portal_access.sql` (gerado + FKs à mão), `migrations/meta/*` (gerado).

**`packages/notifications/src/`**
- `locales/{es-PE,pt-BR,en}.json` (alterados) — `portal_password_reset`, texto do `portal_credentials`.
- `render/renderEmail.ts` (alterado) — `ACTION_URL_VAR`.

**`apps/api/src/`**
- `infra/auth/credentialAccount.ts` (novo) — `insertCredentialUser`, `upsertCredentialPassword`.
- `infra/auth/betterAuth.ts` (alterado) — `disableSignUp`.
- `infra/identity/BetterAuthStaffAccountProvisioner.ts`, `scripts/seed-admin.ts` (alterados).
- `infra/identity/PortalLinkBuilder.ts`, `infra/identity/BetterAuthPortalPasswordSetter.ts` (novos).
- `infra/persistence/portal/provisionPortalAccount.ts`, `infra/persistence/portal/DrizzlePortalAccessRepository.ts` (novos).
- `infra/persistence/payment/DrizzlePaymentSettlementRepository.ts` (alterado).
- `shared/http/rateLimit.ts`, `http/auth/AuthCatchAllRoute.ts` (alterados).
- `http/portal/PortalSignInRoute.ts`, `http/portal/RequestPortalPasswordResetRoute.ts`, `http/portal/PortalAccessTokenRoutes.ts`, `http/portal/GetPortalMeRoute.ts`, `http/student/IssuePortalAccessRoute.ts` (novos).
- `http/payment/SettlePaymentRoute.ts`, `http/student/GetStudentRoute.ts`, `http/identity/CompleteStaffInviteRoute.ts`, `http/identity/CompleteStaffPasswordResetRoute.ts` (alterados).
- `config.ts`, `container.ts`, `app.ts`, `../vitest.config.ts`, `../.env.example` (alterados).
- Testes: `tests/student-password-policy.test.ts`, `tests/portal-access.test.ts`, `tests/portal-routes.test.ts`, `tests/portal-routes-authorization.test.ts`, `tests/settle-payment.test.ts` (alterado), `tests/email-templates.test.ts` (alterado), `infra/auth/credentialAccount.integration.test.ts`, `infra/persistence/portal/DrizzlePortalAccessRepository.integration.test.ts`, `infra/persistence/payment/DrizzlePaymentSettlementRepository.integration.test.ts` (alterado).

**`apps/app/src/`**
- `lib/auth/sign-out.ts` (novo) — sign-out compartilhado por portal e backoffice.
- `lib/portal/session.ts` (novo) — `getStudentSession`, `getPortalView`.
- `lib/portal/auth-client.ts` (novo) — chamadas do login/recuperação/definir senha.
- `app/[locale]/actions.ts`, `app/[locale]/backoffice/actions.ts` (alterados).
- `app/[locale]/portal/**/page.tsx`, `app/[locale]/portal/layout.tsx` (alterados).
- `app/[locale]/login/auth-shell.tsx` (novo), `app/[locale]/login/page.tsx`, `login-form.tsx` (alterados), `login/actions.ts` (apagado).
- `app/[locale]/forgot-password/page.tsx`, `forgot-password-form.tsx` (novos).
- `app/[locale]/access/[token]/page.tsx`, `access-form.tsx` (novos).
- `app/[locale]/backoffice/reset-password/[token]/password-reset-form.tsx`, `backoffice/invite/[token]/invite-completion-form.tsx` (alterados — política 12).
- `app/[locale]/backoffice/(panel)/(gated)/students/[studentId]/page.tsx`, `portal-access-control.tsx` (novo).
- `app/[locale]/backoffice/(panel)/(gated)/payments/review/review-queue-view.tsx`, `lib/backoffice/payment-client.ts`, `lib/backoffice/portal-access-client.ts` (novo), `lib/backoffice/permissions.ts`, `lib/backoffice/types.ts`.
- `messages/{es-PE,pt-BR,en}.json`, `messages/backoffice/{es-PE,pt-BR,en}.json`.

---

### Task 1: Políticas de senha

**Files:**
- Create: `packages/domain/src/identity/StudentPasswordPolicy.ts`
- Modify: `packages/domain/src/index.ts`, `packages/domain/package.json`
- Modify: `apps/api/src/http/identity/CompleteStaffInviteRoute.ts:11`, `apps/api/src/http/identity/CompleteStaffPasswordResetRoute.ts:9-12`
- Modify: `apps/app/src/app/[locale]/backoffice/reset-password/[token]/password-reset-form.tsx`, `apps/app/src/app/[locale]/backoffice/invite/[token]/invite-completion-form.tsx`, `apps/app/src/messages/{es-PE,pt-BR,en}.json` (chave `backoffice.invite_error_short`)
- Test: `apps/api/src/tests/student-password-policy.test.ts`

**Interfaces:**
- Produces: `STUDENT_PASSWORD_MIN_LENGTH = 10`, `STUDENT_PASSWORD_MAX_LENGTH = 128`, `type StudentPasswordIssue = "too_short" | "too_long" | "missing_letter" | "missing_digit"`, `studentPasswordIssues(password: string): StudentPasswordIssue[]`, `meetsStudentPasswordPolicy(password: string): boolean`. Exportados de `@ooc/domain` e de `@ooc/domain/password-policy`.

- [ ] **Step 1: Escrever o teste que falha**

`apps/api/src/tests/student-password-policy.test.ts`:

```ts
import {
  STUDENT_PASSWORD_MAX_LENGTH,
  STUDENT_PASSWORD_MIN_LENGTH,
  meetsStaffPasswordPolicy,
  meetsStudentPasswordPolicy,
  studentPasswordIssues,
} from "@ooc/domain";
import { describe, expect, it } from "vitest";

describe("student password policy", () => {
  it("accepts ten characters with a letter and a digit", () => {
    expect(STUDENT_PASSWORD_MIN_LENGTH).toBe(10);
    expect(meetsStudentPasswordPolicy("abcdefghi1")).toBe(true);
    expect(studentPasswordIssues("abcdefghi1")).toEqual([]);
  });

  it("names every rule a password breaks", () => {
    expect(studentPasswordIssues("abc")).toEqual(["too_short", "missing_digit"]);
    expect(studentPasswordIssues("1234567890")).toEqual(["missing_letter"]);
    expect(studentPasswordIssues("abcdefghijk")).toEqual(["missing_digit"]);
  });

  it("counts any script's letters, not only ASCII", () => {
    expect(meetsStudentPasswordPolicy("ñandúñandú1")).toBe(true);
  });

  it("refuses past the upper bound", () => {
    const long = `a1${"x".repeat(STUDENT_PASSWORD_MAX_LENGTH)}`;
    expect(studentPasswordIssues(long)).toEqual(["too_long"]);
  });

  it("stays stricter for staff", () => {
    expect(meetsStaffPasswordPolicy("abcdefghi1")).toBe(false);
    expect(meetsStaffPasswordPolicy("abcdefghijk1")).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @ooc/api exec vitest run src/tests/student-password-policy.test.ts`
Expected: FAIL — `studentPasswordIssues` não exportado.

- [ ] **Step 3: Implementar**

`packages/domain/src/identity/StudentPasswordPolicy.ts`:

```ts
/**
 * What a student's portal password has to be. Softer than the panel's
 * (`StaffPasswordPolicy`, 12): staff also carry MFA (CLAUDE.md §8), students
 * don't, and much of the audience is under age — a rule they cannot meet is a
 * stream of recovery requests. The rate limits and the anti-enumeration answer
 * on sign-in are what stand against brute force.
 *
 * No imports on purpose: apps/app reads this file through the
 * `@ooc/domain/password-policy` subpath to show the same rules while the field
 * is typed into. The API's check is the one that counts.
 */
export const STUDENT_PASSWORD_MIN_LENGTH = 10;
export const STUDENT_PASSWORD_MAX_LENGTH = 128;

export type StudentPasswordIssue = "too_short" | "too_long" | "missing_letter" | "missing_digit";

export function studentPasswordIssues(password: string): StudentPasswordIssue[] {
  const issues: StudentPasswordIssue[] = [];
  if (password.length < STUDENT_PASSWORD_MIN_LENGTH) issues.push("too_short");
  if (password.length > STUDENT_PASSWORD_MAX_LENGTH) issues.push("too_long");
  if (!/\p{L}/u.test(password)) issues.push("missing_letter");
  if (!/\d/.test(password)) issues.push("missing_digit");
  return issues;
}

export function meetsStudentPasswordPolicy(password: string): boolean {
  return studentPasswordIssues(password).length === 0;
}
```

Em `packages/domain/src/index.ts`, ao lado do export de `StaffPasswordPolicy` (procure `meetsStaffPasswordPolicy`):

```ts
export {
  STUDENT_PASSWORD_MAX_LENGTH,
  STUDENT_PASSWORD_MIN_LENGTH,
  meetsStudentPasswordPolicy,
  studentPasswordIssues,
} from "./identity/StudentPasswordPolicy.js";
export type { StudentPasswordIssue } from "./identity/StudentPasswordPolicy.js";
```

Em `packages/domain/package.json`, no bloco `exports`:

```json
    "./fields": "./src/student/fields.ts",
    "./password-policy": "./src/identity/StudentPasswordPolicy.ts"
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @ooc/api exec vitest run src/tests/student-password-policy.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Staff — rotas de conclusão usam a política de 12**

Em `CompleteStaffInviteRoute.ts` e `CompleteStaffPasswordResetRoute.ts`, troque `password: z.string().min(8),` (e o comentário acima dele) por:

```ts
  // The panel's own floor (StaffPasswordPolicy) — the same rule the account
  // screen applies; Better Auth's 8 is lower and would let a weak one through.
  password: z.string().max(128).refine(meetsStaffPasswordPolicy, "weak_password"),
```

e adicione `meetsStaffPasswordPolicy` ao import de `@ooc/domain` (no `CompleteStaffPasswordResetRoute.ts` crie o import: `import { meetsStaffPasswordPolicy } from "@ooc/domain";`).

Nos dois formulários do app (`password-reset-form.tsx` e `invite-completion-form.tsx`), troque a constante local:

```tsx
import { PASSWORD_MIN_LENGTH } from '@/lib/backoffice/account'
```

remova `const MIN_PASSWORD_LENGTH = 8` (e seu comentário), troque toda ocorrência de `MIN_PASSWORD_LENGTH` por `PASSWORD_MIN_LENGTH`, e troque a checagem de comprimento por:

```tsx
    if (
      password.length < PASSWORD_MIN_LENGTH ||
      !/\p{L}/u.test(password) ||
      !/\d/.test(password)
    ) {
      setError('short')
      return
    }
```

Atualize o texto de `backoffice.invite_error_short` nos três locales do app (mesmo placeholder `{min}`):
- es-PE: `"La contraseña debe tener al menos {min} caracteres, con letras y números."`
- pt-BR: `"A senha precisa ter ao menos {min} caracteres, com letras e números."`
- en: `"The password needs at least {min} characters, with letters and numbers."`

(Abra cada JSON e confirme o nome exato da chave usada pelo `'short'` — é a que recebe `{ min: ... }` no form.)

- [ ] **Step 6: Typecheck + testes de staff**

Run: `pnpm typecheck:domain && pnpm typecheck:api && pnpm typecheck:app && pnpm --filter @ooc/api exec vitest run src/tests/staff-password-reset.test.ts`
Expected: tudo verde.

- [ ] **Step 7: Commit**

```bash
git add packages/domain apps/api/src/http/identity apps/api/src/tests/student-password-policy.test.ts apps/app/src
git commit -m "feat(domain): add the student password policy and enforce the staff one on public completion routes"
```

---

### Task 2: Schema e migration `0022`

**Files:**
- Modify: `packages/db/src/schema.ts` (tabela `students` ~linha 274; nova tabela depois de `staffPasswordResets` ~linha 825)
- Create: `packages/db/migrations/0022_portal_access.sql` (gerado), `packages/db/migrations/meta/0022_snapshot.json`, `_journal.json` (gerados)

**Interfaces:**
- Produces: coluna `students.userId` (`text`, nula); tabela `portalAccessTokens` com `id`, `userId`, `tokenHash`, `purpose`, `expiresAt`, `usedAt`, `createdAt`, `updatedAt`.

- [ ] **Step 1: Alterar `students`**

Troque o comentário "No user_id here: ..." acima de `export const students` por:

```ts
// `user_id` links the file to its portal account (Better Auth's "user".id,
// text). Set when the first payment is approved (CLAUDE.md §1, reopened
// 05/10/2026) — not unique: two files of the same person (same normalized
// document, still not consolidated — CLAUDE.md §1, "Um documento, uma
// pessoa") point at the same account.
```

Dentro das colunas, depois de `city`:

```ts
    userId: text("user_id"),
```

Dentro do array de índices, depois de `students_national_id_type_national_id_idx`:

```ts
    index("students_user_id_idx").on(table.userId),
    // The portal sign-in by document (apps/api, PortalSignInRoute): matches
    // on the document normalized in SQL — the same rule as
    // `normalizeNationalId` — so a file written before OOC-64 (with dots or
    // dashes) still finds its account. Only files with an account are
    // searched, which keeps the index small.
    index("students_portal_national_id_idx")
      .on(table.nationalIdType, sql`regexp_replace(upper(${table.nationalId}), '[[:space:].-]', '', 'g')`)
      .where(sql`${table.userId} is not null`),
```

- [ ] **Step 2: Nova tabela**

Depois de `staffPasswordResets`:

```ts
// One-time links that set a portal password: `activation` (the account was
// just created, no password yet) and `reset` ("forgot my password"). One
// table, because both land on the same screen and do the same thing.
//
// Unlike `staffInvites`, the token is stored as a SHA-256 hash: these are
// thousands of student accounts, the link is e-mailed rather than handed over
// by someone who checked who was asking, and the token alone hands over the
// account. A new token marks the pending ones of the same user and purpose as
// used — only the latest link works.
export const portalAccessTokens = pgTable(
  "portal_access_tokens",
  {
    id: uuidPk(),
    userId: text("user_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    purpose: text("purpose").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("portal_access_tokens_token_hash_uidx").on(table.tokenHash),
    index("portal_access_tokens_user_id_created_at_idx").on(table.userId, table.createdAt),
    check("portal_access_tokens_purpose_check", sql`${table.purpose} in ('activation', 'reset')`),
  ],
);
```

- [ ] **Step 3: Gerar a migration**

Run: `pnpm --filter @ooc/db exec drizzle-kit generate --name portal_access`
Expected: cria `packages/db/migrations/0022_portal_access.sql` + snapshot + entrada no journal. Abra o SQL e confirme: `ALTER TABLE "students" ADD COLUMN "user_id" text`, `CREATE TABLE "portal_access_tokens"`, os dois índices novos de `students` e os da tabela nova. Nada de DROP.

- [ ] **Step 4: FKs para `"user"` à mão**

O Drizzle não conhece `"user"` (tabela do Better Auth, `0001`). Acrescente ao fim de `0022_portal_access.sql`:

```sql
--> statement-breakpoint
-- Better Auth's "user" is not in the Drizzle schema (0001), so these two are
-- written by hand. A file keeps pointing at its account: restrict, never
-- cascade (students are never deleted, CLAUDE.md §6). A link dies with its
-- account.
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE restrict;--> statement-breakpoint
ALTER TABLE "portal_access_tokens" ADD CONSTRAINT "portal_access_tokens_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade;
```

- [ ] **Step 5: Aplicar em banco limpo e rodar as suítes do banco**

Run: `pnpm db:reset && DATABASE_URL=postgres://ooc:ooc@localhost:5432/ooc_dev pnpm test:db`
Expected: migrations de 0000 a 0022 aplicam sem erro; `soft-delete.test.ts` e `privileges.test.ts` verdes (a tabela nova não tem `deleted_at` e não entra na trava — é o esperado).

- [ ] **Step 6: Typecheck e commit**

Run: `pnpm typecheck:db`

```bash
git add packages/db
git commit -m "feat(db): link students to a portal account and add one-time portal access tokens"
```

---

### Task 3: Escrita de credencial direta + auto-cadastro fechado

**Files:**
- Create: `apps/api/src/infra/auth/credentialAccount.ts`
- Modify: `apps/api/src/infra/auth/betterAuth.ts:25-27`
- Modify: `apps/api/src/infra/identity/BetterAuthStaffAccountProvisioner.ts`, `apps/api/src/container.ts` (construção do provisioner), `apps/api/src/scripts/seed-admin.ts`
- Test: `apps/api/src/infra/auth/credentialAccount.integration.test.ts`

**Interfaces:**
- Produces:
  - `insertCredentialUser(db: SqlExecutor, input: { email: string; name: string; role: Role; password: string }): Promise<string>` → `userId`
  - `insertPasswordlessUser(db: SqlExecutor, input: { email: string; name: string; role: Role }): Promise<string>` → `userId`
  - `upsertCredentialPassword(db: SqlExecutor, userId: string, plainPassword: string): Promise<void>`
  - `type SqlExecutor = Pick<Db, "execute">` (uma `tx` também serve).

- [ ] **Step 1: Escrever o teste de integração que falha**

`apps/api/src/infra/auth/credentialAccount.integration.test.ts`:

```ts
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@ooc/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Config } from "@/config.js";
import type { Db } from "@/infra/db/client.js";
import { createAuth, type Auth } from "./betterAuth.js";
import { insertCredentialUser, insertPasswordlessUser, upsertCredentialPassword } from "./credentialAccount.js";

/**
 * The accounts apps/api writes without Better Auth's sign-up (closed —
 * `disableSignUp`), proven by signing in through Better Auth itself. Better
 * Auth reads through its own pool, so these rows are committed; "user" is not
 * under the delete lock (0011), and afterAll removes them (account and session
 * cascade).
 */

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required for this suite.");

const RUN = Date.now().toString(36);
const created: string[] = [];
let pool: pg.Pool;
let db: Db;
let auth: Auth;

beforeAll(() => {
  pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
  db = drizzle(pool, { schema, casing: "snake_case" });
  auth = createAuth({
    NODE_ENV: "test",
    PORT: 3333,
    DATABASE_URL,
    BETTER_AUTH_URL: "http://localhost:3333/api/auth",
    BETTER_AUTH_SECRET: "integration-secret-at-least-32-characters",
    APP_PUBLIC_URLS: ["http://localhost:3000"],
  } as Config);
});

afterAll(async () => {
  if (created.length > 0) {
    await db.execute(sql`delete from "user" where "id" in (${sql.join(created.map((id) => sql`${id}`), sql`, `)})`);
  }
  await pool.end();
});

describe("credential accounts written directly", () => {
  it("signs in an account created with a password", async () => {
    const email = `staff-${RUN}@example.com`;
    const userId = await insertCredentialUser(db, { email, name: "Rosa Quispe", role: "admin", password: "correct-horse-1" });
    created.push(userId);

    const result = await auth.api.signInEmail({ body: { email, password: "correct-horse-1" } });
    expect(result.user.id).toBe(userId);
    expect((result.user as unknown as { role: string }).role).toBe("admin");

    await expect(auth.api.signInEmail({ body: { email, password: "wrong-horse-1" } })).rejects.toThrow();
  });

  it("lower-cases the e-mail on the way in", async () => {
    const userId = await insertCredentialUser(db, {
      email: `Mixed-${RUN}@Example.com`,
      name: "Mixed",
      role: "admin",
      password: "correct-horse-1",
    });
    created.push(userId);
    const result = await auth.api.signInEmail({ body: { email: `mixed-${RUN}@example.com`, password: "correct-horse-1" } });
    expect(result.user.id).toBe(userId);
  });

  it("refuses an account with no password until one is set, then accepts it", async () => {
    const email = `student-${RUN}@gmail.com`;
    const userId = await insertPasswordlessUser(db, { email, name: "Ana Quispe", role: "student" });
    created.push(userId);

    await expect(auth.api.signInEmail({ body: { email, password: "anything-12" } })).rejects.toThrow();

    await upsertCredentialPassword(db, userId, "first-pass-12");
    await expect(auth.api.signInEmail({ body: { email, password: "first-pass-12" } })).resolves.toBeTruthy();

    await upsertCredentialPassword(db, userId, "second-pass-12");
    await expect(auth.api.signInEmail({ body: { email, password: "first-pass-12" } })).rejects.toThrow();
    await expect(auth.api.signInEmail({ body: { email, password: "second-pass-12" } })).resolves.toBeTruthy();
  });

  it("keeps the public sign-up closed, server calls included", async () => {
    await expect(
      auth.api.signUpEmail({ body: { email: `signup-${RUN}@example.com`, password: "whatever-123", name: "X" } }),
    ).rejects.toMatchObject({ body: { code: "EMAIL_PASSWORD_SIGN_UP_DISABLED" } });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `DATABASE_URL=postgres://ooc:ooc@localhost:5432/ooc_dev pnpm --filter @ooc/api exec vitest run --config vitest.integration.config.ts src/infra/auth/credentialAccount.integration.test.ts`
Expected: FAIL — módulo `./credentialAccount.js` não existe.

- [ ] **Step 3: Implementar `credentialAccount.ts`**

```ts
import { randomUUID } from "node:crypto";
import type { Role } from "@ooc/domain";
import { hashPassword } from "better-auth/crypto";
import { createLocalAccountIssuer } from "better-auth/db";
import { sql } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";

/** A pool or a transaction — anything that runs raw SQL. */
export type SqlExecutor = Pick<Db, "execute">;

const CREDENTIAL_PROVIDER = "credential";

/**
 * Better Auth's public sign-up is closed (`disableSignUp`, betterAuth.ts), and
 * that closes `auth.api.signUpEmail` for server calls too — the check sits in
 * the endpoint itself (better-auth/dist/api/routes/sign-up.mjs). So every
 * account apps/api creates is written here, in the exact shape sign-up writes:
 * a "user" row, and a credential "account" row whose `accountId` is the user
 * id and whose `issuer` is `createLocalAccountIssuer("credential")` — the
 * pair sign-in looks the password up by (sign-in.mjs).
 *
 * The e-mail is stored lower-cased, as sign-in lower-cases before looking up.
 * `role` is written directly: it is `input:false` towards the client, and this
 * never runs on a client's behalf.
 */
export async function insertPasswordlessUser(
  db: SqlExecutor,
  input: { email: string; name: string; role: Role },
): Promise<string> {
  const userId = randomUUID();
  await db.execute(
    sql`insert into "user" ("id", "name", "email", "emailVerified", "role", "createdAt", "updatedAt")
        values (${userId}, ${input.name}, ${input.email.trim().toLowerCase()}, false, ${input.role}, now(), now())`,
  );
  return userId;
}

export async function insertCredentialUser(
  db: SqlExecutor,
  input: { email: string; name: string; role: Role; password: string },
): Promise<string> {
  const userId = await insertPasswordlessUser(db, input);
  await insertCredential(db, userId, await hashPassword(input.password));
  return userId;
}

/**
 * Sets the password, creating the credential row when the account has none
 * yet — a student account is born without one (it is set from the activation
 * link). Same hasher Better Auth uses (`better-auth/crypto`).
 */
export async function upsertCredentialPassword(db: SqlExecutor, userId: string, plainPassword: string): Promise<void> {
  const hashed = await hashPassword(plainPassword);
  const updated = await db.execute(
    sql`update "account" set "password" = ${hashed}, "updatedAt" = now()
        where "userId" = ${userId} and "providerId" = ${CREDENTIAL_PROVIDER}`,
  );
  if ((updated.rowCount ?? 0) === 0) await insertCredential(db, userId, hashed);
}

async function insertCredential(db: SqlExecutor, userId: string, hashedPassword: string): Promise<void> {
  await db.execute(
    sql`insert into "account" ("id", "accountId", "providerId", "userId", "password", "issuer", "createdAt", "updatedAt")
        values (${randomUUID()}, ${userId}, ${CREDENTIAL_PROVIDER}, ${userId}, ${hashedPassword},
                ${createLocalAccountIssuer(CREDENTIAL_PROVIDER)}, now(), now())`,
  );
}
```

- [ ] **Step 4: Fechar o sign-up**

Em `betterAuth.ts`:

```ts
    emailAndPassword: {
      enabled: true,
      // No self sign-up, staff or student (CLAUDE.md §1): every account is
      // created by apps/api (infra/auth/credentialAccount.ts). Before this
      // the public POST /api/auth/sign-up/email created a `student` account
      // for anyone who called it.
      disableSignUp: true,
    },
```

- [ ] **Step 5: Provisionador de staff e seed sem `signUpEmail`**

`BetterAuthStaffAccountProvisioner.ts` inteiro:

```ts
import type { IStaffAccountProvisioner, ProvisionStaffAccountInput, ProvisionStaffAccountOutput } from "@ooc/domain";
import type { Db } from "@/infra/db/client.js";
import { insertCredentialUser } from "@/infra/auth/credentialAccount.js";

/**
 * Writes the account directly — Better Auth's sign-up is closed
 * (`disableSignUp`), server calls included. One transaction, so an invite
 * never leaves a "user" without its password behind.
 */
export class BetterAuthStaffAccountProvisioner implements IStaffAccountProvisioner {
  constructor(private readonly db: Db) {}

  async provision(input: ProvisionStaffAccountInput): Promise<ProvisionStaffAccountOutput> {
    const userId = await this.db.transaction((tx) =>
      insertCredentialUser(tx, { email: input.email, name: input.name, role: input.role, password: input.password }),
    );
    return { userId };
  }
}
```

Em `container.ts`, troque `new BetterAuthStaffAccountProvisioner(auth, db)` por `new BetterAuthStaffAccountProvisioner(db)`. Atualize o doc comment de `IStaffAccountProvisioner` (`packages/domain/src/identity/ports/IStaffAccountProvisioner.ts`) para dizer que a conta é gravada direto (não mais "sign up, then set role").

`seed-admin.ts`, substitua o corpo de `main()` e o comentário acima dele:

```ts
// Bootstrap-only script: the first admin cannot come from
// PromoteUserRoleUseCase, since that usecase requires an existing admin to
// run it (CLAUDE.md §8). Writes the account directly
// (infra/auth/credentialAccount.ts) — Better Auth's sign-up is closed — and
// sets `role` to admin, the one place allowed to, because this never runs
// over HTTP.
//
// Rerunning is safe: an existing account is left as it is and only promoted.
async function main() {
  const existing = await container.db.execute(sql`select "id" from "user" where "email" = ${EMAIL.toLowerCase()}`);
  if (existing.rows.length === 0) {
    await insertCredentialUser(container.db, { email: EMAIL, name: NAME, role: "admin", password: PASSWORD });
    console.log(`Created ${EMAIL}`);
  } else {
    console.log(`${EMAIL} already exists — password left as it is`);
  }

  await container.db.execute(sql`update "user" set role = 'admin' where email = ${EMAIL.toLowerCase()}`);
  console.log(`${EMAIL} is now admin`);

  process.exit(0);
}
```

com `import { insertCredentialUser } from "@/infra/auth/credentialAccount.js";`. O comentário de `PASSWORD` que fala do "default emailAndPassword policy" continua válido.

- [ ] **Step 6: Rodar e ver passar**

Run: `DATABASE_URL=postgres://ooc:ooc@localhost:5432/ooc_dev pnpm --filter @ooc/api exec vitest run --config vitest.integration.config.ts src/infra/auth/credentialAccount.integration.test.ts`
Expected: PASS (4 testes).

Run: `pnpm typecheck:api && pnpm test:api`
Expected: verde.

- [ ] **Step 7: Commit**

```bash
git add apps/api packages/domain/src/identity/ports/IStaffAccountProvisioner.ts
git commit -m "fix(api): close Better Auth's public sign-up and write accounts directly"
```

---

### Task 4: Domínio do acesso ao portal (tipos, tokens, e-mails, template)

**Files:**
- Create: `packages/domain/src/identity/portal/PortalAccess.ts`, `packages/domain/src/identity/portal/ports.ts`, `packages/domain/src/identity/portal/portalEmails.ts`
- Modify: `packages/domain/src/notification/EmailNotification.ts`, `packages/domain/src/index.ts`
- Modify: `packages/notifications/src/locales/{es-PE,pt-BR,en}.json`, `packages/notifications/src/render/renderEmail.ts:33-36`
- Modify: `apps/api/src/tests/email-templates.test.ts` (`SAMPLE_VARS`)
- Test: `apps/api/src/tests/portal-access.test.ts` (primeira parte)

**Interfaces:**
- Produces (todos exportados de `@ooc/domain`):

```ts
const PORTAL_ACTIVATION_TTL_DAYS = 7;
const PORTAL_RESET_TTL_MINUTES = 60;
const PORTAL_TOKEN_COOLDOWN_SECONDS = 60;
const PORTAL_SIGN_IN_SENTINEL_EMAIL = "no-account@invalid.local";
type PortalAccessTokenPurpose = "activation" | "reset";
type PortalAccessOutcome = "created" | "linked_existing" | "already_linked" | "email_conflict";
type PortalAccessState = "none" | "pending_activation" | "active";
type PortalIdentifier =
  | { method: "email"; email: string }
  | { method: "national_id"; nationalIdType: NationalIdType; nationalId: string };
interface PortalAccount { userId: string; email: string; name: string; hasPassword: boolean }
interface PortalIdentity { firstName: string; lastName: string; email: string }
interface PortalAccessToken { id: string; userId: string; purpose: PortalAccessTokenPurpose; expiresAt: Date; usedAt: Date | null }
interface NewPortalToken { token: string; tokenHash: string; purpose: PortalAccessTokenPurpose; expiresAt: Date }
function hashPortalToken(token: string): string;
function newPortalToken(purpose: PortalAccessTokenPurpose, now?: Date): NewPortalToken;
function parsePortalIdentifier(raw: unknown): PortalIdentifier | null;
function portalCredentialsEmail(account: PortalAccount, accessUrl: string, tokenId: string, locale: Locale): EmailNotification;
function portalPasswordResetEmail(account: PortalAccount, resetUrl: string, tokenId: string, locale: Locale): EmailNotification;
interface PortalAccountProvisioning {
  studentId: string; actorId: string; activation: NewPortalToken; at: Date;
  notify: (account: PortalAccount, tokenId: string) => EmailNotification[];
}
interface IssuePortalTokenRequest {
  userId: string; token: NewPortalToken; cooldownSince: Date | null;
  notify: (tokenId: string) => EmailNotification[];
}
interface IPortalAccessRepository {
  provision(request: PortalAccountProvisioning): Promise<PortalAccessOutcome>;
  findAccountByStudent(studentId: string): Promise<PortalAccount | null>;
  findAccountByIdentifier(identifier: PortalIdentifier): Promise<PortalAccount | null>;
  hasConfirmedEnrollment(studentId: string): Promise<boolean>;
  issueToken(request: IssuePortalTokenRequest): Promise<{ id: string } | null>;
  findToken(tokenHash: string): Promise<PortalAccessToken | null>;
  consumeToken(id: string): Promise<boolean>;
  findIdentity(userId: string): Promise<PortalIdentity | null>;
  accessState(studentId: string): Promise<PortalAccessState>;
}
interface IPortalLinkBuilder { access(token: string, locale: Locale): string }
interface IPortalPasswordSetter { setPassword(userId: string, plainPassword: string): Promise<void> }
```

- [ ] **Step 1: Escrever o teste que falha**

`apps/api/src/tests/portal-access.test.ts`:

```ts
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @ooc/api exec vitest run src/tests/portal-access.test.ts`
Expected: FAIL — exports inexistentes.

- [ ] **Step 3: Template `portal_password_reset` no domínio**

Em `EmailNotification.ts`, dentro de `EmailTemplateVars`, depois de `staff_password_reset`:

```ts
  /** A student asked for a new portal password (05/10/2026). */
  portal_password_reset: {
    recipientName: string;
    resetUrl: string;
  };
```

e acrescente `"portal_password_reset",` ao fim de `EMAIL_TEMPLATE_KEYS`. Troque o comentário de `portal_credentials` por `/** The portal account was created: the link sets the first password (never the password itself — outbox.vars is plain text). */`.

- [ ] **Step 4: `PortalAccess.ts`**

```ts
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { NationalIdTypeSchema, nationalIdIssue, normalizeEmail, normalizeNationalId, type NationalIdType } from "../../student/fields.js";

/** The copy of both e-mails names these durations — keep them in step
 * (packages/notifications/src/locales). */
export const PORTAL_ACTIVATION_TTL_DAYS = 7;
export const PORTAL_RESET_TTL_MINUTES = 60;
/** At most one e-mail per account in this window, however often it is asked for. */
export const PORTAL_TOKEN_COOLDOWN_SECONDS = 60;
/**
 * What sign-in is handed when the identifier matches no student account: an
 * address that cannot exist, so Better Auth still hashes the password and
 * answers the same error in the same time (anti-enumeration, CLAUDE.md §8).
 */
export const PORTAL_SIGN_IN_SENTINEL_EMAIL = "no-account@invalid.local";

export type PortalAccessTokenPurpose = "activation" | "reset";
export type PortalAccessOutcome = "created" | "linked_existing" | "already_linked" | "email_conflict";
export type PortalAccessState = "none" | "pending_activation" | "active";

/** The two doors to the same account (CLAUDE.md §1): the e-mail the
 * credentials went to, or the document the student enrolled with. Always
 * normalized — built only by `parsePortalIdentifier`. */
export type PortalIdentifier =
  | { method: "email"; email: string }
  | { method: "national_id"; nationalIdType: NationalIdType; nationalId: string };

export interface PortalAccount {
  userId: string;
  email: string;
  name: string;
  hasPassword: boolean;
}

export interface PortalIdentity {
  firstName: string;
  lastName: string;
  email: string;
}

export interface PortalAccessToken {
  id: string;
  userId: string;
  purpose: PortalAccessTokenPurpose;
  expiresAt: Date;
  usedAt: Date | null;
}

/** `token` travels only in the link; `tokenHash` is what is stored. */
export interface NewPortalToken {
  token: string;
  tokenHash: string;
  purpose: PortalAccessTokenPurpose;
  expiresAt: Date;
}

export function hashPortalToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newPortalToken(purpose: PortalAccessTokenPurpose, now: Date = new Date()): NewPortalToken {
  const token = randomBytes(32).toString("base64url");
  const ttlMs = purpose === "activation" ? PORTAL_ACTIVATION_TTL_DAYS * 86_400_000 : PORTAL_RESET_TTL_MINUTES * 60_000;
  return { token, tokenHash: hashPortalToken(token), purpose, expiresAt: new Date(now.getTime() + ttlMs) };
}

const RawIdentifierSchema = z.object({
  method: z.enum(["email", "national_id"]),
  identifier: z.string().max(254),
  nationalIdType: z.string().optional(),
});
const EmailFormat = z.string().min(1).email();

/**
 * Anything that is not a well-formed identifier is `null` — and the caller
 * answers it exactly like a wrong password: the screen never learns which
 * field was off.
 */
export function parsePortalIdentifier(raw: unknown): PortalIdentifier | null {
  const parsed = RawIdentifierSchema.safeParse(raw);
  if (!parsed.success) return null;

  if (parsed.data.method === "email") {
    const email = normalizeEmail(parsed.data.identifier);
    return EmailFormat.safeParse(email).success ? { method: "email", email } : null;
  }

  const type = NationalIdTypeSchema.safeParse(parsed.data.nationalIdType);
  if (!type.success) return null;
  const nationalId = normalizeNationalId(parsed.data.identifier);
  if (nationalId.length === 0 || nationalIdIssue(type.data, nationalId) !== null) return null;
  return { method: "national_id", nationalIdType: type.data, nationalId };
}
```

(Confirme em `packages/domain/src/student/fields.ts:85` que `nationalIdIssue(type, nationalId)` devolve `null` para documento válido; o teste do Step 1 cobre.)

- [ ] **Step 5: `ports.ts`**

```ts
import type { EmailNotification, Locale } from "../../notification/EmailNotification.js";
import type {
  NewPortalToken,
  PortalAccessOutcome,
  PortalAccessState,
  PortalAccessToken,
  PortalAccount,
  PortalIdentifier,
  PortalIdentity,
} from "./PortalAccess.js";

/** Creating the account for a student file — inside the payment settlement's
 * own transaction, or alone from the backoffice button. */
export interface PortalAccountProvisioning {
  studentId: string;
  actorId: string;
  activation: NewPortalToken;
  at: Date;
  /** Built once the account exists, with the stored token's id. */
  notify: (account: PortalAccount, tokenId: string) => EmailNotification[];
}

export interface IssuePortalTokenRequest {
  userId: string;
  token: NewPortalToken;
  /** Any token issued for the user after this instant → nothing is issued
   * (`null`). `null` skips the check (staff asked for it explicitly). */
  cooldownSince: Date | null;
  notify: (tokenId: string) => EmailNotification[];
}

export interface IPortalAccessRepository {
  /**
   * One transaction, locking the student row:
   * - the file already has an account → `already_linked`;
   * - another file with the same normalized document has one → this file is
   *   linked to it, no e-mail → `linked_existing`;
   * - the e-mail already belongs to another account → nothing, audit
   *   `portal_access.email_conflict` → `email_conflict`;
   * - otherwise: "user" (role student, no password), `students.user_id`, the
   *   activation token, the outbox rows of `notify`, audit
   *   `portal_access.created` → `created`.
   */
  provision(request: PortalAccountProvisioning): Promise<PortalAccessOutcome>;
  findAccountByStudent(studentId: string): Promise<PortalAccount | null>;
  /** Only a `student` account, not banned, with at least one live file linked
   * — an account nobody's file points at never signs in to the portal. */
  findAccountByIdentifier(identifier: PortalIdentifier): Promise<PortalAccount | null>;
  hasConfirmedEnrollment(studentId: string): Promise<boolean>;
  /** One transaction: cooldown check, pending tokens of the same user and
   * purpose marked used, the new token, the outbox rows of `notify`. */
  issueToken(request: IssuePortalTokenRequest): Promise<{ id: string } | null>;
  findToken(tokenHash: string): Promise<PortalAccessToken | null>;
  /** Marks it used only if it is still unused and unexpired; `false` when it
   * was not (a second click, a race). */
  consumeToken(id: string): Promise<boolean>;
  /** The newest live file linked to the account. */
  findIdentity(userId: string): Promise<PortalIdentity | null>;
  accessState(studentId: string): Promise<PortalAccessState>;
}

export interface IPortalLinkBuilder {
  /** The page that sets the password, for both purposes. */
  access(token: string, locale: Locale): string;
}

export interface IPortalPasswordSetter {
  /** Creates the credential on the first call, replaces it afterwards. */
  setPassword(userId: string, plainPassword: string): Promise<void>;
}
```

- [ ] **Step 6: `portalEmails.ts`**

```ts
import type { EmailNotification, Locale } from "../../notification/EmailNotification.js";
import type { PortalAccount } from "./PortalAccess.js";

/**
 * Both go to the account's own address and nobody else: they open the
 * student's account (CLAUDE.md §1 — never copied to the guardian,
 * `enrollmentEmails.ts`). The token id makes the dedupe key: the same link is
 * one e-mail, a new link is a new one.
 */
export function portalCredentialsEmail(
  account: PortalAccount,
  accessUrl: string,
  tokenId: string,
  locale: Locale,
): EmailNotification {
  return {
    templateKey: "portal_credentials",
    to: account.email,
    locale,
    vars: { recipientName: account.name, loginEmail: account.email, accessUrl },
    dedupeKey: `portal_credentials:${account.userId}:${tokenId}`,
  };
}

export function portalPasswordResetEmail(
  account: PortalAccount,
  resetUrl: string,
  tokenId: string,
  locale: Locale,
): EmailNotification {
  return {
    templateKey: "portal_password_reset",
    to: account.email,
    locale,
    vars: { recipientName: account.name, resetUrl },
    dedupeKey: `portal_password_reset:${account.userId}:${tokenId}`,
  };
}
```

- [ ] **Step 7: Exports em `packages/domain/src/index.ts`**

```ts
export {
  PORTAL_ACTIVATION_TTL_DAYS,
  PORTAL_RESET_TTL_MINUTES,
  PORTAL_SIGN_IN_SENTINEL_EMAIL,
  PORTAL_TOKEN_COOLDOWN_SECONDS,
  hashPortalToken,
  newPortalToken,
  parsePortalIdentifier,
} from "./identity/portal/PortalAccess.js";
export type {
  NewPortalToken,
  PortalAccessOutcome,
  PortalAccessState,
  PortalAccessToken,
  PortalAccessTokenPurpose,
  PortalAccount,
  PortalIdentifier,
  PortalIdentity,
} from "./identity/portal/PortalAccess.js";
export type {
  IPortalAccessRepository,
  IPortalLinkBuilder,
  IPortalPasswordSetter,
  IssuePortalTokenRequest,
  PortalAccountProvisioning,
} from "./identity/portal/ports.js";
export { portalCredentialsEmail, portalPasswordResetEmail } from "./identity/portal/portalEmails.js";
```

- [ ] **Step 8: Locales de e-mail + botão**

Em `renderEmail.ts`, `ACTION_URL_VAR` ganha `portal_password_reset: "resetUrl",`.

Nos três `packages/notifications/src/locales/*.json`, substitua `portal_credentials` e acrescente `portal_password_reset` depois de `staff_password_reset`:

es-PE:
```json
    "portal_credentials": {
      "subject": "Activa tu acceso al portal del alumno de Only One Coin",
      "preheader": "Crea tu contraseña para ingresar.",
      "paragraphs": [
        "Tu matrícula fue aprobada y tu cuenta en el portal del alumno ya está creada.",
        "Tu usuario es {loginEmail}. También puedes ingresar con el documento que usaste en tu matrícula.",
        "Usa el botón de abajo para crear tu contraseña. El enlace vale por siete días y solo se puede usar una vez."
      ],
      "action": "Crear mi contraseña"
    },
```
```json
    "portal_password_reset": {
      "subject": "Restablece tu contraseña del portal del alumno",
      "preheader": "El enlace vale por una hora.",
      "paragraphs": [
        "Recibimos un pedido para restablecer la contraseña de tu cuenta en el portal del alumno de Only One Coin.",
        "Usa el botón de abajo para crear una contraseña nueva. El enlace vale por una hora y solo se puede usar una vez.",
        "Si no lo pediste, ignora este correo: tu contraseña sigue siendo la misma."
      ],
      "action": "Crear contraseña nueva"
    }
```

pt-BR:
```json
    "portal_credentials": {
      "subject": "Ative seu acesso ao portal do aluno da Only One Coin",
      "preheader": "Crie sua senha para entrar.",
      "paragraphs": [
        "Sua matrícula foi aprovada e sua conta no portal do aluno já está criada.",
        "Seu usuário é {loginEmail}. Você também pode entrar com o documento usado na matrícula.",
        "Use o botão abaixo para criar sua senha. O link vale por sete dias e só pode ser usado uma vez."
      ],
      "action": "Criar minha senha"
    },
```
```json
    "portal_password_reset": {
      "subject": "Redefina sua senha do portal do aluno",
      "preheader": "O link vale por uma hora.",
      "paragraphs": [
        "Recebemos um pedido para redefinir a senha da sua conta no portal do aluno da Only One Coin.",
        "Use o botão abaixo para criar uma senha nova. O link vale por uma hora e só pode ser usado uma vez.",
        "Se você não pediu, ignore este e-mail: sua senha continua a mesma."
      ],
      "action": "Criar senha nova"
    }
```

en:
```json
    "portal_credentials": {
      "subject": "Activate your Only One Coin student portal access",
      "preheader": "Create your password to sign in.",
      "paragraphs": [
        "Your enrollment was approved and your student portal account is ready.",
        "Your username is {loginEmail}. You can also sign in with the document you enrolled with.",
        "Use the button below to create your password. The link is valid for seven days and works only once."
      ],
      "action": "Create my password"
    },
```
```json
    "portal_password_reset": {
      "subject": "Reset your student portal password",
      "preheader": "The link is valid for one hour.",
      "paragraphs": [
        "We received a request to reset the password of your Only One Coin student portal account.",
        "Use the button below to create a new password. The link is valid for one hour and works only once.",
        "If you didn't ask for this, ignore this e-mail: your password stays the same."
      ],
      "action": "Create a new password"
    }
```

Em `apps/api/src/tests/email-templates.test.ts`, `SAMPLE_VARS` ganha:

```ts
  portal_password_reset: {
    recipientName: "Ana Quispe",
    resetUrl: "https://student.onlyonecoin.edu.pe/access/abc123",
  },
```

- [ ] **Step 9: Rodar e ver passar**

Run: `pnpm --filter @ooc/api exec vitest run src/tests/portal-access.test.ts src/tests/email-templates.test.ts`
Expected: PASS. (O teste "have a template for every key the domain can emit" garante que o template novo existe nos três locales.)

Run: `pnpm typecheck:domain && pnpm typecheck:api`

- [ ] **Step 10: Commit**

```bash
git add packages/domain packages/notifications apps/api/src/tests/portal-access.test.ts apps/api/src/tests/email-templates.test.ts
git commit -m "feat(domain): model student portal access, one-time tokens and their e-mails"
```

---

### Task 5: Repositório Drizzle do acesso ao portal

**Files:**
- Create: `apps/api/src/infra/persistence/portal/provisionPortalAccount.ts`
- Create: `apps/api/src/infra/persistence/portal/DrizzlePortalAccessRepository.ts`
- Create: `apps/api/src/infra/identity/BetterAuthPortalPasswordSetter.ts`, `apps/api/src/infra/identity/PortalLinkBuilder.ts`
- Test: `apps/api/src/infra/persistence/portal/DrizzlePortalAccessRepository.integration.test.ts`

**Interfaces:**
- Consumes: `IPortalAccessRepository`, `PortalAccountProvisioning`, `IssuePortalTokenRequest` (Task 4); `insertPasswordlessUser`, `upsertCredentialPassword`, `SqlExecutor` (Task 3); `insertOutboxEmails` (existente).
- Produces: `provisionPortalAccount(tx: Tx, request: PortalAccountProvisioning): Promise<PortalAccessOutcome>`; `class DrizzlePortalAccessRepository implements IPortalAccessRepository` (`constructor(db: Db)`); `class BetterAuthPortalPasswordSetter implements IPortalPasswordSetter` (`constructor(db: Db)`); `class PortalLinkBuilder implements IPortalLinkBuilder` (`constructor(portalOrigin: string)`).

- [ ] **Step 1: Escrever o teste de integração que falha**

`DrizzlePortalAccessRepository.integration.test.ts`:

```ts
import * as schema from "@ooc/db";
import { academicPeriods, auditLog, classGroups, courses, enrollments, outbox, planPrices, plans, portalAccessTokens, students } from "@ooc/db";
import { newPortalToken, portalCredentialsEmail, type PortalAccountProvisioning } from "@ooc/domain";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/infra/db/client.js";
import { insertPasswordlessUser, upsertCredentialPassword } from "@/infra/auth/credentialAccount.js";
import { DrizzlePortalAccessRepository } from "./DrizzlePortalAccessRepository.js";
import { provisionPortalAccount } from "./provisionPortalAccount.js";

/**
 * The SQL behind student portal access. `students`, `audit_log` are under the
 * delete lock (0011): every test runs inside a transaction that is always
 * rolled back, and the repository is built on that transaction.
 */

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required for this suite.");

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

async function rolledBack(fn: (tx: Tx, repo: DrizzlePortalAccessRepository) => Promise<void>): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      await fn(tx, new DrizzlePortalAccessRepository(tx as unknown as Db));
      throw new RolledBack();
    });
  } catch (error) {
    if (!(error instanceof RolledBack)) throw error;
  }
}

async function insertStudent(tx: Tx, overrides: Partial<typeof students.$inferInsert> = {}): Promise<string> {
  const [row] = await tx
    .insert(students)
    .values({
      firstName: "Ana",
      lastName: "Quispe",
      nationalIdType: "DNI",
      nationalId: "12345678",
      email: "ana.quispe@gmail.com",
      phone: "999999999",
      birthDate: new Date("2010-05-01T00:00:00.000Z"),
      country: "PE",
      city: "Lima",
      ...overrides,
    })
    .returning({ id: students.id });
  return row!.id;
}

function provisioning(studentId: string): PortalAccountProvisioning {
  const activation = newPortalToken("activation");
  return {
    studentId,
    actorId: "usr_billing",
    activation,
    at: new Date(),
    notify: (account, tokenId) => [portalCredentialsEmail(account, `https://student.test/access/${activation.token}`, tokenId, "es-PE")],
  };
}

describe("provisionPortalAccount", () => {
  it("creates a passwordless student account, links the file, stores the token hash and queues the e-mail", async () => {
    await rolledBack(async (tx, repo) => {
      const studentId = await insertStudent(tx);
      const request = provisioning(studentId);

      expect(await provisionPortalAccount(tx, request)).toBe("created");

      const [student] = await tx.select({ userId: students.userId }).from(students).where(eq(students.id, studentId));
      expect(student!.userId).toBeTruthy();
      const account = await repo.findAccountByStudent(studentId);
      expect(account).toEqual({ userId: student!.userId, email: "ana.quispe@gmail.com", name: "Ana Quispe", hasPassword: false });

      const tokens = await tx.select().from(portalAccessTokens).where(eq(portalAccessTokens.userId, student!.userId!));
      expect(tokens).toHaveLength(1);
      expect(tokens[0]!.tokenHash).toBe(request.activation.tokenHash);
      expect(tokens[0]!.purpose).toBe("activation");

      const mails = await tx.select().from(outbox).where(eq(outbox.recipient, "ana.quispe@gmail.com"));
      expect(mails.map((m) => m.templateKey)).toEqual(["portal_credentials"]);
      expect(JSON.stringify(mails[0]!.vars)).not.toContain(request.activation.tokenHash);

      const audits = await tx.select().from(auditLog).where(eq(auditLog.targetId, studentId));
      expect(audits.map((a) => a.action)).toContain("portal_access.created");
    });
  });

  it("does nothing the second time", async () => {
    await rolledBack(async (tx) => {
      const studentId = await insertStudent(tx);
      await provisionPortalAccount(tx, provisioning(studentId));
      expect(await provisionPortalAccount(tx, provisioning(studentId))).toBe("already_linked");
      const mails = await tx.select().from(outbox).where(eq(outbox.recipient, "ana.quispe@gmail.com"));
      expect(mails).toHaveLength(1);
    });
  });

  it("links a duplicate file of the same document — dots and all — to the existing account", async () => {
    await rolledBack(async (tx) => {
      const first = await insertStudent(tx);
      await provisionPortalAccount(tx, provisioning(first));
      const twin = await insertStudent(tx, { nationalId: "12.345.678", email: "otra.cuenta@gmail.com" });

      expect(await provisionPortalAccount(tx, provisioning(twin))).toBe("linked_existing");

      const rows = await tx.select({ id: students.id, userId: students.userId }).from(students).where(sql`${students.id} in (${first}, ${twin})`);
      expect(new Set(rows.map((r) => r.userId)).size).toBe(1);
      const mails = await tx.select().from(outbox).where(eq(outbox.recipient, "otra.cuenta@gmail.com"));
      expect(mails).toHaveLength(0);
    });
  });

  it("creates nothing when the e-mail belongs to someone else, and says so", async () => {
    await rolledBack(async (tx) => {
      await insertPasswordlessUser(tx, { email: "Ana.Quispe@gmail.com", name: "Hermana", role: "student" });
      const studentId = await insertStudent(tx);

      expect(await provisionPortalAccount(tx, provisioning(studentId))).toBe("email_conflict");

      const [student] = await tx.select({ userId: students.userId }).from(students).where(eq(students.id, studentId));
      expect(student!.userId).toBeNull();
      const audits = await tx.select().from(auditLog).where(eq(auditLog.targetId, studentId));
      expect(audits.map((a) => a.action)).toEqual(["portal_access.email_conflict"]);
    });
  });
});

describe("DrizzlePortalAccessRepository", () => {
  it("finds the account by e-mail or by document only while a live file points at it", async () => {
    await rolledBack(async (tx, repo) => {
      const studentId = await insertStudent(tx, { nationalId: "87.654.321" });
      await provisionPortalAccount(tx, provisioning(studentId));

      const byEmail = await repo.findAccountByIdentifier({ method: "email", email: "ana.quispe@gmail.com" });
      const byDocument = await repo.findAccountByIdentifier({ method: "national_id", nationalIdType: "DNI", nationalId: "87654321" });
      expect(byEmail?.userId).toBeTruthy();
      expect(byDocument?.userId).toBe(byEmail?.userId);
      expect(await repo.findAccountByIdentifier({ method: "national_id", nationalIdType: "CE", nationalId: "87654321" })).toBeNull();

      // An account no file points at (the old open sign-up) never signs in.
      await insertPasswordlessUser(tx, { email: "orphan@gmail.com", name: "Orphan", role: "student" });
      expect(await repo.findAccountByIdentifier({ method: "email", email: "orphan@gmail.com" })).toBeNull();
    });
  });

  it("issues a token, honours the cooldown, and keeps only the newest link alive", async () => {
    await rolledBack(async (tx, repo) => {
      const userId = await insertPasswordlessUser(tx, { email: "beto@gmail.com", name: "Beto", role: "student" });
      const first = newPortalToken("reset");
      const issued = await repo.issueToken({ userId, token: first, cooldownSince: null, notify: () => [] });
      expect(issued?.id).toBeTruthy();

      const blocked = await repo.issueToken({
        userId,
        token: newPortalToken("reset"),
        cooldownSince: new Date(Date.now() - 60_000),
        notify: () => [],
      });
      expect(blocked).toBeNull();

      const second = newPortalToken("reset");
      await repo.issueToken({ userId, token: second, cooldownSince: null, notify: () => [] });
      expect((await repo.findToken(first.tokenHash))?.usedAt).not.toBeNull();
      const live = await repo.findToken(second.tokenHash);
      expect(live?.usedAt).toBeNull();

      expect(await repo.consumeToken(live!.id)).toBe(true);
      expect(await repo.consumeToken(live!.id)).toBe(false);
    });
  });

  it("reports the access state and the identity behind an account", async () => {
    await rolledBack(async (tx, repo) => {
      const studentId = await insertStudent(tx);
      expect(await repo.accessState(studentId)).toBe("none");
      await provisionPortalAccount(tx, provisioning(studentId));
      expect(await repo.accessState(studentId)).toBe("pending_activation");

      const account = await repo.findAccountByStudent(studentId);
      await upsertCredentialPassword(tx, account!.userId, "first-pass-12");
      expect(await repo.accessState(studentId)).toBe("active");
      expect(await repo.findIdentity(account!.userId)).toEqual({ firstName: "Ana", lastName: "Quispe", email: "ana.quispe@gmail.com" });
    });
  });

  it("knows whether the student has a confirmed seat", async () => {
    await rolledBack(async (tx, repo) => {
      const studentId = await insertStudent(tx);
      expect(await repo.hasConfirmedEnrollment(studentId)).toBe(false);
      await seedConfirmedEnrollment(tx, studentId);
      expect(await repo.hasConfirmedEnrollment(studentId)).toBe(true);
    });
  });
});

async function seedConfirmedEnrollment(tx: Tx, studentId: string): Promise<void> {
  const [period] = await tx
    .insert(academicPeriods)
    .values({ name: "Ciclo (portal integration)", startsOn: new Date("2026-03-01T00:00:00.000Z"), endsOn: new Date("2026-07-31T00:00:00.000Z") })
    .returning({ id: academicPeriods.id });
  const [course] = await tx.insert(courses).values({ name: "Curso (portal integration)", language: "Prueba", minAge: 10 }).returning({ id: courses.id });
  const [plan] = await tx.insert(plans).values({ courseId: course!.id, name: "Paquete" }).returning({ id: plans.id });
  const [price] = await tx.insert(planPrices).values({ planId: plan!.id, amountCents: 15000 }).returning({ id: planPrices.id });
  const [group] = await tx
    .insert(classGroups)
    .values({
      courseId: course!.id,
      academicPeriodId: period!.id,
      schedule: "Lun 19:00",
      startsOn: new Date("2026-03-02T00:00:00.000Z"),
      endsOn: new Date("2026-06-30T00:00:00.000Z"),
      capacity: 10,
      seatsTaken: 1,
    })
    .returning({ id: classGroups.id });
  await tx.insert(enrollments).values({ studentId, classGroupId: group!.id, planId: plan!.id, planPriceId: price!.id, seatStatus: "confirmed" });
}
```

> `enrollments` pode exigir mais colunas `notNull` (ex.: `source`, `modality`). Antes de rodar, abra `DrizzlePaymentSettlementRepository.integration.test.ts` e copie dele o `insert(enrollments).values(...)` que já funciona, trocando só `studentId`, `classGroupId` e `seatStatus`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `DATABASE_URL=postgres://ooc:ooc@localhost:5432/ooc_dev pnpm --filter @ooc/api exec vitest run --config vitest.integration.config.ts src/infra/persistence/portal`
Expected: FAIL — módulos inexistentes.

- [ ] **Step 3: `provisionPortalAccount.ts`**

```ts
import { auditLog, portalAccessTokens, students } from "@ooc/db";
import { normalizeEmail, normalizeNationalId, type PortalAccessOutcome, type PortalAccountProvisioning } from "@ooc/domain";
import { and, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";
import { insertPasswordlessUser } from "@/infra/auth/credentialAccount.js";
import { insertOutboxEmails } from "@/infra/persistence/notification/DrizzleOutboxRepository.js";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** The document as `normalizeNationalId` writes it, computed in SQL — so a
 * file written before OOC-64 (dots, dashes) matches too. Same expression as
 * the `students_portal_national_id_idx` index (0022). */
export const normalizedNationalIdSql = sql`regexp_replace(upper(${students.nationalId}), '[[:space:].-]', '', 'g')`;

/**
 * Creates the student's portal account inside the caller's transaction —
 * the payment settlement's, so the account, its link and its e-mail commit or
 * roll back with the approval (spec §2). Locks the student row first: two
 * approvals of the same student serialize here.
 */
export async function provisionPortalAccount(tx: Tx, request: PortalAccountProvisioning): Promise<PortalAccessOutcome> {
  const [student] = await tx
    .select({
      id: students.id,
      userId: students.userId,
      firstName: students.firstName,
      lastName: students.lastName,
      email: students.email,
      nationalIdType: students.nationalIdType,
      nationalId: students.nationalId,
    })
    .from(students)
    .where(eq(students.id, request.studentId))
    .for("update");
  if (!student) throw new Error(`provisionPortalAccount: no student ${request.studentId}`);
  if (student.userId) return "already_linked";

  const [twin] = await tx
    .select({ userId: students.userId })
    .from(students)
    .where(
      and(
        ne(students.id, student.id),
        isNotNull(students.userId),
        isNull(students.deletedAt),
        eq(students.nationalIdType, student.nationalIdType),
        sql`${normalizedNationalIdSql} = ${normalizeNationalId(student.nationalId)}`,
      ),
    )
    .limit(1);
  if (twin?.userId) {
    await tx.update(students).set({ userId: twin.userId, updatedAt: sql`now()` }).where(eq(students.id, student.id));
    return "linked_existing";
  }

  const email = normalizeEmail(student.email);
  const taken = await tx.execute(sql`select 1 from "user" where "email" = ${email} limit 1`);
  if (taken.rows.length > 0) {
    await tx.insert(auditLog).values({
      actorId: request.actorId,
      action: "portal_access.email_conflict",
      targetId: student.id,
      metadata: {},
      createdAt: request.at,
    });
    return "email_conflict";
  }

  const name = `${student.firstName} ${student.lastName}`;
  const userId = await insertPasswordlessUser(tx, { email, name, role: "student" });
  await tx.update(students).set({ userId, updatedAt: sql`now()` }).where(eq(students.id, student.id));
  const [token] = await tx
    .insert(portalAccessTokens)
    .values({
      userId,
      tokenHash: request.activation.tokenHash,
      purpose: request.activation.purpose,
      expiresAt: request.activation.expiresAt,
    })
    .returning({ id: portalAccessTokens.id });
  await insertOutboxEmails(tx, request.notify({ userId, email, name, hasPassword: false }, token!.id));
  await tx.insert(auditLog).values({
    actorId: request.actorId,
    action: "portal_access.created",
    targetId: student.id,
    metadata: { userId },
    createdAt: request.at,
  });
  return "created";
}
```

(Confirme que `students` tem `updatedAt` — `softDeletable()` inclui `timestamps()`. Se `.for("update")` não existir na versão do Drizzle do repo, troque por `sql` cru `select ... for update`.)

- [ ] **Step 4: `DrizzlePortalAccessRepository.ts`**

```ts
import { enrollments, portalAccessTokens, students } from "@ooc/db";
import type {
  IPortalAccessRepository,
  IssuePortalTokenRequest,
  PortalAccessOutcome,
  PortalAccessState,
  PortalAccessToken,
  PortalAccountProvisioning,
  PortalAccount,
  PortalIdentifier,
  PortalIdentity,
} from "@ooc/domain";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";
import { insertOutboxEmails } from "@/infra/persistence/notification/DrizzleOutboxRepository.js";
import { normalizedNationalIdSql, provisionPortalAccount } from "./provisionPortalAccount.js";

type AccountRow = { id: string; email: string; name: string; has_password: boolean };

const ACCOUNT_COLUMNS = sql`u."id", u."email", u."name",
  exists (select 1 from "account" a where a."userId" = u."id" and a."providerId" = 'credential' and a."password" is not null) as has_password`;

function toAccount(row: AccountRow): PortalAccount {
  return { userId: row.id, email: row.email, name: row.name, hasPassword: row.has_password };
}

export class DrizzlePortalAccessRepository implements IPortalAccessRepository {
  constructor(private readonly db: Db) {}

  provision(request: PortalAccountProvisioning): Promise<PortalAccessOutcome> {
    return this.db.transaction((tx) => provisionPortalAccount(tx, request));
  }

  async findAccountByStudent(studentId: string): Promise<PortalAccount | null> {
    const result = await this.db.execute<AccountRow>(
      sql`select ${ACCOUNT_COLUMNS} from "students" s join "user" u on u."id" = s."user_id"
          where s."id" = ${studentId} and u."role" = 'student' limit 1`,
    );
    return result.rows[0] ? toAccount(result.rows[0]) : null;
  }

  async findAccountByIdentifier(identifier: PortalIdentifier): Promise<PortalAccount | null> {
    const fileMatches =
      identifier.method === "email"
        ? sql`u."email" = ${identifier.email}`
        : sql`s."national_id_type" = ${identifier.nationalIdType} and ${sql.raw(`regexp_replace(upper(s."national_id"), '[[:space:].-]', '', 'g')`)} = ${identifier.nationalId}`;
    const result = await this.db.execute<AccountRow>(
      sql`select ${ACCOUNT_COLUMNS} from "user" u
          join "students" s on s."user_id" = u."id" and s."deleted_at" is null
          where u."role" = 'student' and coalesce(u."banned", false) = false and ${fileMatches}
          limit 1`,
    );
    return result.rows[0] ? toAccount(result.rows[0]) : null;
  }

  async hasConfirmedEnrollment(studentId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.studentId, studentId), eq(enrollments.seatStatus, "confirmed"), isNull(enrollments.deletedAt)))
      .limit(1);
    return Boolean(row);
  }

  issueToken(request: IssuePortalTokenRequest): Promise<{ id: string } | null> {
    return this.db.transaction(async (tx) => {
      if (request.cooldownSince) {
        const [recent] = await tx
          .select({ id: portalAccessTokens.id })
          .from(portalAccessTokens)
          .where(and(eq(portalAccessTokens.userId, request.userId), gt(portalAccessTokens.createdAt, request.cooldownSince)))
          .limit(1);
        if (recent) return null;
      }
      await tx
        .update(portalAccessTokens)
        .set({ usedAt: sql`now()`, updatedAt: sql`now()` })
        .where(
          and(
            eq(portalAccessTokens.userId, request.userId),
            eq(portalAccessTokens.purpose, request.token.purpose),
            isNull(portalAccessTokens.usedAt),
          ),
        );
      const [token] = await tx
        .insert(portalAccessTokens)
        .values({
          userId: request.userId,
          tokenHash: request.token.tokenHash,
          purpose: request.token.purpose,
          expiresAt: request.token.expiresAt,
        })
        .returning({ id: portalAccessTokens.id });
      await insertOutboxEmails(tx, request.notify(token!.id));
      return { id: token!.id };
    });
  }

  async findToken(tokenHash: string): Promise<PortalAccessToken | null> {
    const [row] = await this.db
      .select({
        id: portalAccessTokens.id,
        userId: portalAccessTokens.userId,
        purpose: portalAccessTokens.purpose,
        expiresAt: portalAccessTokens.expiresAt,
        usedAt: portalAccessTokens.usedAt,
      })
      .from(portalAccessTokens)
      .where(eq(portalAccessTokens.tokenHash, tokenHash))
      .limit(1);
    return row ? { ...row, purpose: row.purpose as PortalAccessToken["purpose"] } : null;
  }

  async consumeToken(id: string): Promise<boolean> {
    const moved = await this.db
      .update(portalAccessTokens)
      .set({ usedAt: sql`now()`, updatedAt: sql`now()` })
      .where(and(eq(portalAccessTokens.id, id), isNull(portalAccessTokens.usedAt), gt(portalAccessTokens.expiresAt, sql`now()`)))
      .returning({ id: portalAccessTokens.id });
    return moved.length > 0;
  }

  async findIdentity(userId: string): Promise<PortalIdentity | null> {
    const [row] = await this.db
      .select({ firstName: students.firstName, lastName: students.lastName, email: students.email })
      .from(students)
      .where(and(eq(students.userId, userId), isNull(students.deletedAt)))
      .orderBy(desc(students.createdAt))
      .limit(1);
    return row ?? null;
  }

  async accessState(studentId: string): Promise<PortalAccessState> {
    const account = await this.findAccountByStudent(studentId);
    if (!account) return "none";
    return account.hasPassword ? "active" : "pending_activation";
  }
}
```

`normalizedNationalIdSql` é importado mas a busca por documento usa o alias `s` em SQL cru; remova o import se o lint reclamar de não usado. A expressão tem de ser **idêntica** à do índice (`regexp_replace(upper(...), '[[:space:].-]', '', 'g')`).

- [ ] **Step 5: `BetterAuthPortalPasswordSetter.ts` e `PortalLinkBuilder.ts`**

```ts
import type { IPortalPasswordSetter } from "@ooc/domain";
import type { Db } from "@/infra/db/client.js";
import { upsertCredentialPassword } from "@/infra/auth/credentialAccount.js";

/** A student account is born without a credential row (it is created on
 * approval, before anyone picks a password), so this upserts — unlike the
 * staff setter, which always finds one. */
export class BetterAuthPortalPasswordSetter implements IPortalPasswordSetter {
  constructor(private readonly db: Db) {}

  setPassword(userId: string, plainPassword: string): Promise<void> {
    return upsertCredentialPassword(this.db, userId, plainPassword);
  }
}
```

```ts
import type { IPortalLinkBuilder, Locale } from "@ooc/domain";

/** apps/app routes on short codes with the default unprefixed (same table as
 * BackofficePasswordResetLinkBuilder). */
const APP_LOCALE_PREFIX: Record<Locale, string> = { "es-PE": "", "pt-BR": "/pt", en: "/en" };

/** `/[locale]/access/[token]` on the student portal's public origin — the
 * page sets the password for both an activation and a reset. */
export class PortalLinkBuilder implements IPortalLinkBuilder {
  constructor(private readonly portalOrigin: string) {}

  access(token: string, locale: Locale): string {
    return `${this.portalOrigin}${APP_LOCALE_PREFIX[locale]}/access/${encodeURIComponent(token)}`;
  }
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `DATABASE_URL=postgres://ooc:ooc@localhost:5432/ooc_dev pnpm --filter @ooc/api exec vitest run --config vitest.integration.config.ts src/infra/persistence/portal`
Expected: PASS (8 testes).

Run: `pnpm typecheck:api && pnpm lint`

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/infra
git commit -m "feat(api): persist student portal accounts and their one-time links"
```

---

### Task 6: A aprovação do pagamento cria a conta

**Files:**
- Modify: `packages/domain/src/enrollment/PaymentSettlement.ts`, `packages/domain/src/enrollment/SettlePaymentUseCase.ts`
- Modify: `apps/api/src/infra/persistence/payment/DrizzlePaymentSettlementRepository.ts`
- Modify: `apps/api/src/http/payment/SettlePaymentRoute.ts`, `apps/api/src/container.ts:436`
- Test: `apps/api/src/tests/settle-payment.test.ts`, `apps/api/src/infra/persistence/payment/DrizzlePaymentSettlementRepository.integration.test.ts`

**Interfaces:**
- Consumes: `PortalAccountProvisioning`, `PortalAccessOutcome`, `IPortalLinkBuilder`, `newPortalToken`, `portalCredentialsEmail` (Task 4); `provisionPortalAccount` (Task 5).
- Produces: `IPaymentSettlementRepository.settle(params & { portalAccess: PortalAccountProvisioning | null }): Promise<{ seatStatus: SeatStatus; portalAccess: PortalAccessOutcome | null }>`; `SettlePaymentOutput.portalAccess: PortalAccessOutcome | null`; `new SettlePaymentUseCase(settlements, emailContextLookup, portalLinkBuilder)`; resposta de `/payments/:id/approve|reject` ganha `portalAccess`.

- [ ] **Step 1: Testes de domínio que falham**

Em `settle-payment.test.ts`:
- `FakeSettlementRepository.settle` passa a devolver `{ seatStatus, portalAccess: params.portalAccess ? this.portalOutcome : null }`, com `public portalOutcome: PortalAccessOutcome = "created"` na classe.
- Acrescente uma fake de link e passe-a no `beforeEach`:

```ts
class FakePortalLinkBuilder implements IPortalLinkBuilder {
  access(token: string, locale: Locale) {
    return `https://student.test/${locale}/access/${token}`;
  }
}
// beforeEach:
useCase = new SettlePaymentUseCase(repository, new FakeEmailContextLookup(MINOR_CONTEXT), new FakePortalLinkBuilder());
```

(importe `IPortalLinkBuilder`, `Locale`, `PortalAccessOutcome`, `PortalAccount` de `@ooc/domain`). O primeiro teste passa a esperar `portalAccess: "created"` no resultado. Novos testes:

```ts
  it("asks for the student's portal account on approval, with a credentials e-mail behind a link", async () => {
    await useCase.run({ actorId: ACTOR, paymentId: PAYMENT, decision: { kind: "approve" } });

    const request = repository.settled[0]!.portalAccess!;
    expect(request.studentId).toBe(target().studentId);
    expect(request.actorId).toBe(ACTOR);
    expect(request.activation.purpose).toBe("activation");

    const account: PortalAccount = { userId: "usr_ana", email: "ana@gmail.com", name: "Ana Quispe", hasPassword: false };
    expect(request.notify(account, "tok_1")).toEqual([
      expect.objectContaining({
        templateKey: "portal_credentials",
        to: "ana@gmail.com",
        vars: expect.objectContaining({ accessUrl: `https://student.test/es-PE/access/${request.activation.token}` }),
      }),
    ]);
  });

  it("never asks for an account on a rejection", async () => {
    const result = await useCase.run({
      actorId: ACTOR,
      paymentId: PAYMENT,
      decision: { kind: "reject", reason: "illegible", note: "" },
    });
    expect(repository.settled[0]!.portalAccess).toBeNull();
    expect(result.portalAccess).toBeNull();
  });

  it("passes an e-mail conflict through without failing the approval", async () => {
    repository.portalOutcome = "email_conflict";
    const result = await useCase.run({ actorId: ACTOR, paymentId: PAYMENT, decision: { kind: "approve" } });
    expect(result).toMatchObject({ status: "approved", seatStatus: "confirmed", portalAccess: "email_conflict" });
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @ooc/api exec vitest run src/tests/settle-payment.test.ts`
Expected: FAIL (construtor/tipos).

- [ ] **Step 3: Domínio**

`PaymentSettlement.ts` — importe `PortalAccessOutcome` e `PortalAccountProvisioning` (de `../identity/portal/PortalAccess.js` e `../identity/portal/ports.js`); em `settle`:

```ts
  settle(params: {
    paymentId: string;
    enrollmentId: string;
    classGroupId: string;
    to: "approved" | "rejected";
    notifications: EmailNotification[];
    audit: AuditLogEntry;
    /** Approving only: create the student's portal account in the same
     * transaction (spec 2026-10-05 §2). Never fails the settlement — an
     * e-mail conflict comes back as an outcome. */
    portalAccess: PortalAccountProvisioning | null;
  }): Promise<{ seatStatus: SeatStatus; portalAccess: PortalAccessOutcome | null }>;
```

e acrescente ao doc comment do método: "The portal account, when asked for, in the same transaction."

`SettlePaymentUseCase.ts`:
- `SettlePaymentOutput` ganha `portalAccess: PortalAccessOutcome | null;`.
- Construtor ganha `private readonly portalLinkBuilder: IPortalLinkBuilder,`.
- Antes de `this.settlements.settle(...)`:

```ts
    // The first approval opens the portal (CLAUDE.md §1, reopened 05/10/2026):
    // the account is created with the settlement, and its e-mail carries a
    // link to set the password — never the password (outbox.vars is plain).
    const now = new Date();
    const activation = newPortalToken("activation", now);
    const portalAccess: PortalAccountProvisioning | null = approving
      ? {
          studentId: target.studentId,
          actorId: input.actorId,
          activation,
          at: now,
          notify: (account, tokenId) => [
            portalCredentialsEmail(account, this.portalLinkBuilder.access(activation.token, DEFAULT_LOCALE), tokenId, DEFAULT_LOCALE),
          ],
        }
      : null;
```

- Na chamada: `const { seatStatus, portalAccess: portalOutcome } = await this.settlements.settle({ ..., portalAccess });` e `return { paymentId: target.paymentId, status: to, seatStatus, portalAccess: portalOutcome };`.
- Doc comment da classe: acrescente "Approving also creates the student's portal account (first approval only — later ones find it linked)."

- [ ] **Step 4: Repositório**

Em `DrizzlePaymentSettlementRepository.settle`, depois de `insertOutboxEmails(tx, params.notifications);`:

```ts
      const portalAccess = params.portalAccess ? await provisionPortalAccount(tx, params.portalAccess) : null;
```

e `return { seatStatus, portalAccess };`. Tipo de retorno: `Promise<{ seatStatus: SeatStatus; portalAccess: PortalAccessOutcome | null }>`. Import: `import { provisionPortalAccount } from "@/infra/persistence/portal/provisionPortalAccount.js";` e `PortalAccessOutcome` de `@ooc/domain`.

- [ ] **Step 5: Rota e container**

`SettlePaymentRoute.ts` — `ResultSchema` ganha `portalAccess: z.enum(["created", "linked_existing", "already_linked", "email_conflict"]).nullable(),` e os dois handlers enviam `portalAccess: result.portalAccess`.

`container.ts` — antes de `settlePayment`:

```ts
  const portalLinkBuilder = new PortalLinkBuilder(config.PORTAL_PUBLIC_URL);
```

e `new SettlePaymentUseCase(paymentSettlementRepository, enrollmentEmailContextLookup, portalLinkBuilder)`.

`PORTAL_PUBLIC_URL` nasce **nesta task** (a Task 8 só consome): faça agora o Step 1 da Task 8 inteiro — o campo em `config.ts`, a linha no `env` de `apps/api/vitest.config.ts` e a do `.env.example`.

- [ ] **Step 6: Teste de integração da liquidação**

Em `DrizzlePaymentSettlementRepository.integration.test.ts`, toda chamada `settle({...})` existente ganha `portalAccess: null`. Acrescente:

```ts
  it("creates the student's portal account with the approval, and rolls it back with it", async () => {
    await rolledBack(async (tx) => {
      const { paymentId, enrollmentId, studentId } = await seedOpenPayment(tx); // use o helper que o arquivo já tem
      const repository = new DrizzlePaymentSettlementRepository(tx as unknown as Db);
      const activation = newPortalToken("activation");

      const result = await repository.settle({
        paymentId,
        enrollmentId,
        classGroupId: GROUP,
        to: "approved",
        notifications: [],
        audit: AUDIT,
        portalAccess: {
          studentId,
          actorId: "usr_billing",
          activation,
          at: new Date(),
          notify: (account, tokenId) => [portalCredentialsEmail(account, "https://student.test/access/x", tokenId, "es-PE")],
        },
      });

      expect(result).toEqual({ seatStatus: "confirmed", portalAccess: "created" });
      const [student] = await tx.select({ userId: students.userId }).from(students).where(eq(students.id, studentId));
      expect(student!.userId).toBeTruthy();
      const mails = await tx.select().from(outbox).where(eq(outbox.templateKey, "portal_credentials"));
      expect(mails).toHaveLength(1);
    });
  });
```

Adapte nomes ao que o arquivo já usa (`AUDIT`, o helper que cria aluno + matrícula + pagamento aberto). Se o helper não devolver `studentId`, faça-o devolver.

- [ ] **Step 7: Rodar tudo**

Run: `pnpm --filter @ooc/api exec vitest run src/tests/settle-payment.test.ts && DATABASE_URL=postgres://ooc:ooc@localhost:5432/ooc_dev pnpm --filter @ooc/api exec vitest run --config vitest.integration.config.ts src/infra/persistence/payment`
Expected: PASS.

Run: `pnpm typecheck:domain && pnpm typecheck:api`

- [ ] **Step 8: Commit**

```bash
git add packages/domain apps/api
git commit -m "feat: create the student's portal account when their first payment is approved"
```

---

### Task 7: Casos de uso do portal (login, recuperação, definir senha, reenviar acesso)

**Files:**
- Create: `packages/domain/src/identity/portal/ResolvePortalSignInEmailUseCase.ts`, `RequestPortalPasswordResetUseCase.ts`, `CompletePortalAccessUseCase.ts`, `IssuePortalAccessUseCase.ts`
- Modify: `packages/domain/src/index.ts`
- Test: `apps/api/src/tests/portal-access.test.ts` (acrescentar)

**Interfaces:**
- Consumes: Task 4 inteira; `IAuditLogRepository`, `IStaffSessionRevoker` (existentes); `meetsStudentPasswordPolicy` (Task 1); `HttpError`, `UnableToProcessEntryError`, `BaseUseCase`, `DEFAULT_LOCALE`.
- Produces:
  - `new ResolvePortalSignInEmailUseCase(repo)`; `run({ identifier: PortalIdentifier | null }): Promise<string>`
  - `new RequestPortalPasswordResetUseCase(repo, linkBuilder, auditLog)`; `run({ identifier: PortalIdentifier | null; locale: Locale }): Promise<void>`
  - `new CompletePortalAccessUseCase(repo, passwordSetter, sessionRevoker, auditLog)`; `run({ token: string; password: string }): Promise<{ userId: string; purpose: PortalAccessTokenPurpose }>`; erros `410 portal_access.link_invalid`, `422 portal_access.weak_password`
  - `new IssuePortalAccessUseCase(repo, linkBuilder, auditLog)`; `run({ actorId: string; studentId: string }): Promise<{ outcome: IssuePortalAccessOutcome }>` com `type IssuePortalAccessOutcome = PortalAccessOutcome | "activation_resent" | "reset_sent"`; erro `422 portal_access.no_confirmed_enrollment`

- [ ] **Step 1: Testes que falham**

Acrescente a `portal-access.test.ts`:

```ts
import {
  CompletePortalAccessUseCase,
  IssuePortalAccessUseCase,
  PORTAL_SIGN_IN_SENTINEL_EMAIL,
  RequestPortalPasswordResetUseCase,
  ResolvePortalSignInEmailUseCase,
  type AuditLogEntry,
  type EmailNotification,
  type IAuditLogRepository,
  type IPortalAccessRepository,
  type IPortalLinkBuilder,
  type IPortalPasswordSetter,
  type IStaffSessionRevoker,
  type IssuePortalTokenRequest,
  type Locale,
  type PortalAccessToken,
  type PortalAccountProvisioning,
  type PortalIdentifier,
} from "@ooc/domain";
import { beforeEach } from "vitest";

class FakePortalRepository implements IPortalAccessRepository {
  public accounts = new Map<string, PortalAccount>(); // by studentId
  public byIdentifier: PortalAccount | null = null;
  public confirmed = true;
  public tokens: (PortalAccessToken & { hash: string; createdAt: Date })[] = [];
  public outbox: EmailNotification[] = [];
  public provisioned: PortalAccountProvisioning[] = [];
  public provisionOutcome: Awaited<ReturnType<IPortalAccessRepository["provision"]>> = "created";

  async provision(request: PortalAccountProvisioning) {
    this.provisioned.push(request);
    if (this.provisionOutcome === "created") {
      const account = { userId: "usr_new", email: "ana@gmail.com", name: "Ana Quispe", hasPassword: false };
      this.accounts.set(request.studentId, account);
      this.outbox.push(...request.notify(account, "tok_created"));
    }
    if (this.provisionOutcome === "linked_existing") {
      this.accounts.set(request.studentId, { userId: "usr_twin", email: "ana@gmail.com", name: "Ana Quispe", hasPassword: true });
    }
    return this.provisionOutcome;
  }
  async findAccountByStudent(studentId: string) {
    return this.accounts.get(studentId) ?? null;
  }
  async findAccountByIdentifier(_identifier: PortalIdentifier) {
    return this.byIdentifier;
  }
  async hasConfirmedEnrollment() {
    return this.confirmed;
  }
  async issueToken(request: IssuePortalTokenRequest) {
    if (request.cooldownSince && this.tokens.some((t) => t.userId === request.userId && t.createdAt > request.cooldownSince!)) return null;
    const id = `tok_${this.tokens.length + 1}`;
    this.tokens.push({ id, userId: request.userId, purpose: request.token.purpose, expiresAt: request.token.expiresAt, usedAt: null, hash: request.token.tokenHash, createdAt: new Date() });
    this.outbox.push(...request.notify(id));
    return { id };
  }
  async findToken(tokenHash: string) {
    return this.tokens.find((t) => t.hash === tokenHash) ?? null;
  }
  async consumeToken(id: string) {
    const token = this.tokens.find((t) => t.id === id);
    if (!token || token.usedAt || token.expiresAt <= new Date()) return false;
    token.usedAt = new Date();
    return true;
  }
  async findIdentity() {
    return null;
  }
  async accessState() {
    return "none" as const;
  }
}

class FakeLinks implements IPortalLinkBuilder {
  access(token: string, locale: Locale) {
    return `https://student.test/${locale}/access/${token}`;
  }
}
class FakeAudit implements IAuditLogRepository {
  public entries: AuditLogEntry[] = [];
  async append(entry: AuditLogEntry) {
    this.entries.push(entry);
  }
}
class FakeSetter implements IPortalPasswordSetter {
  public calls: [string, string][] = [];
  async setPassword(userId: string, password: string) {
    this.calls.push([userId, password]);
  }
}
class FakeRevoker implements IStaffSessionRevoker {
  public revoked: string[] = [];
  async revokeOthers() {
    return 0;
  }
  async revokeAll(userId: string) {
    this.revoked.push(userId);
    return 2;
  }
}

const WITH_PASSWORD: PortalAccount = { ...ACCOUNT, hasPassword: true };

let repo: FakePortalRepository;
let audit: FakeAudit;
beforeEach(() => {
  repo = new FakePortalRepository();
  audit = new FakeAudit();
});

describe("ResolvePortalSignInEmailUseCase", () => {
  it("hands sign-in the account's address", async () => {
    repo.byIdentifier = ACCOUNT;
    const email = await new ResolvePortalSignInEmailUseCase(repo).run({
      identifier: { method: "national_id", nationalIdType: "DNI", nationalId: "12345678" },
    });
    expect(email).toBe(ACCOUNT.email);
  });

  it("hands it the sentinel for an unknown or malformed identifier", async () => {
    const useCase = new ResolvePortalSignInEmailUseCase(repo);
    expect(await useCase.run({ identifier: { method: "email", email: "nobody@gmail.com" } })).toBe(PORTAL_SIGN_IN_SENTINEL_EMAIL);
    expect(await useCase.run({ identifier: null })).toBe(PORTAL_SIGN_IN_SENTINEL_EMAIL);
  });
});

describe("RequestPortalPasswordResetUseCase", () => {
  const byEmail: PortalIdentifier = { method: "email", email: ACCOUNT.email };

  it("e-mails a one-hour reset link to an account that has a password", async () => {
    repo.byIdentifier = WITH_PASSWORD;
    await new RequestPortalPasswordResetUseCase(repo, new FakeLinks(), audit).run({ identifier: byEmail, locale: "pt-BR" });

    expect(repo.tokens.map((t) => t.purpose)).toEqual(["reset"]);
    expect(repo.outbox).toEqual([expect.objectContaining({ templateKey: "portal_password_reset", to: ACCOUNT.email, locale: "pt-BR" })]);
    expect(audit.entries).toEqual([expect.objectContaining({ action: "portal.password_reset_requested", targetId: ACCOUNT.userId })]);
  });

  it("re-sends the activation to an account that never set one", async () => {
    repo.byIdentifier = ACCOUNT;
    await new RequestPortalPasswordResetUseCase(repo, new FakeLinks(), audit).run({ identifier: byEmail, locale: "es-PE" });
    expect(repo.tokens.map((t) => t.purpose)).toEqual(["activation"]);
    expect(repo.outbox.map((m) => m.templateKey)).toEqual(["portal_credentials"]);
  });

  it("ends the same way, writing nothing, for no account or a malformed identifier", async () => {
    const useCase = new RequestPortalPasswordResetUseCase(repo, new FakeLinks(), audit);
    expect(await useCase.run({ identifier: byEmail, locale: "es-PE" })).toBeUndefined();
    expect(await useCase.run({ identifier: null, locale: "es-PE" })).toBeUndefined();
    expect(repo.tokens).toEqual([]);
    expect(audit.entries).toEqual([]);
  });

  it("sends one e-mail inside the cooldown", async () => {
    repo.byIdentifier = WITH_PASSWORD;
    const useCase = new RequestPortalPasswordResetUseCase(repo, new FakeLinks(), audit);
    await useCase.run({ identifier: byEmail, locale: "es-PE" });
    await useCase.run({ identifier: byEmail, locale: "es-PE" });
    expect(repo.outbox).toHaveLength(1);
    expect(audit.entries).toHaveLength(1);
  });
});

describe("CompletePortalAccessUseCase", () => {
  async function issue(purpose: "activation" | "reset", expiresAt?: Date) {
    const token = newPortalToken(purpose);
    if (expiresAt) token.expiresAt = expiresAt;
    await repo.issueToken({ userId: ACCOUNT.userId, token, cooldownSince: null, notify: () => [] });
    return token.token;
  }

  it("sets the password, burns the link, closes every session and audits", async () => {
    const setter = new FakeSetter();
    const revoker = new FakeRevoker();
    const token = await issue("activation");

    const result = await new CompletePortalAccessUseCase(repo, setter, revoker, audit).run({ token, password: "nueva-clave-1" });

    expect(result).toEqual({ userId: ACCOUNT.userId, purpose: "activation" });
    expect(setter.calls).toEqual([[ACCOUNT.userId, "nueva-clave-1"]]);
    expect(revoker.revoked).toEqual([ACCOUNT.userId]);
    expect(audit.entries).toEqual([expect.objectContaining({ action: "portal.password_set", metadata: { purpose: "activation", sessionsClosed: 2 } })]);
    await expect(new CompletePortalAccessUseCase(repo, setter, revoker, audit).run({ token, password: "otra-clave-12" })).rejects.toMatchObject({
      status: 410,
      reason: "portal_access.link_invalid",
    });
  });

  it("refuses an unknown or expired link with the same answer", async () => {
    const useCase = new CompletePortalAccessUseCase(repo, new FakeSetter(), new FakeRevoker(), audit);
    await expect(useCase.run({ token: "nope", password: "nueva-clave-1" })).rejects.toMatchObject({ status: 410, reason: "portal_access.link_invalid" });
    const expired = await issue("reset", new Date(Date.now() - 1000));
    await expect(useCase.run({ token: expired, password: "nueva-clave-1" })).rejects.toMatchObject({ status: 410, reason: "portal_access.link_invalid" });
  });

  it("refuses a weak password and keeps the link alive", async () => {
    const setter = new FakeSetter();
    const token = await issue("reset");
    const useCase = new CompletePortalAccessUseCase(repo, setter, new FakeRevoker(), audit);
    await expect(useCase.run({ token, password: "corta1" })).rejects.toMatchObject({ status: 422, reason: "portal_access.weak_password" });
    expect(setter.calls).toEqual([]);
    await expect(useCase.run({ token, password: "nueva-clave-1" })).resolves.toMatchObject({ purpose: "reset" });
  });
});

describe("IssuePortalAccessUseCase", () => {
  const STUDENT = "018f2b5c-0000-7000-8000-00000000s001";

  it("creates the account when there is none", async () => {
    const result = await new IssuePortalAccessUseCase(repo, new FakeLinks(), audit).run({ actorId: "usr_admin", studentId: STUDENT });
    expect(result).toEqual({ outcome: "created" });
    expect(repo.outbox.map((m) => m.templateKey)).toEqual(["portal_credentials"]);
    expect(audit.entries).toEqual([expect.objectContaining({ action: "portal_access.issued", targetId: STUDENT, metadata: { outcome: "created" } })]);
  });

  it("re-sends the activation to an account still without a password", async () => {
    repo.accounts.set(STUDENT, ACCOUNT);
    const result = await new IssuePortalAccessUseCase(repo, new FakeLinks(), audit).run({ actorId: "usr_admin", studentId: STUDENT });
    expect(result).toEqual({ outcome: "activation_resent" });
    expect(repo.tokens.map((t) => t.purpose)).toEqual(["activation"]);
  });

  it("sends a reset link to an active account", async () => {
    repo.accounts.set(STUDENT, WITH_PASSWORD);
    const result = await new IssuePortalAccessUseCase(repo, new FakeLinks(), audit).run({ actorId: "usr_admin", studentId: STUDENT });
    expect(result).toEqual({ outcome: "reset_sent" });
    expect(repo.outbox.map((m) => m.templateKey)).toEqual(["portal_password_reset"]);
  });

  it("e-mails the account a duplicate file was just linked to", async () => {
    repo.provisionOutcome = "linked_existing";
    const result = await new IssuePortalAccessUseCase(repo, new FakeLinks(), audit).run({ actorId: "usr_admin", studentId: STUDENT });
    expect(result).toEqual({ outcome: "reset_sent" });
  });

  it("reports an e-mail conflict and sends nothing", async () => {
    repo.provisionOutcome = "email_conflict";
    const result = await new IssuePortalAccessUseCase(repo, new FakeLinks(), audit).run({ actorId: "usr_admin", studentId: STUDENT });
    expect(result).toEqual({ outcome: "email_conflict" });
    expect(repo.outbox).toEqual([]);
  });

  it("refuses a student with no confirmed seat", async () => {
    repo.confirmed = false;
    await expect(new IssuePortalAccessUseCase(repo, new FakeLinks(), audit).run({ actorId: "usr_admin", studentId: STUDENT })).rejects.toMatchObject({
      status: 422,
      reason: "portal_access.no_confirmed_enrollment",
    });
  });
});
```

(Una os imports com os do topo do arquivo — um import só de `@ooc/domain` e um de `vitest`.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @ooc/api exec vitest run src/tests/portal-access.test.ts`
Expected: FAIL — use cases inexistentes.

- [ ] **Step 3: Implementar**

`ResolvePortalSignInEmailUseCase.ts`:

```ts
import { BaseUseCase } from "../../shared/base/BaseUseCase.js";
import { PORTAL_SIGN_IN_SENTINEL_EMAIL, type PortalIdentifier } from "./PortalAccess.js";
import type { IPortalAccessRepository } from "./ports.js";

export interface ResolvePortalSignInEmailInput {
  identifier: PortalIdentifier | null;
}

/**
 * Turns either door (e-mail or document) into the address Better Auth signs
 * in with. Never says whether there is an account: no match — or a malformed
 * identifier — is the sentinel, and Better Auth answers it exactly like a wrong
 * password, in the same time (CLAUDE.md §8). The resolved address never leaves
 * the server.
 */
export class ResolvePortalSignInEmailUseCase extends BaseUseCase<ResolvePortalSignInEmailInput, string> {
  constructor(private readonly portalAccess: IPortalAccessRepository) {
    super();
  }

  async run(input: ResolvePortalSignInEmailInput): Promise<string> {
    if (!input.identifier) return PORTAL_SIGN_IN_SENTINEL_EMAIL;
    const account = await this.portalAccess.findAccountByIdentifier(input.identifier);
    return account?.email ?? PORTAL_SIGN_IN_SENTINEL_EMAIL;
  }
}
```

`RequestPortalPasswordResetUseCase.ts`:

```ts
import type { Locale } from "../../notification/EmailNotification.js";
import { BaseUseCase } from "../../shared/base/BaseUseCase.js";
import type { IAuditLogRepository } from "../ports/IAuditLogRepository.js";
import { PORTAL_TOKEN_COOLDOWN_SECONDS, newPortalToken, type PortalIdentifier } from "./PortalAccess.js";
import { portalCredentialsEmail, portalPasswordResetEmail } from "./portalEmails.js";
import type { IPortalAccessRepository, IPortalLinkBuilder } from "./ports.js";

export interface RequestPortalPasswordResetInput {
  identifier: PortalIdentifier | null;
  /** The language of the screen the request came from. */
  locale: Locale;
}

/**
 * "Forgot my password" on the student login. Returns nothing on every path
 * (CLAUDE.md §8): no account, a malformed identifier and a request inside the
 * cooldown end exactly like a link that went out.
 *
 * An account that never set a password gets its activation again — whoever
 * lost the first e-mail recovers through the same button.
 */
export class RequestPortalPasswordResetUseCase extends BaseUseCase<RequestPortalPasswordResetInput, void> {
  constructor(
    private readonly portalAccess: IPortalAccessRepository,
    private readonly links: IPortalLinkBuilder,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: RequestPortalPasswordResetInput): Promise<void> {
    if (!input.identifier) return;
    const account = await this.portalAccess.findAccountByIdentifier(input.identifier);
    if (!account) return;

    const now = new Date();
    const purpose = account.hasPassword ? "reset" : "activation";
    const token = newPortalToken(purpose, now);
    const url = this.links.access(token.token, input.locale);
    const issued = await this.portalAccess.issueToken({
      userId: account.userId,
      token,
      cooldownSince: new Date(now.getTime() - PORTAL_TOKEN_COOLDOWN_SECONDS * 1000),
      notify: (tokenId) => [
        purpose === "reset"
          ? portalPasswordResetEmail(account, url, tokenId, input.locale)
          : portalCredentialsEmail(account, url, tokenId, input.locale),
      ],
    });
    if (!issued) return;

    await this.auditLog.append({
      actorId: account.userId,
      action: "portal.password_reset_requested",
      targetId: account.userId,
      metadata: { purpose },
      at: now,
    });
  }
}
```

`CompletePortalAccessUseCase.ts`:

```ts
import { BaseUseCase } from "../../shared/base/BaseUseCase.js";
import { HttpError } from "../../shared/base/errors/HttpError.js";
import { UnableToProcessEntryError } from "../../shared/base/errors/UnableToProcessEntryError.js";
import type { IAuditLogRepository } from "../ports/IAuditLogRepository.js";
import type { IStaffSessionRevoker } from "../ports/IStaffSessionRevoker.js";
import { meetsStudentPasswordPolicy } from "../StudentPasswordPolicy.js";
import { hashPortalToken, type PortalAccessTokenPurpose } from "./PortalAccess.js";
import type { IPortalAccessRepository, IPortalPasswordSetter } from "./ports.js";

export interface CompletePortalAccessInput {
  token: string;
  password: string;
}

export interface CompletePortalAccessOutput {
  userId: string;
  purpose: PortalAccessTokenPurpose;
}

function linkInvalid(): HttpError {
  return new HttpError({ status: 410, reason: "portal_access.link_invalid", message: "Portal access link is unknown, used or expired." });
}

/**
 * Sets the password from an activation or reset link. Unknown, used and
 * expired are one answer. The link is burned before the password is written:
 * two clicks race to `consumeToken`, and only one wins.
 *
 * Every session on the account is closed — same stance as the staff reset: a
 * session opened with the old password must not outlive it. The session
 * revoker is the staff one; its `revokeAll` deletes rows of Better Auth's
 * "session" table by user, whoever the user is.
 */
export class CompletePortalAccessUseCase extends BaseUseCase<CompletePortalAccessInput, CompletePortalAccessOutput> {
  constructor(
    private readonly portalAccess: IPortalAccessRepository,
    private readonly passwordSetter: IPortalPasswordSetter,
    private readonly sessionRevoker: IStaffSessionRevoker,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: CompletePortalAccessInput): Promise<CompletePortalAccessOutput> {
    const token = await this.portalAccess.findToken(hashPortalToken(input.token));
    if (!token || token.usedAt || token.expiresAt.getTime() <= Date.now()) throw linkInvalid();

    if (!meetsStudentPasswordPolicy(input.password)) {
      throw new UnableToProcessEntryError({
        reason: "portal_access.weak_password",
        message: "The password does not meet the student password policy.",
      });
    }

    if (!(await this.portalAccess.consumeToken(token.id))) throw linkInvalid();
    await this.passwordSetter.setPassword(token.userId, input.password);
    const sessionsClosed = await this.sessionRevoker.revokeAll(token.userId);

    await this.auditLog.append({
      actorId: token.userId,
      action: "portal.password_set",
      targetId: token.userId,
      metadata: { purpose: token.purpose, sessionsClosed },
      at: new Date(),
    });

    return { userId: token.userId, purpose: token.purpose };
  }
}
```

`IssuePortalAccessUseCase.ts`:

```ts
import { DEFAULT_LOCALE } from "../../notification/EmailNotification.js";
import { BaseUseCase } from "../../shared/base/BaseUseCase.js";
import { UnableToProcessEntryError } from "../../shared/base/errors/UnableToProcessEntryError.js";
import type { IAuditLogRepository } from "../ports/IAuditLogRepository.js";
import { newPortalToken, type PortalAccessOutcome } from "./PortalAccess.js";
import { portalCredentialsEmail, portalPasswordResetEmail } from "./portalEmails.js";
import type { IPortalAccessRepository, IPortalLinkBuilder } from "./ports.js";

export type IssuePortalAccessOutcome = PortalAccessOutcome | "activation_resent" | "reset_sent";

export interface IssuePortalAccessInput {
  actorId: string;
  studentId: string;
}

/**
 * "Send portal access" on the student file — for whoever was approved before
 * accounts existed, and for the e-mail conflict once staff fixed the address.
 * Only for a student with a confirmed seat: the portal is for enrolled
 * students (CLAUDE.md §1, OOC-55). No account → create it; account without a
 * password → its activation again; active account → a reset link.
 */
export class IssuePortalAccessUseCase extends BaseUseCase<IssuePortalAccessInput, { outcome: IssuePortalAccessOutcome }> {
  constructor(
    private readonly portalAccess: IPortalAccessRepository,
    private readonly links: IPortalLinkBuilder,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: IssuePortalAccessInput): Promise<{ outcome: IssuePortalAccessOutcome }> {
    if (!(await this.portalAccess.hasConfirmedEnrollment(input.studentId))) {
      throw new UnableToProcessEntryError({
        reason: "portal_access.no_confirmed_enrollment",
        message: "Portal access needs a confirmed enrollment.",
      });
    }

    const now = new Date();
    let account = await this.portalAccess.findAccountByStudent(input.studentId);
    if (!account) {
      const activation = newPortalToken("activation", now);
      const provisioned = await this.portalAccess.provision({
        studentId: input.studentId,
        actorId: input.actorId,
        activation,
        at: now,
        notify: (created, tokenId) => [
          portalCredentialsEmail(created, this.links.access(activation.token, DEFAULT_LOCALE), tokenId, DEFAULT_LOCALE),
        ],
      });
      // A duplicate file just linked to an existing account: staff asked for
      // an e-mail, so it goes to that account below.
      if (provisioned !== "linked_existing") return this.done(input, provisioned, now);
      account = await this.portalAccess.findAccountByStudent(input.studentId);
      if (!account) return this.done(input, provisioned, now);
    }

    const target = account;
    const purpose = target.hasPassword ? "reset" : "activation";
    const token = newPortalToken(purpose, now);
    const url = this.links.access(token.token, DEFAULT_LOCALE);
    await this.portalAccess.issueToken({
      userId: target.userId,
      token,
      cooldownSince: null,
      notify: (tokenId) => [
        purpose === "reset"
          ? portalPasswordResetEmail(target, url, tokenId, DEFAULT_LOCALE)
          : portalCredentialsEmail(target, url, tokenId, DEFAULT_LOCALE),
      ],
    });
    return this.done(input, purpose === "reset" ? "reset_sent" : "activation_resent", now);
  }

  private async done(input: IssuePortalAccessInput, outcome: IssuePortalAccessOutcome, at: Date) {
    await this.auditLog.append({ actorId: input.actorId, action: "portal_access.issued", targetId: input.studentId, metadata: { outcome }, at });
    return { outcome };
  }
}
```

Exports em `index.ts`:

```ts
export { ResolvePortalSignInEmailUseCase } from "./identity/portal/ResolvePortalSignInEmailUseCase.js";
export { RequestPortalPasswordResetUseCase } from "./identity/portal/RequestPortalPasswordResetUseCase.js";
export { CompletePortalAccessUseCase } from "./identity/portal/CompletePortalAccessUseCase.js";
export { IssuePortalAccessUseCase } from "./identity/portal/IssuePortalAccessUseCase.js";
export type { IssuePortalAccessOutcome } from "./identity/portal/IssuePortalAccessUseCase.js";
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @ooc/api exec vitest run src/tests/portal-access.test.ts`
Expected: PASS.

Run: `pnpm typecheck:domain && pnpm typecheck:api`

- [ ] **Step 5: Commit**

```bash
git add packages/domain apps/api/src/tests/portal-access.test.ts
git commit -m "feat(domain): student sign-in resolution, password reset, link completion and access re-issue"
```

---

### Task 8: Config e container

**Files:**
- Modify: `apps/api/src/config.ts` (depois de `BACKOFFICE_PUBLIC_URL`), `apps/api/vitest.config.ts` (`env`), `apps/api/.env.example`
- Modify: `apps/api/src/container.ts`

**Interfaces:**
- Consumes: Tasks 5 e 7.
- Produces: `config.PORTAL_PUBLIC_URL: string` (origin); `container.repositories.portalAccess: IPortalAccessRepository`; `container.useCases.portal: { resolveSignInEmail; requestPasswordReset; completeAccess; issueAccess }`.

- [ ] **Step 1: Config** (já feito na Task 6 Step 5 — aqui só para referência; confira que está igual)

```ts
    // The origin the student portal is served from, for the links in the
    // portal e-mails (activation and reset). Production:
    // https://student.onlyonecoin.edu.pe; locally the apps/app origin.
    // Required: a credentials e-mail pointing nowhere is an approval nobody
    // can use. `fly secrets set` before merging (CLAUDE.md §7).
    PORTAL_PUBLIC_URL: z
      .string()
      .url()
      .transform((val) => new URL(val).origin),
```

`vitest.config.ts` env: `PORTAL_PUBLIC_URL: "http://localhost:3000",`. `.env.example`: `PORTAL_PUBLIC_URL=http://localhost:3000` logo abaixo de `BACKOFFICE_PUBLIC_URL`.

- [ ] **Step 2: Container**

Imports dos novos (`DrizzlePortalAccessRepository`, `BetterAuthPortalPasswordSetter`, `PortalLinkBuilder`, os 4 use cases, `IPortalAccessRepository`). Na interface `AppRepositories`: `portalAccess: IPortalAccessRepository;`. Em `AppUseCases`:

```ts
  portal: {
    resolveSignInEmail: ResolvePortalSignInEmailUseCase;
    requestPasswordReset: RequestPortalPasswordResetUseCase;
    completeAccess: CompletePortalAccessUseCase;
    issueAccess: IssuePortalAccessUseCase;
  };
```

Em `buildContainer`, perto dos use cases de staff (o `portalLinkBuilder` já foi criado na Task 6):

```ts
  const portalAccessRepository = new DrizzlePortalAccessRepository(db);
  const portal = {
    resolveSignInEmail: new ResolvePortalSignInEmailUseCase(portalAccessRepository),
    requestPasswordReset: new RequestPortalPasswordResetUseCase(portalAccessRepository, portalLinkBuilder, auditLogRepository),
    completeAccess: new CompletePortalAccessUseCase(
      portalAccessRepository,
      new BetterAuthPortalPasswordSetter(db),
      staffSessionRevoker,
      auditLogRepository,
    ),
    issueAccess: new IssuePortalAccessUseCase(portalAccessRepository, portalLinkBuilder, auditLogRepository),
  };
```

e no objeto retornado: `repositories: { ..., portalAccess: portalAccessRepository }`, `useCases: { ..., portal }`.

- [ ] **Step 3: Verificar**

Run: `pnpm typecheck:api && pnpm test:api && pnpm --filter @ooc/api env:required`
Expected: verde; `env:required` lista `PORTAL_PUBLIC_URL`.

- [ ] **Step 4: Commit**

```bash
git add apps/api
git commit -m "feat(api): wire student portal access and require PORTAL_PUBLIC_URL"
```

---

### Task 9: Rota de login do portal + rate limits

**Files:**
- Modify: `apps/api/src/shared/http/rateLimit.ts`, `apps/api/src/http/auth/AuthCatchAllRoute.ts:16`
- Create: `apps/api/src/http/portal/PortalSignInRoute.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/src/tests/portal-routes.test.ts`

**Interfaces:**
- Consumes: `container.useCases.portal.resolveSignInEmail`, `parsePortalIdentifier`, `container.auth.api.signInEmail`.
- Produces: `POST /api/v1/portal/sign-in` → 204 + `Set-Cookie` | 401 `{ status: 401, reason: "auth.invalid_credentials" }`. `RATE_LIMITS.portalSignIn`, `RATE_LIMITS.portalResetRequest`, `RATE_LIMITS.portalLink`, `perPortalIdentifier(name, limit, windowSeconds)`, `portalIdentifierKey(body)`, `AUTH_SIGN_IN_BY_EMAIL`.

- [ ] **Step 1: Testes que falham**

`apps/api/src/tests/portal-routes.test.ts`:

```ts
import { PORTAL_SIGN_IN_SENTINEL_EMAIL } from "@ooc/domain";
import { APIError } from "better-auth/api";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app.js";
import { container } from "@/container.js";
import { AUTH_SIGN_IN_BY_EMAIL, portalIdentifierKey } from "@/shared/http/rateLimit.js";

/**
 * The student portal's public routes, no database: the use cases and Better
 * Auth are stubbed. What is pinned here is the HTTP contract — above all that
 * every way of failing looks the same (CLAUDE.md §8).
 */

let app: FastifyInstance;
beforeAll(async () => {
  app = await buildApp();
});
afterAll(async () => {
  await app.close();
});
afterEach(() => {
  vi.restoreAllMocks();
});

function stubSignIn(acceptedEmail: string, acceptedPassword: string) {
  return vi.spyOn(container.auth.api, "signInEmail").mockImplementation((async (args: { body: { email: string; password: string } }) => {
    if (args.body.email === acceptedEmail && args.body.password === acceptedPassword) {
      const headers = new Headers();
      headers.append("set-cookie", "better-auth.session_token=signed; Path=/; HttpOnly; SameSite=Lax");
      return { headers, response: {} };
    }
    throw new APIError("UNAUTHORIZED", { message: "Invalid email or password", code: "INVALID_EMAIL_OR_PASSWORD" });
  }) as never);
}

const signIn = (payload: unknown) => app.inject({ method: "POST", url: "/api/v1/portal/sign-in", payload: payload as object });

describe("POST /portal/sign-in", () => {
  it("signs a real credential in by document and hands the session cookie over", async () => {
    vi.spyOn(container.useCases.portal.resolveSignInEmail, "run").mockResolvedValue("ana@gmail.com");
    const signInSpy = stubSignIn("ana@gmail.com", "clave-segura-1");

    const response = await signIn({ method: "national_id", nationalIdType: "DNI", identifier: "12.345.678", password: "clave-segura-1" });

    expect(response.statusCode).toBe(204);
    expect(response.headers["set-cookie"]).toContain("better-auth.session_token=signed");
    expect(container.useCases.portal.resolveSignInEmail.run).toHaveBeenCalledWith({
      identifier: { method: "national_id", nationalIdType: "DNI", nationalId: "12345678" },
    });
    expect(signInSpy.mock.calls[0]![0]).toMatchObject({ body: { email: "ana@gmail.com" }, returnHeaders: true });
  });

  it.each([
    ["a wrong password", { method: "email", identifier: "ana@gmail.com", password: "otra-clave-1" }],
    ["no account", { method: "email", identifier: "nadie@gmail.com", password: "clave-segura-1" }],
    ["a malformed e-mail", { method: "email", identifier: "no-es-correo", password: "clave-segura-1" }],
    ["a document that fails its type", { method: "national_id", nationalIdType: "DNI", identifier: "12", password: "x" }],
    ["an unknown method", { method: "phone", identifier: "999999999", password: "x" }],
    ["a missing password", { method: "email", identifier: "ana@gmail.com" }],
    ["an empty body", {}],
  ])("answers %s with the one generic 401 and no cookie", async (_label, payload) => {
    vi.spyOn(container.useCases.portal.resolveSignInEmail, "run").mockImplementation(async ({ identifier }) =>
      identifier?.method === "email" && identifier.email === "ana@gmail.com" ? "ana@gmail.com" : PORTAL_SIGN_IN_SENTINEL_EMAIL,
    );
    stubSignIn("ana@gmail.com", "clave-segura-1");

    const response = await signIn(payload);

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ status: 401, reason: "auth.invalid_credentials" });
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("always runs Better Auth's sign-in, even for a malformed identifier (same time spent)", async () => {
    vi.spyOn(container.useCases.portal.resolveSignInEmail, "run").mockResolvedValue(PORTAL_SIGN_IN_SENTINEL_EMAIL);
    const signInSpy = stubSignIn("ana@gmail.com", "clave-segura-1");
    await signIn({ method: "email", identifier: "no-es-correo", password: "x" });
    expect(signInSpy).toHaveBeenCalledWith(expect.objectContaining({ body: { email: PORTAL_SIGN_IN_SENTINEL_EMAIL, password: "x" } }));
  });
});

describe("portal rate-limit keys", () => {
  it("count one identifier however it is typed", () => {
    expect(portalIdentifierKey({ method: "national_id", nationalIdType: "DNI", identifier: "12.345.678" })).toBe(
      portalIdentifierKey({ method: "national_id", nationalIdType: "DNI", identifier: "12345678" }),
    );
    expect(portalIdentifierKey({ method: "email", identifier: " Ana@Gmail.com" })).toBe(portalIdentifierKey({ method: "email", identifier: "ana@gmail.com" }));
    expect(portalIdentifierKey({})).toBeNull();
  });

  it("count the catch-all's sign-in by e-mail, and nothing else there", () => {
    const key = AUTH_SIGN_IN_BY_EMAIL.by === "key" ? AUTH_SIGN_IN_BY_EMAIL.key : () => null;
    expect(key({ url: "/api/auth/sign-in/email", body: { email: "Rosa@X.com" } } as never)).toBe("rosa@x.com");
    expect(key({ url: "/api/auth/get-session", body: undefined } as never)).toBeNull();
  });
});
```

> O `errorHandler` do repo serializa erros como `{ status, reason }` (+ `path` em alguns). Se a resposta real trouxer `path`, troque o `toEqual` por `toMatchObject({ status: 401, reason: "auth.invalid_credentials" })` e acrescente `expect(Object.keys(response.json()).sort()).toEqual(<as chaves vistas>)` — o ponto é que o corpo é **idêntico** em todos os casos.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @ooc/api exec vitest run src/tests/portal-routes.test.ts`
Expected: FAIL (404 na rota / exports inexistentes).

- [ ] **Step 3: Rate limits**

Em `rateLimit.ts`, dentro de `RATE_LIMITS` (antes do bloco do checkout):

```ts
  /** Student portal sign-in, per IP — loose for the same reason as the
   * checkout: a school lab puts thirty students behind one address. */
  portalSignIn: { name: "portal-sign-in:ip", by: "ip", limit: 30, windowSeconds: 10 * MINUTE },
  /** Student "forgot my password" — sends an e-mail. */
  portalResetRequest: { name: "portal-reset-request:ip", by: "ip", limit: 10, windowSeconds: 10 * MINUTE },
  /** Reading and completing a portal access link. */
  portalLink: { name: "portal-link:ip", by: "ip", limit: 30, windowSeconds: 10 * MINUTE },
```

No fim do arquivo:

```ts
/**
 * The identifier a portal request names, normalized the way the server reads
 * it — "12.345.678" and "12345678" spend from one counter. Not validated: a
 * malformed one still counts (it is a guess at somebody's account all the
 * same). The plugin hashes the key before it reaches Redis.
 */
export function portalIdentifierKey(body: unknown): string | null {
  const fields = body as Record<string, unknown> | undefined;
  const method = fields?.method;
  const identifier = fields?.identifier;
  if (typeof method !== "string" || typeof identifier !== "string") return null;
  const type = typeof fields?.nationalIdType === "string" ? fields.nationalIdType : "";
  const normalized = method === "email" ? normalizeEmail(identifier) : normalizeNationalId(identifier);
  return `${method}:${type}:${normalized}`;
}

/** Per-account ceiling on a portal route: what stops a guess at one account
 * from thirty IPs that the per-IP rule lets through. */
export function perPortalIdentifier(name: string, limit: number, windowSeconds: number): RateLimitRule {
  return { name: `${name}:id`, by: "key", key: (request: FastifyRequest) => portalIdentifierKey(request.body), limit, windowSeconds };
}

/**
 * Better Auth's own sign-in on the catch-all, per e-mail: the staff login uses
 * it, and a student could call it directly instead of the portal route.
 * Anything else on the catch-all has no key and skips the rule.
 */
export const AUTH_SIGN_IN_BY_EMAIL: RateLimitRule = {
  name: "auth-sign-in:email",
  by: "key",
  key: (request: FastifyRequest) => {
    if (!request.url.split("?")[0]!.endsWith("/sign-in/email")) return null;
    const email = (request.body as Record<string, unknown> | undefined)?.email;
    return typeof email === "string" ? normalizeEmail(email) : null;
  },
  limit: 10,
  windowSeconds: 15 * MINUTE,
};
```

Import no topo: `import { normalizeEmail, normalizeNationalId } from "@ooc/domain";`.

`AuthCatchAllRoute.ts:16`: `config: { auth: { public: true }, rateLimit: [RATE_LIMITS.auth, AUTH_SIGN_IN_BY_EMAIL] },` (importe `AUTH_SIGN_IN_BY_EMAIL`) e acrescente ao comentário: "plus a per-e-mail ceiling on sign-in, for the account under attack rather than the address attacking it."

- [ ] **Step 4: A rota**

`apps/api/src/http/portal/PortalSignInRoute.ts`:

```ts
import { UnauthorizedError, parsePortalIdentifier } from "@ooc/domain";
import { APIError } from "better-auth/api";
import { fromNodeHeaders } from "better-auth/node";
import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { RATE_LIMITS, perPortalIdentifier } from "@/shared/http/rateLimit.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const MINUTE = 60;

// Loose on purpose: a strict schema would answer a malformed field with a 400
// naming it. Everything is read inside the handler and every failure is the
// same 401 (CLAUDE.md §8).
const PortalSignInBodySchema = z.object({}).passthrough();

function invalidCredentials(path: string): UnauthorizedError {
  return new UnauthorizedError({ reason: "auth.invalid_credentials", message: "Portal sign-in refused.", path });
}

/**
 * The student portal's sign-in (spec 2026-10-05 §3). Either door — e-mail or
 * document — is resolved to the account's address on the server, and Better
 * Auth does the rest: the password check (hashing even when there is no
 * account), the session and the signed cookie. Staff accounts are not found
 * here (only `student` accounts with a file behind them are), so the panel's
 * people cannot use this door.
 */
export const portalSignInRoute = RouteBuilder.post("/portal/sign-in")
  .docs({
    tags: ["Portal"],
    summary: "Sign a student in by e-mail or document",
    description: "204 with the session cookie, or the one generic 401 for every failure.",
  })
  .public()
  .rateLimit(RATE_LIMITS.portalSignIn, perPortalIdentifier("portal-sign-in", 10, 15 * MINUTE))
  .body(PortalSignInBodySchema)
  .response(204, z.null())
  .response(401, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const identifier = parsePortalIdentifier(body);
    const password = typeof body.password === "string" ? body.password : "";
    const email = await container.useCases.portal.resolveSignInEmail.run({ identifier });

    try {
      const { headers } = await container.auth.api.signInEmail({
        body: { email, password },
        headers: fromNodeHeaders(request.headers),
        returnHeaders: true,
      });
      reply.header("set-cookie", headers.getSetCookie());
      reply.status(204).send();
    } catch (error) {
      if (error instanceof APIError) throw invalidCredentials(request.url);
      throw error;
    }
  });
```

Registre em `app.ts` (dentro do `provider.register(..., { prefix: "/api/v1" })`, junto das rotas públicas): `instance.withTypeProvider<ZodTypeProvider>().route(portalSignInRoute);` com o import.

> Se o `UnauthorizedError` não aceitar `path`, remova-o. Se `response(204, z.null())` brigar com o serializer, troque por `z.undefined()` ou remova o `.response(204, ...)`.

- [ ] **Step 5: Rodar e ver passar**

Run: `pnpm --filter @ooc/api exec vitest run src/tests/portal-routes.test.ts src/tests/public-route-protection.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api
git commit -m "feat(api): student portal sign-in by e-mail or document behind per-account rate limits"
```

---

### Task 10: Rotas de recuperação, link, `/portal/me` e "enviar acesso"

**Files:**
- Create: `apps/api/src/http/portal/RequestPortalPasswordResetRoute.ts`, `apps/api/src/http/portal/PortalAccessTokenRoutes.ts`, `apps/api/src/http/portal/GetPortalMeRoute.ts`, `apps/api/src/http/student/IssuePortalAccessRoute.ts`
- Modify: `apps/api/src/http/student/GetStudentRoute.ts`, `apps/api/src/app.ts`
- Test: `apps/api/src/tests/portal-routes.test.ts` (acrescentar), `apps/api/src/tests/portal-routes-authorization.test.ts` (novo)

**Interfaces:**
- Produces:
  - `POST /api/v1/portal/password-resets/request` body `{ method, identifier, nationalIdType?, captchaToken, locale? }` → sempre `202 {}`.
  - `GET /api/v1/portal/access-tokens/:token` → `200 { state: "valid" | "expired_or_used", purpose: "activation" | "reset" | null }`.
  - `POST /api/v1/portal/access-tokens/:token/complete` body `{ password }` → `200 { purpose }` | `410 portal_access.link_invalid` | `422 portal_access.weak_password`.
  - `GET /api/v1/portal/me` (`student`) → `200 { firstName, lastName, email }` | `403`.
  - `POST /api/v1/students/:studentId/portal-access` (`master`, `admin`, `enrollment_supervisor`) → `200 { outcome }` | `422`.
  - `GET /api/v1/students/:studentId` ganha `portalAccess: "none" | "pending_activation" | "active"`.

- [ ] **Step 1: Testes que falham**

Acrescente a `portal-routes.test.ts`:

```ts
describe("POST /portal/password-resets/request", () => {
  const request = (payload: object) => app.inject({ method: "POST", url: "/api/v1/portal/password-resets/request", payload });

  it.each([
    ["a passed captcha", "passed", 1],
    ["a failed captcha", "failed", 0],
    ["an unavailable captcha", "unavailable", 0],
  ] as const)("answers 202 {} with %s, asking the use case only when it passed", async (_label, outcome, calls) => {
    vi.spyOn(container.edge.captcha, "verify").mockResolvedValue(outcome);
    const run = vi.spyOn(container.useCases.portal.requestPasswordReset, "run").mockResolvedValue();

    const response = await request({ method: "email", identifier: "ana@gmail.com", captchaToken: "t", locale: "pt-BR" });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({});
    expect(run).toHaveBeenCalledTimes(calls);
    if (calls) expect(run).toHaveBeenCalledWith({ identifier: { method: "email", email: "ana@gmail.com" }, locale: "pt-BR" });
  });

  it("answers a malformed identifier the same way", async () => {
    vi.spyOn(container.edge.captcha, "verify").mockResolvedValue("passed");
    vi.spyOn(container.useCases.portal.requestPasswordReset, "run").mockResolvedValue();
    const response = await request({ method: "national_id", identifier: "x", captchaToken: "t" });
    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({});
  });
});

describe("portal access links", () => {
  it("say whether a link is usable, nothing about whose it is", async () => {
    vi.spyOn(container.repositories.portalAccess, "findToken").mockResolvedValue({
      id: "tok_1",
      userId: "usr_ana",
      purpose: "activation",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    });
    const response = await app.inject({ method: "GET", url: "/api/v1/portal/access-tokens/abc" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ state: "valid", purpose: "activation" });
  });

  it("answers an unknown link as expired_or_used", async () => {
    vi.spyOn(container.repositories.portalAccess, "findToken").mockResolvedValue(null);
    const response = await app.inject({ method: "GET", url: "/api/v1/portal/access-tokens/abc" });
    expect(response.json()).toEqual({ state: "expired_or_used", purpose: null });
  });

  it("complete hands the password to the use case", async () => {
    const run = vi.spyOn(container.useCases.portal.completeAccess, "run").mockResolvedValue({ userId: "usr_ana", purpose: "reset" });
    const response = await app.inject({ method: "POST", url: "/api/v1/portal/access-tokens/abc/complete", payload: { password: "nueva-clave-1" } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ purpose: "reset" });
    expect(run).toHaveBeenCalledWith({ token: "abc", password: "nueva-clave-1" });
  });
});
```

`apps/api/src/tests/portal-routes-authorization.test.ts`:

```ts
import type { AuthenticatedUser, Role } from "@ooc/domain";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app.js";
import { container } from "@/container.js";
import { SESSION_COOKIE_NAME } from "@/infra/auth/betterAuth.js";

/** CI gate §6.5 for the portal routes behind a session. */

const STUDENT_ID = "018f2b5c-0000-7000-8000-000000000001";

const CASES: [string, string, Role][] = [
  ["GET", "/api/v1/portal/me", "admin"],
  ["GET", "/api/v1/portal/me", "guardian"],
  ["GET", "/api/v1/portal/me", "master"],
  ["POST", `/api/v1/students/${STUDENT_ID}/portal-access`, "billing"],
  ["POST", `/api/v1/students/${STUDENT_ID}/portal-access`, "analyst"],
  ["POST", `/api/v1/students/${STUDENT_ID}/portal-access`, "sales"],
  ["POST", `/api/v1/students/${STUDENT_ID}/portal-access`, "teacher"],
  ["POST", `/api/v1/students/${STUDENT_ID}/portal-access`, "student"],
  ["GET", `/api/v1/me`, "student"],
];

let app: FastifyInstance;
beforeAll(async () => {
  app = await buildApp();
});
afterAll(async () => {
  await app.close();
});
afterEach(() => {
  vi.restoreAllMocks();
});

function as(role: Role) {
  const user: AuthenticatedUser = { id: "u1", email: "x@example.com", name: "X", role };
  vi.spyOn(container.identity.currentSession, "resolve").mockResolvedValue(user);
}

describe("portal routes refuse undeclared roles", () => {
  it.each(CASES)("%s %s refuses %s", async (method, url, role) => {
    as(role);
    const response = await app.inject({
      method: method as "GET",
      url,
      cookies: { [SESSION_COOKIE_NAME]: "token" },
      payload: method === "GET" ? undefined : {},
    });
    expect(response.statusCode).toBe(403);
  });

  it("refuses /portal/me without a session", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/portal/me" });
    expect(response.statusCode).toBe(401);
  });

  it("answers a student account with no file behind it with 403", async () => {
    as("student");
    vi.spyOn(container.repositories.portalAccess, "findIdentity").mockResolvedValue(null);
    const response = await app.inject({ method: "GET", url: "/api/v1/portal/me", cookies: { [SESSION_COOKIE_NAME]: "token" } });
    expect(response.statusCode).toBe(403);
  });

  it("gives a student their own identity", async () => {
    as("student");
    vi.spyOn(container.repositories.portalAccess, "findIdentity").mockResolvedValue({ firstName: "Ana", lastName: "Quispe", email: "ana@gmail.com" });
    const response = await app.inject({ method: "GET", url: "/api/v1/portal/me", cookies: { [SESSION_COOKIE_NAME]: "token" } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ firstName: "Ana", lastName: "Quispe", email: "ana@gmail.com" });
  });
});
```

(Confirme o status do "sem sessão" lendo `authorization.ts:86-129` — se for 401, mantenha; se for outro, ajuste o teste ao comportamento já existente.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @ooc/api exec vitest run src/tests/portal-routes.test.ts src/tests/portal-routes-authorization.test.ts`
Expected: FAIL (404).

- [ ] **Step 3: Implementar as rotas**

`RequestPortalPasswordResetRoute.ts`:

```ts
import { DEFAULT_LOCALE, LocaleSchema, parsePortalIdentifier } from "@ooc/domain";
import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { RATE_LIMITS, perPortalIdentifier } from "@/shared/http/rateLimit.js";
import { container } from "@/container.js";

const HOUR = 3600;

// Loose for the same reason as the sign-in: no field is ever named back.
const BodySchema = z.object({}).passthrough();

/**
 * Student "forgot my password" (spec 2026-10-05 §4). 202 with an empty body on
 * every path — account or not, captcha passed or not. The captcha sits here
 * because this route sends e-mail to an address the caller does not prove to
 * own; a refused or unverifiable captcha just sends nothing.
 */
export const requestPortalPasswordResetRoute = RouteBuilder.post("/portal/password-resets/request")
  .docs({ tags: ["Portal"], summary: "Ask for a portal password link by e-mail", description: "Same 202 whatever happens." })
  .public()
  .rateLimit(RATE_LIMITS.portalResetRequest, perPortalIdentifier("portal-reset-request", 3, HOUR))
  .body(BodySchema)
  .response(202, z.object({}))
  .handler(async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken : "";
    const locale = LocaleSchema.catch(DEFAULT_LOCALE).parse(body.locale);

    const captcha = captchaToken ? await container.edge.captcha.verify(captchaToken, request.clientIp) : "failed";
    if (captcha === "passed") {
      await container.useCases.portal.requestPasswordReset.run({ identifier: parsePortalIdentifier(body), locale });
    } else {
      request.log.info({ captcha }, "portal reset request without a passed captcha");
    }

    reply.status(202).send({});
  });
```

`PortalAccessTokenRoutes.ts`:

```ts
import { hashPortalToken } from "@ooc/domain";
import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { RATE_LIMITS } from "@/shared/http/rateLimit.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

const ParamsSchema = z.object({ token: z.string().min(1).max(128) });
const PurposeSchema = z.enum(["activation", "reset"]);

// Public — whoever opens this link has no session; that is why they are here.
// Says only whether the link works and what it is for: no name, no e-mail.
export const getPortalAccessTokenRoute = RouteBuilder.get("/portal/access-tokens/:token")
  .docs({ tags: ["Portal"], summary: "Check a portal access link", description: "Backs /access/[token] before the form renders." })
  .public()
  .rateLimit(RATE_LIMITS.portalLink)
  .params(ParamsSchema)
  .response(200, z.object({ state: z.enum(["valid", "expired_or_used"]), purpose: PurposeSchema.nullable() }))
  .handler(async (request, reply) => {
    const token = await container.repositories.portalAccess.findToken(hashPortalToken(request.params.token));
    if (token && token.usedAt === null && token.expiresAt.getTime() > Date.now()) {
      reply.status(200).send({ state: "valid", purpose: token.purpose });
      return;
    }
    reply.status(200).send({ state: "expired_or_used", purpose: null });
  });

export const completePortalAccessTokenRoute = RouteBuilder.post("/portal/access-tokens/:token/complete")
  .docs({ tags: ["Portal"], summary: "Set the portal password from a link", description: "Activation and reset alike." })
  .public()
  .rateLimit(RATE_LIMITS.portalLink)
  .params(ParamsSchema)
  .body(z.object({ password: z.string().max(256) }))
  .response(200, z.object({ purpose: PurposeSchema }))
  .response(410, ErrorResponseSchema)
  .response(422, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const result = await container.useCases.portal.completeAccess.run({ token: request.params.token, password: request.body.password });
    reply.status(200).send({ purpose: result.purpose });
  });
```

`GetPortalMeRoute.ts`:

```ts
import { ForbiddenError } from "@ooc/domain";
import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

/**
 * Who is signed in to the portal — the first route only a student reaches.
 * Read off the file linked to the account, never off the client. A `student`
 * account no file points at (the old open sign-up) is a 403: the portal has
 * nothing to show it, and the app sends it back to the login.
 */
export const getPortalMeRoute = RouteBuilder.get("/portal/me")
  .docs({ tags: ["Portal"], summary: "The signed-in student", description: "Backs the portal shell's guard." })
  .roles("student")
  .response(200, z.object({ firstName: z.string(), lastName: z.string(), email: z.string() }))
  .response(403, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const identity = await container.repositories.portalAccess.findIdentity(request.currentUser!.id);
    if (!identity) {
      throw new ForbiddenError({ reason: "portal.no_student_record", message: "No student file is linked to this account.", path: request.url });
    }
    reply.status(200).send(identity);
  });
```

`IssuePortalAccessRoute.ts`:

```ts
import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";

// Same audience as the student file itself (GetStudentRoute): whoever runs
// the enrollment side. Billing settles money, it does not hand out accounts.
export const issuePortalAccessRoute = RouteBuilder.post("/students/:studentId/portal-access")
  .docs({
    tags: ["Students"],
    summary: "Send the student their portal access",
    description: "Creates the account, re-sends the activation, or sends a reset link — whichever applies.",
  })
  .roles("master", "admin", "enrollment_supervisor")
  .params(z.object({ studentId: z.string().uuid() }))
  .body(z.object({}))
  .response(
    200,
    z.object({ outcome: z.enum(["created", "linked_existing", "already_linked", "email_conflict", "activation_resent", "reset_sent"]) }),
  )
  .response(422, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const result = await container.useCases.portal.issueAccess.run({ actorId: request.currentUser!.id, studentId: request.params.studentId });
    reply.status(200).send(result);
  });
```

`GetStudentRoute.ts` — `GetStudentResponseSchema` ganha `portalAccess: z.enum(["none", "pending_activation", "active"]),` e o handler, depois de achar o aluno: `const portalAccess = await container.repositories.portalAccess.accessState(student.id);` e inclui `portalAccess` no `send` (espalhe junto do objeto que já é enviado).

Registre as cinco rotas novas em `app.ts`.

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @ooc/api exec vitest run src/tests/portal-routes.test.ts src/tests/portal-routes-authorization.test.ts && pnpm test:api`
Expected: PASS (inclusive o teste de CI que exige papel declarado em toda rota).

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat(api): portal password recovery, access links, the student identity and the send-access action"
```

---

### Task 11: Prova ponta a ponta do critério de pronto

**Files:**
- Test: `apps/api/src/infra/persistence/portal/PortalSignIn.integration.test.ts`

**Interfaces:**
- Consumes: `createAuth` (Task 3), `DrizzlePortalAccessRepository` + `provisionPortalAccount` (Task 5), `ResolvePortalSignInEmailUseCase`, `CompletePortalAccessUseCase` (Task 7), `BetterAuthPortalPasswordSetter`, `BetterAuthStaffSessionRevoker`.

Esta suíte **comita** dados (o Better Auth lê pelo próprio pool e não enxerga uma transação aberta). `students` está sob a trava de delete, então a ficha criada aqui fica no banco de teste, com documento e e-mail aleatórios por execução. Deixe isso dito no comentário do arquivo.

- [ ] **Step 1: Escrever o teste**

```ts
import * as schema from "@ooc/db";
import { students } from "@ooc/db";
import {
  CompletePortalAccessUseCase,
  ResolvePortalSignInEmailUseCase,
  newPortalToken,
  parsePortalIdentifier,
  type AuditLogEntry,
  type IAuditLogRepository,
} from "@ooc/domain";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Config } from "@/config.js";
import type { Db } from "@/infra/db/client.js";
import { createAuth, type Auth } from "@/infra/auth/betterAuth.js";
import { BetterAuthPortalPasswordSetter } from "@/infra/identity/BetterAuthPortalPasswordSetter.js";
import { BetterAuthStaffSessionRevoker } from "@/infra/identity/BetterAuthStaffSessionRevoker.js";
import { DrizzlePortalAccessRepository } from "./DrizzlePortalAccessRepository.js";

/**
 * The definition of done (spec 2026-10-05 §9), end to end against Postgres
 * and the real Better Auth: an approved student sets a password from the link
 * and signs in by e-mail or by document; anything else never gets a session.
 *
 * Committed, not rolled back — Better Auth reads through its own pool. The
 * student file stays (students are under the delete lock, 0011), with a
 * document and e-mail unique to this run.
 */

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required for this suite.");

const RUN = Date.now().toString().slice(-8);
const EMAIL = `e2e.${RUN}@gmail.com`;
const DOCUMENT = RUN.padStart(8, "1");

class MemoryAudit implements IAuditLogRepository {
  entries: AuditLogEntry[] = [];
  async append(entry: AuditLogEntry) {
    this.entries.push(entry);
  }
}

let pool: pg.Pool;
let db: Db;
let auth: Auth;
let repo: DrizzlePortalAccessRepository;

beforeAll(() => {
  pool = new Pool({ connectionString: DATABASE_URL, max: 3 });
  db = drizzle(pool, { schema, casing: "snake_case" });
  auth = createAuth({
    NODE_ENV: "test",
    PORT: 3333,
    DATABASE_URL,
    BETTER_AUTH_URL: "http://localhost:3333/api/auth",
    BETTER_AUTH_SECRET: "integration-secret-at-least-32-characters",
    APP_PUBLIC_URLS: ["http://localhost:3000"],
  } as Config);
  repo = new DrizzlePortalAccessRepository(db);
});
afterAll(async () => {
  await pool.end();
});

async function signIn(raw: unknown, password: string) {
  const email = await new ResolvePortalSignInEmailUseCase(repo).run({ identifier: parsePortalIdentifier(raw) });
  return auth.api.signInEmail({ body: { email, password }, returnHeaders: true });
}

describe("student portal sign-in, end to end", () => {
  it("only a real credential gets a session", async () => {
    const [student] = await db
      .insert(students)
      .values({
        firstName: "E2E",
        lastName: "Alumna",
        nationalIdType: "DNI",
        nationalId: DOCUMENT,
        email: EMAIL,
        phone: "999999999",
        birthDate: new Date("2008-01-01T00:00:00.000Z"),
        country: "PE",
        city: "Lima",
      })
      .returning({ id: students.id });

    const activation = newPortalToken("activation");
    expect(await repo.provision({ studentId: student!.id, actorId: "e2e", activation, at: new Date(), notify: () => [] })).toBe("created");

    // Before the password is set: nobody gets in.
    await expect(signIn({ method: "email", identifier: EMAIL }, "anything-12")).rejects.toThrow();

    await new CompletePortalAccessUseCase(repo, new BetterAuthPortalPasswordSetter(db), new BetterAuthStaffSessionRevoker(auth, db), new MemoryAudit()).run({
      token: activation.token,
      password: "clave-segura-1",
    });

    const byEmail = await signIn({ method: "email", identifier: EMAIL.toUpperCase() }, "clave-segura-1");
    const cookie = byEmail.headers.getSetCookie().find((c) => c.includes("session_token"));
    expect(cookie).toBeTruthy();
    const session = await auth.api.getSession({ headers: new Headers({ cookie: cookie!.split(";")[0]! }) });
    expect((session?.user as unknown as { role: string } | undefined)?.role).toBe("student");

    const byDocument = await signIn({ method: "national_id", nationalIdType: "DNI", identifier: `${DOCUMENT.slice(0, 2)}.${DOCUMENT.slice(2, 5)}.${DOCUMENT.slice(5)}` }, "clave-segura-1");
    expect(byDocument.headers.getSetCookie().some((c) => c.includes("session_token"))).toBe(true);

    await expect(signIn({ method: "email", identifier: EMAIL }, "clave-errada-1")).rejects.toThrow();
    await expect(signIn({ method: "national_id", nationalIdType: "CE", identifier: DOCUMENT }, "clave-segura-1")).rejects.toThrow();
    await expect(signIn({ method: "email", identifier: "no-es-correo" }, "clave-segura-1")).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Rodar**

Run: `DATABASE_URL=postgres://ooc:ooc@localhost:5432/ooc_dev pnpm --filter @ooc/api exec vitest run --config vitest.integration.config.ts src/infra/persistence/portal/PortalSignIn.integration.test.ts`
Expected: PASS. Se o `getSession` não aceitar o cookie sem prefixo, mande os dois nomes como `BetterAuthCurrentSessionPort` faz.

- [ ] **Step 3: Rodar a suíte de banco inteira**

Run: `DATABASE_URL=postgres://ooc:ooc@localhost:5432/ooc_dev pnpm test:api:db`
Expected: verde.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/infra/persistence/portal/PortalSignIn.integration.test.ts
git commit -m "test(api): prove only a real credential signs a student in, end to end"
```

---

### Task 12: Guarda do portal e logout real

**Files:**
- Create: `apps/app/src/lib/auth/sign-out.ts`, `apps/app/src/lib/portal/session.ts`
- Modify: `apps/app/src/app/[locale]/actions.ts`, `apps/app/src/app/[locale]/backoffice/actions.ts`
- Modify: `apps/app/src/app/[locale]/portal/layout.tsx`, `portal/page.tsx`, `portal/profile/page.tsx`, `portal/courses/page.tsx`, `portal/courses/[enrollmentId]/page.tsx`, `portal/payments/page.tsx`, `portal/enrollment/page.tsx`, `portal/documents/page.tsx`, `portal/continue/page.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/portal/me` (Task 10); `apiFetch`, `resolveSessionCookie` de `@/lib/backoffice/api-client`.
- Produces: `getStudentSession(): Promise<StudentIdentity>` (memoizado por request; redireciona a `/login` em qualquer não-OK); `getPortalView(): Promise<PortalSession>` (mock com `student.firstName/lastName/email` reais); `signOutSession(): Promise<void>`.

- [ ] **Step 1: Sign-out compartilhado**

`apps/app/src/lib/auth/sign-out.ts`:

```ts
import 'server-only'
import { cookies } from 'next/headers'
import { serverEnv } from '@/server-env'
import { resolveSessionCookie, SESSION_COOKIE_NAME } from '@/lib/backoffice/api-client'
import { requestIdentityHeaders } from '@/lib/api-identity'

/**
 * Signs the session out with Better Auth itself — the session row dies
 * server-side — then clears the cookie whatever that call answered. Same for
 * the portal and the panel: one cookie, one sign-out.
 */
export async function signOutSession(): Promise<void> {
  const jar = await cookies()
  const session = await resolveSessionCookie()

  if (session) {
    await fetch(new URL('/api/auth/sign-out', serverEnv.API_INTERNAL_URL), {
      method: 'POST',
      headers: { ...(await requestIdentityHeaders()), cookie: `${session.name}=${session.value}` },
    }).catch(() => {
      // Best-effort: the cookie clears below either way.
    })
  }

  jar.delete(session?.name ?? SESSION_COOKIE_NAME)
}
```

(Se `server-only` não estiver instalado no app, remova o import — confira `apps/app/package.json`.)

`app/[locale]/backoffice/actions.ts` — `logoutStaff` vira:

```ts
export async function logoutStaff() {
  await signOutSession()
  const locale = await getLocale()
  redirect({ href: '/backoffice', locale })
}
```

(remova os imports que ficarem sem uso; mantenha o doc comment apontando para `signOutSession`).

`app/[locale]/actions.ts`:

```ts
'use server'

import { getLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'
import { signOutSession } from '@/lib/auth/sign-out'

// Ends the portal session for real (Better Auth's sign-out + the cookie) and
// goes back to the login, keeping the locale.
export async function logout() {
  await signOutSession()
  const locale = await getLocale()
  redirect({ href: '/login', locale })
}
```

- [ ] **Step 2: Sessão do aluno**

`apps/app/src/lib/portal/session.ts`:

```ts
import { cache } from 'react'
import { getLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'
import { apiFetch } from '@/lib/backoffice/api-client'
import { getPortalSession } from './mock-data'
import type { PortalSession } from './types'

export interface StudentIdentity {
  firstName: string
  lastName: string
  email: string
}

/**
 * The signed-in student, read from the real session (`GET /portal/me`) —
 * never a client choice (CLAUDE.md §8). No session, an expired one, a staff
 * session or an account with no file behind it: back to the login. Every page
 * under /portal calls this (memoized per request), not only the layout — a
 * layout is not re-run on client navigation, a page is.
 */
export const getStudentSession = cache(async (): Promise<StudentIdentity> => {
  const response = await apiFetch('/api/v1/portal/me')
  if (!response.ok) {
    const locale = await getLocale()
    redirect({ href: '/login', locale })
    throw new Error('unreachable')
  }
  return (await response.json()) as StudentIdentity
})

/**
 * The portal's data until it is wired to the API (spec 2026-10-05, decision
 * 2): the mock persona's courses, payments and documents, under the real
 * student's name and e-mail.
 */
export async function getPortalView(): Promise<PortalSession> {
  const identity = await getStudentSession()
  const mock = getPortalSession()
  return {
    ...mock,
    student: { ...mock.student, firstName: identity.firstName, lastName: identity.lastName, email: identity.email },
  }
}
```

- [ ] **Step 3: Usar nas páginas**

- `portal/layout.tsx`: troque `import { getPortalSession } from '@/lib/portal/mock-data'` por `import { getPortalView } from '@/lib/portal/session'` e `const { student, notifications } = getPortalSession()` por `const { student, notifications } = await getPortalView()`.
- `portal/page.tsx` e `portal/profile/page.tsx`: idem (`await getPortalView()`).
- `portal/courses/page.tsx`, `courses/[enrollmentId]/page.tsx`, `payments/page.tsx`, `enrollment/page.tsx`, `documents/page.tsx`, `continue/page.tsx`: logo depois do `setRequestLocale(...)`, acrescente `await getStudentSession()` (import de `@/lib/portal/session`). A leitura de dados mock nelas fica como está.

- [ ] **Step 4: Verificar**

Run: `pnpm typecheck:app && pnpm lint`
Expected: verde.

Teste manual (`pnpm dev:stack`, com a API apontando para o Postgres local): abrir `/portal` sem cookie → cai em `/login`; logado como staff no backoffice e abrir `/portal` → cai em `/login`.

- [ ] **Step 5: Commit**

```bash
git add apps/app
git commit -m "feat(app): guard the student portal with the real session and sign out for real"
```

---

### Task 13: Login real, "esqueci minha senha" e definir senha

**Files:**
- Create: `apps/app/src/app/[locale]/login/auth-shell.tsx`, `apps/app/src/lib/portal/auth-client.ts`
- Modify: `apps/app/src/app/[locale]/login/page.tsx`, `apps/app/src/app/[locale]/login/login-form.tsx`
- Delete: `apps/app/src/app/[locale]/login/actions.ts`
- Create: `apps/app/src/app/[locale]/forgot-password/page.tsx`, `forgot-password-form.tsx`
- Create: `apps/app/src/app/[locale]/access/[token]/page.tsx`, `access-form.tsx`
- Modify: `apps/app/src/messages/{es-PE,pt-BR,en}.json`

**Interfaces:**
- Consumes: `POST /api/v1/portal/sign-in`, `POST /api/v1/portal/password-resets/request`, `GET /api/v1/portal/access-tokens/:token`, `POST /api/v1/portal/access-tokens/:token/complete` (Tasks 9–10), `studentPasswordIssues` de `@ooc/domain/password-policy` (Task 1), `Turnstile` de `@/components/enrollment/turnstile`.
- Produces: `AuthShell({ children })`; `signInStudent(input)`, `requestPortalReset(input)`, `completePortalAccess(token, password)` em `lib/portal/auth-client.ts`.

- [ ] **Step 1: Locales**

Em `messages/{es-PE,pt-BR,en}.json`, no namespace `login`: **remova** `mock_notice`; troque `subtitle`, `brand_body` e `no_account_body` (não falam mais em "credenciais por e-mail", e sim em "crie sua senha pelo link"); acrescente `national_id_type_label`, `national_id_type_DNI`, `national_id_type_CE`, `national_id_type_passport`. E um namespace novo `portal_auth`. Os três arquivos têm de ter **exatamente** as mesmas chaves.

es-PE:
```json
    "subtitle": "Ingresa con tu correo o con el documento de tu matrícula.",
    "brand_body": "Cuando se aprueba tu matrícula te enviamos un enlace para crear tu contraseña.",
    "no_account_body": "Matricúlate y, al aprobarse, te enviaremos el enlace para crear tu contraseña.",
    "national_id_type_label": "Tipo de documento",
    "national_id_type_DNI": "DNI",
    "national_id_type_CE": "Carné de extranjería",
    "national_id_type_passport": "Pasaporte",
```
```json
  "portal_auth": {
    "forgot_title": "Recupera tu acceso",
    "forgot_subtitle": "Escribe tu correo o tu documento. Si tienes una cuenta, te enviaremos un enlace.",
    "forgot_submit": "Enviar enlace",
    "forgot_submitting": "Enviando…",
    "forgot_sent_title": "Revisa tu correo",
    "forgot_sent_body": "Si existe una cuenta con esos datos, te enviamos un enlace. El enlace para cambiar tu contraseña vale por una hora.",
    "forgot_error": "No pudimos enviar tu pedido. Inténtalo de nuevo en unos minutos.",
    "captcha_pending": "Completa la verificación de seguridad para continuar.",
    "captcha_unavailable": "La verificación de seguridad no cargó. Recarga la página.",
    "back_to_login": "Volver al ingreso",
    "access_title_activation": "Crea tu contraseña",
    "access_title_reset": "Crea una contraseña nueva",
    "access_subtitle": "Con ella entrarás al portal usando tu correo o tu documento.",
    "password_label": "Contraseña nueva",
    "confirm_label": "Repite la contraseña",
    "rule_length": "Al menos {min} caracteres",
    "rule_letter": "Al menos una letra",
    "rule_digit": "Al menos un número",
    "mismatch": "Las contraseñas no coinciden.",
    "weak": "La contraseña no cumple las reglas.",
    "submit": "Guardar contraseña",
    "submitting": "Guardando…",
    "done_title": "Listo",
    "done_body": "Tu contraseña quedó guardada. Ya puedes ingresar al portal.",
    "go_to_login": "Ir al ingreso",
    "invalid_title": "Este enlace ya no sirve",
    "invalid_body": "El enlace venció o ya se usó. Pide uno nuevo y te llegará a tu correo.",
    "request_new_link": "Pedir un enlace nuevo",
    "server_error": "Algo salió mal. Inténtalo de nuevo."
  },
```

pt-BR:
```json
    "subtitle": "Entre com seu e-mail ou com o documento da matrícula.",
    "brand_body": "Quando sua matrícula é aprovada, enviamos um link para você criar sua senha.",
    "no_account_body": "Matricule-se e, quando for aprovada, enviaremos o link para criar sua senha.",
    "national_id_type_label": "Tipo de documento",
    "national_id_type_DNI": "DNI",
    "national_id_type_CE": "Carteira de estrangeiro (CE)",
    "national_id_type_passport": "Passaporte",
```
```json
  "portal_auth": {
    "forgot_title": "Recupere seu acesso",
    "forgot_subtitle": "Digite seu e-mail ou seu documento. Se você tiver uma conta, enviaremos um link.",
    "forgot_submit": "Enviar link",
    "forgot_submitting": "Enviando…",
    "forgot_sent_title": "Confira seu e-mail",
    "forgot_sent_body": "Se existir uma conta com esses dados, enviamos um link. O link para trocar a senha vale por uma hora.",
    "forgot_error": "Não conseguimos enviar seu pedido. Tente de novo em alguns minutos.",
    "captcha_pending": "Complete a verificação de segurança para continuar.",
    "captcha_unavailable": "A verificação de segurança não carregou. Recarregue a página.",
    "back_to_login": "Voltar ao login",
    "access_title_activation": "Crie sua senha",
    "access_title_reset": "Crie uma senha nova",
    "access_subtitle": "Com ela você entra no portal usando seu e-mail ou seu documento.",
    "password_label": "Senha nova",
    "confirm_label": "Repita a senha",
    "rule_length": "Pelo menos {min} caracteres",
    "rule_letter": "Pelo menos uma letra",
    "rule_digit": "Pelo menos um número",
    "mismatch": "As senhas não coincidem.",
    "weak": "A senha não cumpre as regras.",
    "submit": "Salvar senha",
    "submitting": "Salvando…",
    "done_title": "Pronto",
    "done_body": "Sua senha foi salva. Você já pode entrar no portal.",
    "go_to_login": "Ir para o login",
    "invalid_title": "Este link não vale mais",
    "invalid_body": "O link venceu ou já foi usado. Peça um novo e ele chegará no seu e-mail.",
    "request_new_link": "Pedir um link novo",
    "server_error": "Algo deu errado. Tente de novo."
  },
```

en:
```json
    "subtitle": "Sign in with your e-mail or the document you enrolled with.",
    "brand_body": "Once your enrollment is approved, we e-mail you a link to create your password.",
    "no_account_body": "Enroll and, once it is approved, we'll e-mail you the link to create your password.",
    "national_id_type_label": "Document type",
    "national_id_type_DNI": "DNI",
    "national_id_type_CE": "Foreigner ID card (CE)",
    "national_id_type_passport": "Passport",
```
```json
  "portal_auth": {
    "forgot_title": "Recover your access",
    "forgot_subtitle": "Type your e-mail or your document. If you have an account, we'll send you a link.",
    "forgot_submit": "Send link",
    "forgot_submitting": "Sending…",
    "forgot_sent_title": "Check your e-mail",
    "forgot_sent_body": "If there is an account with those details, we sent you a link. The link to change your password is valid for one hour.",
    "forgot_error": "We couldn't send your request. Try again in a few minutes.",
    "captcha_pending": "Complete the security check to continue.",
    "captcha_unavailable": "The security check didn't load. Reload the page.",
    "back_to_login": "Back to sign in",
    "access_title_activation": "Create your password",
    "access_title_reset": "Create a new password",
    "access_subtitle": "You'll use it to sign in to the portal with your e-mail or your document.",
    "password_label": "New password",
    "confirm_label": "Repeat the password",
    "rule_length": "At least {min} characters",
    "rule_letter": "At least one letter",
    "rule_digit": "At least one number",
    "mismatch": "The passwords don't match.",
    "weak": "The password doesn't meet the rules.",
    "submit": "Save password",
    "submitting": "Saving…",
    "done_title": "Done",
    "done_body": "Your password is saved. You can sign in to the portal now.",
    "go_to_login": "Go to sign in",
    "invalid_title": "This link no longer works",
    "invalid_body": "The link expired or was already used. Ask for a new one and it will reach your e-mail.",
    "request_new_link": "Ask for a new link",
    "server_error": "Something went wrong. Try again."
  },
```

Ajuste também `login.title`/`generic_error` se ainda mencionarem algo falso (o `generic_error` atual fala em "correo y contraseña" — troque por "Verifica tus datos y tu contraseña." / "Confira seus dados e sua senha." / "Check your details and your password.").

- [ ] **Step 2: Cliente das chamadas**

`apps/app/src/lib/portal/auth-client.ts`:

```ts
import type { Locale } from '@/lib/format'

/** apps/api and the e-mails speak the full locale names (`LocaleSchema`). */
const EMAIL_LOCALE: Record<Locale, 'es-PE' | 'pt-BR' | 'en'> = { es: 'es-PE', pt: 'pt-BR', en: 'en' }

export type NationalIdType = 'DNI' | 'CE' | 'passport'
export type SignInMethod = 'email' | 'national_id'

export interface IdentifierInput {
  method: SignInMethod
  identifier: string
  nationalIdType?: NationalIdType
}

/** Through the same-origin proxy, so the Set-Cookie lands on this origin.
 * `ok: false` is every refusal alike; `errorId` only on a server failure. */
export async function signInStudent(
  input: IdentifierInput & { password: string },
): Promise<{ ok: true } | { ok: false; errorId: string | null }> {
  try {
    const response = await fetch('/api/v1/portal/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (response.ok) return { ok: true }
    const body = (await response.json().catch(() => null)) as { errorId?: string } | null
    return { ok: false, errorId: response.status >= 500 ? (body?.errorId ?? null) : null }
  } catch {
    return { ok: false, errorId: null }
  }
}

/** `true` when the API answered at all — it answers 202 whatever it did. */
export async function requestPortalReset(input: IdentifierInput & { captchaToken: string; locale: Locale }): Promise<boolean> {
  try {
    const response = await fetch('/api/v1/portal/password-resets/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, locale: EMAIL_LOCALE[input.locale] }),
    })
    return response.ok
  } catch {
    return false
  }
}

export type CompleteAccessResult = { ok: true } | { ok: false; error: 'link_invalid' | 'weak' | 'server' }

export async function completePortalAccess(token: string, password: string): Promise<CompleteAccessResult> {
  try {
    const response = await fetch(`/api/v1/portal/access-tokens/${encodeURIComponent(token)}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (response.ok) return { ok: true }
    const body = (await response.json().catch(() => null)) as { reason?: string } | null
    if (body?.reason === 'portal_access.link_invalid') return { ok: false, error: 'link_invalid' }
    if (body?.reason === 'portal_access.weak_password') return { ok: false, error: 'weak' }
    return { ok: false, error: 'server' }
  } catch {
    return { ok: false, error: 'server' }
  }
}
```

- [ ] **Step 3: `AuthShell`**

Mova o esqueleto visual de `login/page.tsx` (o `<div className="grid min-h-dvh ...">` com o `<aside>` de marca, o `<main>` com logo, voltar ao site e `LanguageGlobe`) para `login/auth-shell.tsx`, como componente servidor assíncrono que recebe `children` e renderiza no lugar do miolo (`<div className="w-full max-w-md">{children}</div>`):

```tsx
import type { ReactNode } from 'react'
// (mesmos imports que page.tsx usa para o esqueleto: Image, getTranslations, env, LanguageGlobe, ícones)

/**
 * The visual frame of the student's public auth screens — login, forgot
 * password, set password. Dressed as the landing (see the login page's
 * comment): the screen where a password is typed is the worst place to look
 * like another product.
 */
export async function AuthShell({ children }: { children: ReactNode }) {
  const t = await getTranslations('login')
  const siteUrl = env.NEXT_PUBLIC_LANDING_URL ?? '/'
  const highlights = [/* idem page.tsx */]
  return (/* o JSX que estava em page.tsx, com {children} onde ficava o bloco do formulário */)
}
```

`login/page.tsx` passa a ser: `setRequestLocale`, `getTranslations('login')`, e `<AuthShell><LoginForm />{/* bloco "no_account" que já existe */}{/* link mobile voltar */}</AuthShell>`. O comentário de topo da página troca "as credenciais chegam por e-mail" por "a conta nasce na aprovação do pagamento; o aluno recebe um link para criar a senha".

- [ ] **Step 4: `LoginForm` real**

Em `login-form.tsx`:
- remova `useActionState`, o import de `./actions` e `initialState`; apague `login/actions.ts`;
- estado: `const [pending, setPending] = useState(false)`, `const [failure, setFailure] = useState<{ errorId: string | null } | null>(null)`, `const [nationalIdType, setNationalIdType] = useState<NationalIdType>('DNI')`;
- `<form onSubmit={onSubmit} ...>` em vez de `action={action}`; remova o `<input type="hidden" name="method">`;
- o banner de erro passa a depender de `failure` (`{failure && (...)}` com `failure.errorId`);
- na porta do documento, antes do campo de número, um `<select>` de tipo:

```tsx
        {!byEmail && (
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            {t('national_id_type_label')}
            <select
              value={nationalIdType}
              onChange={(event) => setNationalIdType(event.target.value as NationalIdType)}
              className="w-full rounded-2xl border border-line bg-sky-soft px-3 py-3 text-base font-normal text-ink outline-none focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-brand-blue/15"
            >
              {NATIONAL_ID_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`national_id_type_${type}`)}
                </option>
              ))}
            </select>
          </label>
        )}
```

  com `const NATIONAL_ID_TYPES: readonly NationalIdType[] = ['DNI', 'CE', 'passport']` no topo (comentário `eslint-disable-next-line i18next/no-literal-string` explicando que é união de domínio renderizada via `t()`, como o seletor de método já faz). O `inputMode` do número passa a ser `nationalIdType === 'DNI' ? 'numeric' : 'text'`;
- o handler:

```tsx
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setFailure(null)
    setPending(true)

    const form = new FormData(event.currentTarget)
    const result = await signInStudent({
      method,
      identifier: String(form.get('identifier') ?? ''),
      nationalIdType: method === 'national_id' ? nationalIdType : undefined,
      password: String(form.get('password') ?? ''),
    })

    if (!result.ok) {
      setPending(false)
      setFailure({ errorId: result.errorId })
      return
    }
    router.push('/portal')
    router.refresh()
  }
```

  (`const router = useRouter()` de `@/i18n/navigation`);
- o parágrafo "forgot_password" vira link (remova o comentário "Recuperação ainda não tem rota"):

```tsx
      <p className="mt-3 text-right text-sm">
        <Link href="/forgot-password" className="font-semibold text-brand-blue transition hover:text-brand-blue-deep">
          {t('forgot_password')}
        </Link>
      </p>
```

- remova o `<p>{t('mock_notice')}</p>`;
- atualize o doc comment do componente: anti-enumeração (o mesmo banner para tudo), o tipo do documento viaja junto, sessão via proxy same-origin.

- [ ] **Step 5: Esqueci minha senha**

`forgot-password/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { AuthShell } from '../login/auth-shell'
import { ForgotPasswordForm } from './forgot-password-form'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function ForgotPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <AuthShell>
      <ForgotPasswordForm />
    </AuthShell>
  )
}
```

`forgot-password/forgot-password-form.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { env } from '@/env'
import type { Locale } from '@/lib/format'
import { Turnstile } from '@/components/enrollment/turnstile'
import { requestPortalReset, type NationalIdType, type SignInMethod } from '@/lib/portal/auth-client'

const NATIONAL_ID_TYPES: readonly NationalIdType[] = ['DNI', 'CE', 'passport']

/**
 * The confirmation is the same whether or not an account exists (CLAUDE.md
 * §8): once the API answered, this screen says "if there is an account, we
 * sent a link" — it cannot know more, because the API does not tell it.
 */
export function ForgotPasswordForm() {
  const t = useTranslations('portal_auth')
  const tl = useTranslations('login')
  const locale = useLocale() as Locale
  const [method, setMethod] = useState<SignInMethod>('email')
  const [nationalIdType, setNationalIdType] = useState<NationalIdType>('DNI')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaDown, setCaptchaDown] = useState(false)
  const [captchaReset, setCaptchaReset] = useState(0)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<'captcha' | 'server' | null>(null)
  const [sent, setSent] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    if (!captchaToken) {
      setError('captcha')
      return
    }
    setError(null)
    setPending(true)
    const form = new FormData(event.currentTarget)
    const ok = await requestPortalReset({
      method,
      identifier: String(form.get('identifier') ?? ''),
      nationalIdType: method === 'national_id' ? nationalIdType : undefined,
      captchaToken,
      locale,
    })
    setPending(false)
    if (!ok) {
      setError('server')
      setCaptchaReset((n) => n + 1)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="rounded-[28px] border border-line bg-white p-6 shadow-float sm:p-7">
        <h1 className="font-display text-3xl font-semibold text-ink">{t('forgot_sent_title')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('forgot_sent_body')}</p>
        <Link href="/login" className="mt-6 inline-flex text-sm font-bold text-brand-blue hover:text-brand-blue-deep">
          {t('back_to_login')}
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-[28px] border border-line bg-white p-6 shadow-float sm:p-7">
      <h1 className="font-display text-3xl font-semibold text-ink">{t('forgot_title')}</h1>
      <p className="mt-2 mb-5 text-sm leading-relaxed text-muted-foreground">{t('forgot_subtitle')}</p>

      {error && (
        <p role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error === 'captcha' ? (captchaDown ? t('captcha_unavailable') : t('captcha_pending')) : t('forgot_error')}
        </p>
      )}

      {/* Same two doors as the login (method toggle + document type) — copy the
          toggle and the <select> from login-form.tsx, with `name="identifier"`
          on the field. */}

      <div className="mt-5">
        <Turnstile
          siteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
          locale={locale}
          resetKey={captchaReset}
          onToken={setCaptchaToken}
          onUnavailable={() => setCaptchaDown(true)}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-6 flex w-full items-center justify-center rounded-full bg-brand-blue px-4 py-3.5 text-sm font-bold text-white transition hover:bg-brand-yellow hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? t('forgot_submitting') : t('forgot_submit')}
      </button>

      <p className="mt-5 text-center text-sm">
        <Link href="/login" className="font-semibold text-muted-foreground hover:text-ink">
          {t('back_to_login')}
        </Link>
      </p>
    </form>
  )
}
```

Para não duplicar o seletor de método + tipo + campo entre `login-form.tsx` e `forgot-password-form.tsx`, extraia-os para `login/identifier-fields.tsx` (`IdentifierFields({ method, onMethodChange, nationalIdType, onNationalIdTypeChange })`, que renderiza o toggle, o `<select>`, o campo `name="identifier"` e a dica do documento, com as chaves de `login`) e use nos dois. O `tl` acima só é necessário se você não extrair; remova o que ficar sem uso.

Confirme o nome da env do site key em `apps/app/src/env.ts` (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`) e se ela pode ser `undefined` — se puder, trate como `captchaDown` desde o início, igual ao passo de revisão do checkout (`app/[locale]/enrollment/step-review.tsx`).

- [ ] **Step 6: Definir senha**

`access/[token]/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { apiFetch } from '@/lib/backoffice/api-client'
import { AuthShell } from '../../login/auth-shell'
import { AccessForm } from './access-form'

export const metadata: Metadata = { robots: { index: false, follow: false } }

type TokenState = { state: 'valid'; purpose: 'activation' | 'reset' } | { state: 'expired_or_used'; purpose: null }

/**
 * Where both portal e-mails land — the activation (account just created) and
 * the reset. The API says only whether the link works and what it is for.
 */
export default async function AccessPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params
  setRequestLocale(locale)
  const t = await getTranslations('portal_auth')

  const response = await apiFetch(`/api/v1/portal/access-tokens/${encodeURIComponent(token)}`)
  const link: TokenState = response.ok ? ((await response.json()) as TokenState) : { state: 'expired_or_used', purpose: null }

  return (
    <AuthShell>
      {link.state === 'valid' ? (
        <AccessForm token={token} purpose={link.purpose} />
      ) : (
        <div className="rounded-[28px] border border-line bg-white p-6 shadow-float sm:p-7">
          <h1 className="font-display text-3xl font-semibold text-ink">{t('invalid_title')}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('invalid_body')}</p>
          <Link href="/forgot-password" className="mt-6 inline-flex text-sm font-bold text-brand-blue hover:text-brand-blue-deep">
            {t('request_new_link')}
          </Link>
        </div>
      )}
    </AuthShell>
  )
}
```

`access/[token]/access-form.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { STUDENT_PASSWORD_MIN_LENGTH, studentPasswordIssues } from '@ooc/domain/password-policy'
import { Link } from '@/i18n/navigation'
import { completePortalAccess } from '@/lib/portal/auth-client'

/** Rules shown while typing — the same module the API checks with. */
export function AccessForm({ token, purpose }: { token: string; purpose: 'activation' | 'reset' }) {
  const t = useTranslations('portal_auth')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<'mismatch' | 'weak' | 'server' | null>(null)
  const [state, setState] = useState<'form' | 'done' | 'invalid'>('form')

  const issues = studentPasswordIssues(password)
  const rules = [
    { key: 'length', met: !issues.includes('too_short') && !issues.includes('too_long'), label: t('rule_length', { min: STUDENT_PASSWORD_MIN_LENGTH }) },
    { key: 'letter', met: !issues.includes('missing_letter'), label: t('rule_letter') },
    { key: 'digit', met: !issues.includes('missing_digit'), label: t('rule_digit') },
  ]

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    if (issues.length > 0) return setError('weak')
    if (password !== confirm) return setError('mismatch')
    setError(null)
    setPending(true)
    const result = await completePortalAccess(token, password)
    setPending(false)
    if (result.ok) return setState('done')
    if (result.error === 'link_invalid') return setState('invalid')
    setError(result.error)
  }

  if (state !== 'form') {
    const done = state === 'done'
    return (
      <div className="rounded-[28px] border border-line bg-white p-6 shadow-float sm:p-7">
        <h1 className="font-display text-3xl font-semibold text-ink">{done ? t('done_title') : t('invalid_title')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{done ? t('done_body') : t('invalid_body')}</p>
        <Link
          href={done ? '/login' : '/forgot-password'}
          className="mt-6 inline-flex text-sm font-bold text-brand-blue hover:text-brand-blue-deep"
        >
          {done ? t('go_to_login') : t('request_new_link')}
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-[28px] border border-line bg-white p-6 shadow-float sm:p-7">
      <h1 className="font-display text-3xl font-semibold text-ink">
        {purpose === 'activation' ? t('access_title_activation') : t('access_title_reset')}
      </h1>
      <p className="mt-2 mb-5 text-sm leading-relaxed text-muted-foreground">{t('access_subtitle')}</p>

      {error && (
        <p role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error === 'mismatch' ? t('mismatch') : error === 'weak' ? t('weak') : t('server_error')}
        </p>
      )}

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
        {t('password_label')}
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-2xl border border-line bg-sky-soft px-3 py-3 text-base font-normal text-ink outline-none focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-brand-blue/15"
        />
      </label>
      <ul className="mt-2 flex flex-col gap-1 text-xs">
        {rules.map((rule) => (
          <li key={rule.key} className={rule.met ? 'text-emerald-700' : 'text-muted-foreground'}>
            {rule.label}
          </li>
        ))}
      </ul>

      <label className="mt-5 flex flex-col gap-1.5 text-sm font-semibold text-ink">
        {t('confirm_label')}
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className="w-full rounded-2xl border border-line bg-sky-soft px-3 py-3 text-base font-normal text-ink outline-none focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-brand-blue/15"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="mt-6 flex w-full items-center justify-center rounded-full bg-brand-blue px-4 py-3.5 text-sm font-bold text-white transition hover:bg-brand-yellow hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? t('submitting') : t('submit')}
      </button>
    </form>
  )
}
```

(O lint pode reclamar do `key: 'length'` etc. como literal — são chaves de React, não texto; use o mesmo `eslint-disable-next-line i18next/no-literal-string -- …` com justificativa que o repo já usa em `login-form.tsx`.)

- [ ] **Step 7: Middleware**

Confirme em `apps/app/src/middleware.ts` que `/forgot-password` e `/access/*` passam pelo next-intl como `/login` (sem rewrite do host do backoffice) e que o CSP já libera a origem do Turnstile (o agente de exploração confirmou que sim). Se o host do backoffice reescreve tudo para `/backoffice`, essas rotas só existem no host do portal — é o esperado.

- [ ] **Step 8: Verificar**

Run: `pnpm typecheck:app && pnpm lint && pnpm build:app`
Expected: verde (o build pega chave de locale faltando em `getTranslations` estático só em runtime — abra as três telas nos três idiomas no passo manual).

Manual (`pnpm dev:stack`):
1. Aprove um pagamento pelo backoffice (seed local) → no log do `LogNotificationProvider` aparece o `portal_credentials` com o link `/access/<token>`.
2. Abra o link → "Crea tu contraseña"; tente `corta1` → regra em vermelho; defina `clave-segura-1` → "Listo".
3. Abra o link de novo → "Este enlace ya no sirve".
4. `/login` por e-mail e por documento (com pontos) → portal com o nome real no cabeçalho.
5. Senha errada, documento malformado, e-mail inexistente → o mesmo banner.
6. `/forgot-password` → mesma tela de confirmação para e-mail existente e inexistente.
7. Troque o idioma para `pt` e `en` nas três telas.

- [ ] **Step 9: Commit**

```bash
git add apps/app
git commit -m "feat(app): real student sign-in, password recovery and set-password screens"
```

---

### Task 14: Backoffice — enviar acesso e aviso de conflito

**Files:**
- Create: `apps/app/src/lib/backoffice/portal-access-client.ts`, `apps/app/src/app/[locale]/backoffice/(panel)/(gated)/students/[studentId]/portal-access-control.tsx`
- Modify: `apps/app/src/lib/backoffice/types.ts` (`StudentDetail`), `apps/app/src/lib/backoffice/permissions.ts`, `apps/app/src/app/[locale]/backoffice/(panel)/(gated)/students/[studentId]/page.tsx`
- Modify: `apps/app/src/lib/backoffice/payment-client.ts`, `apps/app/src/app/[locale]/backoffice/(panel)/(gated)/payments/review/review-queue-view.tsx`
- Modify: `apps/app/src/messages/backoffice/{es-PE,pt-BR,en}.json`

**Interfaces:**
- Consumes: `POST /api/v1/students/:id/portal-access`, `GET /api/v1/students/:id` (`portalAccess`), `POST /payments/:id/approve` (`portalAccess`).
- Produces: `canIssuePortalAccess(role: StaffRole): boolean`; `issuePortalAccess(studentId): Promise<{ ok: true; outcome: IssuePortalAccessOutcome } | { ok: false; error: 'no_confirmed_enrollment' | 'generic' }>`; `StudentDetail.portalAccess: 'none' | 'pending_activation' | 'active'`.

- [ ] **Step 1: Tipos e permissão**

`types.ts` — em `StudentDetail`: `portalAccess: PortalAccessState` com `export type PortalAccessState = 'none' | 'pending_activation' | 'active'` logo acima. (Se algum mock constrói `StudentDetail`, acrescente `portalAccess: 'none'` nele — o `tsc` aponta.)

`permissions.ts`, perto de `canCreateStudent`:

```ts
/**
 * Who sends a student their portal access from the file — the same audience
 * as the file itself (`GetStudentRoute`) and the API route behind the button
 * (`IssuePortalAccessRoute`). Billing settles money; it does not hand out
 * accounts.
 */
export function canIssuePortalAccess(role: StaffRole): boolean {
  return isManagement(role) || role === 'enrollment_supervisor'
}
```

- [ ] **Step 2: Cliente**

`portal-access-client.ts`:

```ts
export type IssuePortalAccessOutcome =
  | 'created'
  | 'linked_existing'
  | 'already_linked'
  | 'email_conflict'
  | 'activation_resent'
  | 'reset_sent'

export type IssuePortalAccessResult =
  | { ok: true; outcome: IssuePortalAccessOutcome }
  | { ok: false; error: 'no_confirmed_enrollment' | 'generic' }

export async function issuePortalAccess(studentId: string): Promise<IssuePortalAccessResult> {
  try {
    const response = await fetch(`/api/v1/students/${encodeURIComponent(studentId)}/portal-access`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (response.ok) return { ok: true, outcome: ((await response.json()) as { outcome: IssuePortalAccessOutcome }).outcome }
    const body = (await response.json().catch(() => null)) as { reason?: string } | null
    return { ok: false, error: body?.reason === 'portal_access.no_confirmed_enrollment' ? 'no_confirmed_enrollment' : 'generic' }
  } catch {
    return { ok: false, error: 'generic' }
  }
}
```

- [ ] **Step 3: Componente**

`portal-access-control.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { BoIcon } from '@/components/backoffice/icons'
import { issuePortalAccess, type IssuePortalAccessOutcome } from '@/lib/backoffice/portal-access-client'
import type { PortalAccessState } from '@/lib/backoffice/types'

/**
 * Shows where the student's portal access stands and, for whoever may, sends
 * it: creates the account, re-sends the activation, or sends a reset link —
 * the API picks which. The outcome is said back in words, never as its code.
 */
export function PortalAccessControl({
  studentId,
  state,
  canIssue,
}: {
  studentId: string
  state: PortalAccessState
  canIssue: boolean
}) {
  const t = useTranslations('bo')
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null)

  async function send() {
    setBusy(true)
    setMessage(null)
    const result = await issuePortalAccess(studentId)
    setBusy(false)
    if (!result.ok) {
      setMessage({ tone: 'warn', text: t(`student_file.portal_access_error.${result.error}`) })
      return
    }
    const warn: IssuePortalAccessOutcome[] = ['email_conflict']
    setMessage({ tone: warn.includes(result.outcome) ? 'warn' : 'ok', text: t(`student_file.portal_access_outcome.${result.outcome}`) })
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink">
        <BoIcon name="email" size={14} />
        {t(`student_file.portal_access_state.${state}`)}
      </span>
      {canIssue && (
        <button
          type="button"
          onClick={send}
          disabled={busy || pending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-blue px-3 py-1.5 text-xs font-semibold text-brand-blue transition hover:bg-sky disabled:opacity-60"
        >
          {busy ? t('student_file.portal_access_sending') : t('student_file.portal_access_send')}
        </button>
      )}
      {message && (
        <p role="status" className={`w-full text-xs ${message.tone === 'ok' ? 'text-emerald-700' : 'text-amber-700'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
```

Na `students/[studentId]/page.tsx`, troque o `<span className="inline-flex cursor-not-allowed ...">` do `resend_credentials` + `nav.soon` por:

```tsx
            <PortalAccessControl
              studentId={student.id}
              state={student.portalAccess}
              canIssue={canIssuePortalAccess(staff.role)}
            />
```

guardando `const staff = await getStaffSession()` antes do `if (!canBrowseStudents(staff.role)) notFound()`.

- [ ] **Step 4: Pagos**

`payment-client.ts`: `approvePayment` passa a devolver `PaymentWriteResult<{ id: string; portalAccess: 'created' | 'linked_existing' | 'already_linked' | 'email_conflict' | null }>`.

`review-queue-view.tsx`, em `decide`, no ramo `result.ok`:

```tsx
      const conflict = decision.kind === 'approve' && 'portalAccess' in result.data && result.data.portalAccess === 'email_conflict'
      setToast(
        t(decision.kind === 'approve' ? (conflict ? 'review.approved_portal_conflict_toast' : 'review.approved_toast') : 'review.rejected_toast'),
      )
```

(Se o toast hoje só some sozinho em poucos segundos, avalie dar mais tempo para esse — é o único que pede ação.)

- [ ] **Step 5: Locales do backoffice**

Em `messages/backoffice/{es-PE,pt-BR,en}.json`, dentro de `bo.student_file`, **remova** `resend_credentials` (confira com grep que mais nada usa) e acrescente; dentro de `bo.review`, acrescente `approved_portal_conflict_toast`.

es-PE:
```json
      "portal_access_state": {
        "none": "Sin acceso al portal",
        "pending_activation": "Acceso enviado, contraseña pendiente",
        "active": "Acceso al portal activo"
      },
      "portal_access_send": "Enviar acceso al portal",
      "portal_access_sending": "Enviando…",
      "portal_access_outcome": {
        "created": "Cuenta creada. Enviamos al alumno el enlace para crear su contraseña.",
        "linked_existing": "Esta ficha quedó unida a la cuenta que el alumno ya tenía.",
        "already_linked": "El alumno ya tenía su cuenta.",
        "email_conflict": "El correo de esta ficha ya pertenece a otra cuenta. Corrige el correo y vuelve a enviar el acceso.",
        "activation_resent": "Reenviamos el enlace para crear la contraseña.",
        "reset_sent": "Enviamos un enlace para que el alumno cree una contraseña nueva."
      },
      "portal_access_error": {
        "no_confirmed_enrollment": "El acceso al portal se envía solo a alumnos con una matrícula confirmada.",
        "generic": "No pudimos enviar el acceso. Inténtalo de nuevo."
      }
```
```json
      "approved_portal_conflict_toast": "Pago aprobado, pero no creamos la cuenta del portal: el correo del alumno ya pertenece a otra cuenta. Corrígelo en la ficha y envía el acceso."
```

pt-BR:
```json
      "portal_access_state": {
        "none": "Sem acesso ao portal",
        "pending_activation": "Acesso enviado, senha pendente",
        "active": "Acesso ao portal ativo"
      },
      "portal_access_send": "Enviar acesso ao portal",
      "portal_access_sending": "Enviando…",
      "portal_access_outcome": {
        "created": "Conta criada. Enviamos ao aluno o link para criar a senha.",
        "linked_existing": "Esta ficha foi ligada à conta que o aluno já tinha.",
        "already_linked": "O aluno já tinha conta.",
        "email_conflict": "O e-mail desta ficha já pertence a outra conta. Corrija o e-mail e envie o acesso de novo.",
        "activation_resent": "Reenviamos o link para criar a senha.",
        "reset_sent": "Enviamos um link para o aluno criar uma senha nova."
      },
      "portal_access_error": {
        "no_confirmed_enrollment": "O acesso ao portal só é enviado a alunos com matrícula confirmada.",
        "generic": "Não conseguimos enviar o acesso. Tente de novo."
      }
```
```json
      "approved_portal_conflict_toast": "Pagamento aprovado, mas a conta do portal não foi criada: o e-mail do aluno já pertence a outra conta. Corrija na ficha e envie o acesso."
```

en:
```json
      "portal_access_state": {
        "none": "No portal access",
        "pending_activation": "Access sent, password pending",
        "active": "Portal access active"
      },
      "portal_access_send": "Send portal access",
      "portal_access_sending": "Sending…",
      "portal_access_outcome": {
        "created": "Account created. We sent the student the link to create their password.",
        "linked_existing": "This file is now linked to the account the student already had.",
        "already_linked": "The student already had an account.",
        "email_conflict": "This file's e-mail already belongs to another account. Fix the e-mail and send the access again.",
        "activation_resent": "We re-sent the link to create the password.",
        "reset_sent": "We sent the student a link to create a new password."
      },
      "portal_access_error": {
        "no_confirmed_enrollment": "Portal access is only sent to students with a confirmed enrollment.",
        "generic": "We couldn't send the access. Try again."
      }
```
```json
      "approved_portal_conflict_toast": "Payment approved, but the portal account was not created: the student's e-mail already belongs to another account. Fix it on the file and send the access."
```

- [ ] **Step 6: Verificar**

Run: `pnpm typecheck:app && pnpm lint && pnpm build:app`
Manual: na ficha de um aluno com matrícula confirmada e sem conta → "Sin acceso al portal" → enviar → "Cuenta creada…" e o estado muda para "contraseña pendiente"; logado como `billing` o botão não aparece; aprovar em Pagos um aluno cujo e-mail já é de outra conta → toast de conflito.

- [ ] **Step 7: Commit**

```bash
git add apps/app
git commit -m "feat(app): send portal access from the student file and flag e-mail conflicts on approval"
```

---

### Task 15: Documentação e verificação final

**Files:**
- Modify: `CLAUDE.md`, `apps/api/CLAUDE.md`, `apps/app/CLAUDE.md`, `docs/ARCHITECTURE.md`, `README.md`, `docs/superpowers/specs/2026-10-05-student-auth-design.md`

- [ ] **Step 1: `CLAUDE.md` raiz**

- §1, item da OOC-55: troque "**Fora:** credenciais do portal na aprovação (não existe conta de aluno), cron da janela de 5 dias." por "**Fora:** cron da janela de 5 dias. **Conta do portal (reaberto em 05/10/2026):** a primeira aprovação cria a conta do aluno (`"user"`, papel `student`, ligada por `students.user_id`) e envia `portal_credentials` com um link de definir senha — nunca a senha; e-mail já usado por outra conta não cria e não trava a aprovação (vira aviso e `audit_log`); a ficha tem o botão *Enviar acesso ao portal* para quem foi aprovado antes ou para depois de corrigir o e-mail. Login por e-mail **ou** documento, recuperação por link de 1 h, sem auto-cadastro (`disableSignUp`). Desenho em `docs/superpowers/specs/2026-10-05-student-auth-design.md`."
- Fluxo de negócio (bloco de código): "uma pessoa aprova em Pagos: recebe credenciais e e-mail de bem-vindas" → "uma pessoa aprova em Pagos: o aluno recebe o link para criar a senha do portal e o e-mail de aprovação".
- §8: acrescente sob os papéis: "Aluno entra no portal só por `POST /api/v1/portal/sign-in` (e-mail ou documento resolvidos no servidor, resposta única 204/401); `GET /portal/me` é a primeira rota com `.roles("student")`."

- [ ] **Step 2: `apps/api/CLAUDE.md`**

Na seção de liquidação (linhas ~16-17), troque "Ainda não existe: credenciais do portal na aprovação…" pela descrição do provisionamento na mesma transação e dos quatro resultados. Acrescente uma seção **Auth do aluno**: rota própria + `signInEmail`, sentinela, conta só com ficha ligada, rate limits por identificador e no catch-all, `portal_access_tokens` com hash, cooldown, `disableSignUp` e por que o provisionamento de staff grava direto (`credentialAccount.ts`). Na linha 163-164 ("Credenciais do portal só pro aluno") aponte os dois templates.

- [ ] **Step 3: `apps/app/CLAUDE.md`**

Em "Pontos de entrada separados": portal agora com sessão real (`getStudentSession` em toda página de `/portal`), telas `/login`, `/forgot-password`, `/access/[token]`; dados das telas ainda mock exceto nome/e-mail.

- [ ] **Step 4: `docs/ARCHITECTURE.md` §5.6**

Troque a linha "telas de login… continuam mockadas — wiring real, MFA e redirect por role pertencem à Sessão 31" por: login de staff e do aluno reais; MFA do staff ainda pendente; o auto-cadastro do Better Auth fechado e contas gravadas por `credentialAccount.ts`.

- [ ] **Step 5: `README.md` "Estado atual"**

Linhas ~111-114: o login do aluno deixa de ser mock; a tabela por tela (~335-336) marca `/login`, `/forgot-password`, `/access/[token]` como reais e o portal como "sessão real, dados mock (exceto identidade)".

- [ ] **Step 6: Spec**

Atualize a spec para o que o plano decidiu:
- §1: índice de expressão `students_portal_national_id_idx` (documento normalizado em SQL, só fichas com conta).
- §3: a busca exige ficha viva ligada à conta; a resolução por documento normaliza em SQL — fichas anteriores à OOC-64 também entram.
- §6: `/portal/me` devolve `{ firstName, lastName, email }`; conta `student` sem ficha → 403.
- "Fora": remova "normalização das fichas antigas… não casam pela porta do documento".

- [ ] **Step 7: ROADMAP — só sinalizar**

Não editar `docs/ROADMAP.md`. Anote para a mensagem final: Sessões 30 (e-mail de credenciais), 31 (shell e autenticação) e 33 (disparo de credenciais na aprovação em massa) ficaram desatualizadas.

- [ ] **Step 8: Verificação completa**

Run, na raiz:
```
pnpm typecheck:domain && pnpm typecheck:queue && pnpm typecheck:db && pnpm typecheck:api && pnpm typecheck:app
pnpm lint
pnpm test:api
DATABASE_URL=postgres://ooc:ooc@localhost:5432/ooc_dev pnpm test:api:db
DATABASE_URL=postgres://ooc:ooc@localhost:5432/ooc_dev pnpm test:db
pnpm build:app
```
Expected: tudo verde. Cole a saída resumida no PR.

- [ ] **Step 9: Commit**

```bash
git add CLAUDE.md apps/api/CLAUDE.md apps/app/CLAUDE.md docs README.md
git commit -m "docs: record real student authentication and the portal account created on approval"
```

---

## Antes do merge (ops — com o dono)

1. `fly secrets set PORTAL_PUBLIC_URL=https://student.onlyonecoin.edu.pe -a <app da api>` — sem isso o `check-secrets` barra o deploy.
2. Conferir em produção se existe conta `student` criada pelo sign-up aberto (antes do `disableSignUp`): `select id, email, "createdAt" from "user" u where role = 'student' and not exists (select 1 from students s where s.user_id = u.id)` — rodado por quem tem acesso de leitura, **não** como migration nem `psql` de escrita. Elas não entram no portal (a busca exige ficha ligada), mas bloqueiam o e-mail de um aluno real (`email_conflict`). Decidir com o dono o que fazer com elas.
3. Avisar a coordenação: alunos aprovados antes do deploy não têm conta — o botão *Enviar acesso ao portal* resolve um a um.
