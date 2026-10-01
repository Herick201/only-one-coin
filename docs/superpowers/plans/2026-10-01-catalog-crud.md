# CRUD real de cursos (OOC-36) e turmas (OOC-35) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o mock das telas de cursos e turmas do backoffice por escrita e leitura reais, com planos e preços versionados, turma em rascunho, janela de inscrição, ciclo de vida manual, duplicação de período e lista de espera manual.

**Architecture:** Entidades e usecases no contexto `catalog` de `packages/domain` (invariantes na entidade, portas de repositório), repositórios Drizzle e queries de leitura em `apps/api/src/infra/persistence/catalog`, rotas `RouteBuilder` sob `/api/v1/catalog/*`. `apps/app` lê por `apiFetch` em Server Component e escreve pelo proxy same-origin `/api/v1/*`, chamando `router.refresh()` depois de cada escrita.

**Tech Stack:** TypeScript, zod, Drizzle ORM + drizzle-kit, Postgres, Fastify + fastify-type-provider-zod, vitest, Next.js 15 App Router, next-intl 4.

**Spec:** `docs/superpowers/specs/2026-10-01-catalog-crud-design.md`

## Global Constraints

- Código, comentários, commits, branch e PR em inglês. Conversa e docs internas em português (`CLAUDE.md` §4, §9).
- Zero string de UI em `.ts`/`.tsx`: todo texto visível em `apps/app/src/messages/backoffice/{es-PE,pt-BR,en}.json`, mesma estrutura de chaves nos três.
- Zero código de domínio na tela: status, motivo e `reason` sempre resolvidos pelo locale.
- Dinheiro em `amount_cents INTEGER`. Datas `timestamptz`; data de calendário digitada na tela é meia-noite de `America/Lima` (`-05:00`, sem horário de verão).
- Migrations só aditivas. Nunca editar migration mergeada.
- Preço nunca é editado: `plan_prices` só recebe INSERT; `valid_from` nunca no passado (tolerância 60 s).
- `seats_taken` nunca é escrito por usecase de catálogo. Só o UPDATE atômico do hold/matrícula mexe nele.
- Toda escrita de catálogo grava no `audit_log` (`catalog.<entidade>.<verbo>`).
- Toda rota declara papéis. Sem rate limit (Sessão 25) — comentário `// No rate limit yet (docs/ROADMAP.md Sessão 25).` como nas rotas atuais.
- Papéis: leitura `master, admin, analyst, enrollment_supervisor, academic_supervisor, sales, support`; escrita de catálogo `master, admin, enrollment_supervisor`; criar curso, renomear/reidentificar curso, plano e preço `master, admin`.
- Commits pequenos, convencionais, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Desvios assumidos em relação ao spec (registrar no spec na Task 16)

1. Duas migrations em vez de uma: `0017` (cursos + trava de `plan_prices`) no PR do OOC-36 e `0018` (turmas + espera) no PR do OOC-35. Cada PR leva o schema que usa.
2. A edição de curso vira duas rotas: `PATCH /catalog/courses/:id` (identidade + opções, `master`/`admin`) e `PATCH /catalog/courses/:id/options` (só opções, + `enrollment_supervisor`). É o que faz a regra "renomear curso é de quem cria" valer na API, não só na tela.
3. Escritas devolvem `{ id }` (mais o dado específico: status, contagens de duplicação, matrículas vivas); a tela relê com `router.refresh()`.
4. A tela de turmas filtra **período** pela API (`?periodId=`); busca por texto e idioma filtram em memória dentro do período (~40 linhas). A API aceita `courseId`, `status` e `q` também.
5. Turma criada/editada pelo painel grava `schedule = ''` e o horário só em `slots` (`{ weekday, startTime, endTime }[]`). `schedule` texto fica como legado de seed; o seletor da matrícula manual passa a formatar por `slots`.

## Comandos

| O quê | Comando |
| --- | --- |
| Testes unitários da API (domínio com fakes) | `pnpm --filter @ooc/api test` |
| Testes de integração da API | `pnpm --filter @ooc/api test:db` (precisa `DATABASE_URL` de Postgres migrado) |
| Testes do banco (privilégios) | `pnpm --filter @ooc/db test` |
| Subir/migrar Postgres local | `pnpm db:up` e `pnpm db:migrate` (raiz) |
| Gerar migration | `pnpm --filter @ooc/db db:generate --name <nome>` |
| Typecheck | `pnpm typecheck:domain`, `pnpm typecheck:api`, `pnpm typecheck:db`, `pnpm typecheck:app` |
| Lint | `pnpm lint` |

`@ooc/domain` é consumido por `apps/api` pelo export `development` (fonte), então não precisa build entre tasks; se o typecheck da API reclamar de `dist`, rodar `pnpm --filter @ooc/domain build`.

---

# PARTE 1 — OOC-36 · Cursos, planos e preços

### Task 1: Migration 0017 — colunas de curso e trava de `plan_prices`

**Files:**
- Modify: `packages/db/src/schema.ts:98-119` (courses)
- Create: `packages/db/migrations/0017_<gerado>.sql` (via drizzle-kit, depois acrescentar SQL manual)
- Modify: `packages/db/tests/privileges.test.ts`

**Interfaces:**
- Produces: colunas `courses.summary`, `courses.certificate_rule`, `courses.allows_freeze`, `courses.allows_transfer`; Drizzle `courses.summary/certificateRule/allowsFreeze/allowsTransfer`.

- [ ] **Step 1: Escrever o teste de privilégio que falha**

Em `packages/db/tests/privileges.test.ts`, nos dois `describe` (GRANT e TRIGGER), acrescentar casos para `plan_prices`. Seguir exatamente o formato dos casos de `audit_log` já existentes no arquivo (mesmo helper de expectativa de erro, `DENIED_BY_GRANT` no bloco do papel de aplicação, `DENIED_BY_TRIGGER` no bloco do dono):

```ts
  it("refuses UPDATE on plan_prices", async () => {
    await expectRefused(
      client,
      "UPDATE plan_prices SET amount_cents = amount_cents WHERE false",
      DENIED_BY_GRANT,
    );
  });

  it("refuses DELETE on plan_prices", async () => {
    await expectRefused(client, "DELETE FROM plan_prices WHERE false", DENIED_BY_GRANT);
  });
```

e no bloco do dono o mesmo par com `DENIED_BY_TRIGGER`. Se o helper do arquivo tiver outro nome que `expectRefused`, usar o nome real — ler o arquivo antes (linhas 60-110).

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @ooc/db test`
Expected: FAIL nos quatro casos novos de `plan_prices` (UPDATE/DELETE passam hoje).

- [ ] **Step 3: Alterar o schema de `courses`**

Em `packages/db/src/schema.ts`, dentro de `courses`, depois de `totalHours`:

```ts
    // What the course is, in the student's words — the portal shows it under
    // "Sobre el curso". Default '' only so the column lands aditively.
    summary: text("summary").notNull().default(""),
    // How the certificate is earned (docs/REGRAS-NEGOCIO.md §6). Config, never
    // inferred from the course name (CLAUDE.md §1).
    certificateRule: text("certificate_rule").notNull().default("automatic"),
    // Which paid procedures the course offers (docs/REGRAS-NEGOCIO.md §5).
    allowsFreeze: boolean("allows_freeze").notNull().default(true),
    allowsTransfer: boolean("allows_transfer").notNull().default(false),
```

e no array de checks:

```ts
    check(
      "courses_certificate_rule_check",
      sql`${table.certificateRule} in ('automatic', 'exam_required')`,
    ),
```

Importar `boolean` de `drizzle-orm/pg-core` se ainda não estiver importado.

- [ ] **Step 4: Gerar a migration**

Run: `pnpm --filter @ooc/db db:generate --name catalog_courses`
Expected: novo `packages/db/migrations/0017_catalog_courses.sql` com os `ALTER TABLE "courses" ADD COLUMN ...` e o `ADD CONSTRAINT`.

- [ ] **Step 5: Acrescentar a trava de `plan_prices` ao fim do SQL gerado**

```sql
--> statement-breakpoint
-- plan_prices joins the 0011 lock (CLAUDE.md §6, apps/api/CLAUDE.md "preço é
-- versionado, nunca editado"): until now that rule was convention only. Both
-- layers, never one of the two (packages/db/CLAUDE.md).
REVOKE UPDATE, DELETE ON plan_prices FROM ooc_app;
--> statement-breakpoint
DROP TRIGGER IF EXISTS plan_prices_append_only ON plan_prices;
--> statement-breakpoint
CREATE TRIGGER plan_prices_append_only
	BEFORE UPDATE OR DELETE OR TRUNCATE ON plan_prices
	FOR EACH STATEMENT EXECUTE FUNCTION forbid_history_rewrite();
```

- [ ] **Step 6: Migrar e rodar os testes do banco**

Run: `pnpm db:migrate && pnpm --filter @ooc/db test`
Expected: PASS, incluindo os quatro casos novos. `tests/soft-delete.test.ts` continua verde (`plan_prices` já está em `APPEND_ONLY`).

- [ ] **Step 7: Typecheck e commit**

Run: `pnpm typecheck:db`

```bash
git add packages/db/src/schema.ts packages/db/migrations packages/db/tests/privileges.test.ts
git commit -m "feat(db): add course options columns and lock plan_prices against rewrites"
```

---

### Task 2: Domínio — `Course`, `CreateCourse`, `UpdateCourse`

**Files:**
- Create: `packages/domain/src/catalog/Course.ts`
- Create: `packages/domain/src/catalog/ports/ICourseRepository.ts`
- Create: `packages/domain/src/catalog/CreateCourseUseCase.ts`
- Create: `packages/domain/src/catalog/UpdateCourseUseCase.ts`
- Create: `packages/domain/src/shared/base/errors/ConflictError.ts`
- Modify: `packages/domain/src/catalog/errors.ts`
- Modify: `packages/domain/src/index.ts` (exports, bloco de catálogo ~linha 254)
- Test: `apps/api/src/tests/catalog-course.test.ts`
- Create: `apps/api/src/tests/fakes/catalog.ts` (fakes compartilhados pelas tasks de catálogo)

**Interfaces:**
- Produces:
  - `CertificateRuleSchema`, `type CertificateRule = "automatic" | "exam_required"`
  - `CreateCourseSchema` (zod), `type CreateCourseDTO`
  - `CourseOptionsSchema` (zod: `minAge, modules, totalHours, certificateRule, allowsFreeze, allowsTransfer`), `UpdateCourseSchema = CreateCourseSchema.partial()`, `type UpdateCourseDTO`
  - `class Course extends SoftDeletableModel` com campos `name, language, level, summary, minAge, modules, totalHours, certificateRule, allowsFreeze, allowsTransfer`; `static create(dto)`; `update(patch): string[]` (devolve as chaves que mudaram)
  - `interface ICourseRepository { create(course: Course): Promise<Course>; findById(id: string): Promise<Course | null>; update(course: Course): Promise<Course> }`
  - `class ConflictError extends HttpError` (409)
  - `CourseNotFoundError` (`catalog.course_not_found`, 404)
  - `CreateCourseUseCase.run({ actorId, course: CreateCourseDTO }): Promise<Course>`
  - `UpdateCourseUseCase.run({ actorId, id, patch: UpdateCourseDTO }): Promise<Course>`
  - fakes: `FakeAuditLogRepository`, `FakeCourseRepository`

- [ ] **Step 1: Escrever os fakes compartilhados**

`apps/api/src/tests/fakes/catalog.ts`:

```ts
import type { AuditLogEntry, Course, IAuditLogRepository, ICourseRepository } from "@ooc/domain";

/**
 * In-memory stand-ins for the catalog ports. Shared by every catalog usecase
 * test so a port change breaks one fake, not five copies of it.
 */
export class FakeAuditLogRepository implements IAuditLogRepository {
  public readonly appended: AuditLogEntry[] = [];

  async append(entry: AuditLogEntry): Promise<void> {
    this.appended.push(entry);
  }
}

export class FakeCourseRepository implements ICourseRepository {
  public readonly rows = new Map<string, Course>();

  async create(course: Course): Promise<Course> {
    this.rows.set(course.id, course);
    return course;
  }

  async findById(id: string): Promise<Course | null> {
    return this.rows.get(id) ?? null;
  }

  async update(course: Course): Promise<Course> {
    this.rows.set(course.id, course);
    return course;
  }
}
```

- [ ] **Step 2: Escrever o teste que falha**

`apps/api/src/tests/catalog-course.test.ts`:

```ts
import {
  Course,
  CourseNotFoundError,
  CreateCourseUseCase,
  UpdateCourseUseCase,
  type CreateCourseDTO,
} from "@ooc/domain";
import { ZodError } from "zod";
import { beforeEach, describe, expect, it } from "vitest";
import { FakeAuditLogRepository, FakeCourseRepository } from "./fakes/catalog.js";

/**
 * Opening and changing a course (OOC-36). Pure domain — fakes, no database.
 * What matters: the invariants live on the entity, every write leaves an audit
 * line, and an update reports only what actually changed.
 */

const ACTOR = "usr_admin";

const A_COURSE: CreateCourseDTO = {
  name: "Inglés Básico",
  language: "Inglés",
  level: "A1",
  summary: "Curso de inglés para principiantes.",
  minAge: 13,
  modules: 4,
  totalHours: 80,
  certificateRule: "automatic",
  allowsFreeze: true,
  allowsTransfer: false,
};

let courses: FakeCourseRepository;
let auditLog: FakeAuditLogRepository;

beforeEach(() => {
  courses = new FakeCourseRepository();
  auditLog = new FakeAuditLogRepository();
});

describe("CreateCourseUseCase", () => {
  it("creates the course and audits it", async () => {
    const created = await new CreateCourseUseCase(courses, auditLog).run({ actorId: ACTOR, course: A_COURSE });

    expect(created.name).toBe("Inglés Básico");
    expect(created.deletedAt).toBeNull();
    expect(courses.rows.get(created.id)).toBe(created);
    expect(auditLog.appended).toEqual([
      expect.objectContaining({ actorId: ACTOR, action: "catalog.course.created", targetId: created.id }),
    ]);
  });

  it("refuses a minimum age of zero", () => {
    expect(() => Course.create({ ...A_COURSE, minAge: 0 })).toThrow(ZodError);
  });

  it("refuses a blank summary", () => {
    expect(() => Course.create({ ...A_COURSE, summary: "   " })).toThrow(ZodError);
  });
});

describe("UpdateCourseUseCase", () => {
  it("applies the patch and audits the changed fields only", async () => {
    const course = await courses.create(Course.create(A_COURSE));

    const updated = await new UpdateCourseUseCase(courses, auditLog).run({
      actorId: ACTOR,
      id: course.id,
      patch: { minAge: 15, modules: 4 },
    });

    expect(updated.minAge).toBe(15);
    expect(auditLog.appended).toEqual([
      expect.objectContaining({
        action: "catalog.course.updated",
        targetId: course.id,
        metadata: { fields: ["minAge"] },
      }),
    ]);
  });

  it("writes nothing when nothing changed", async () => {
    const course = await courses.create(Course.create(A_COURSE));

    await new UpdateCourseUseCase(courses, auditLog).run({ actorId: ACTOR, id: course.id, patch: { modules: 4 } });

    expect(auditLog.appended).toEqual([]);
  });

  it("answers 404 for a course not on file", async () => {
    await expect(
      new UpdateCourseUseCase(courses, auditLog).run({ actorId: ACTOR, id: "018f2b5c-0000-7000-8000-0000000000ff", patch: { minAge: 15 } }),
    ).rejects.toBeInstanceOf(CourseNotFoundError);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm --filter @ooc/api test -- catalog-course`
Expected: FAIL — `Course`/`CreateCourseUseCase` não exportados por `@ooc/domain`.

- [ ] **Step 4: `ConflictError`**

`packages/domain/src/shared/base/errors/ConflictError.ts`:

```ts
import { HttpError, type HttpErrorParams } from "./HttpError.js";

/**
 * The request collides with what is already there — a second run of something
 * that must happen once, a state that already moved on. Distinct from 422: the
 * request was valid, the world changed under it.
 */
export class ConflictError extends HttpError {
  constructor(params: Omit<HttpErrorParams, "status">) {
    super({ ...params, status: 409 });
  }
}
```

Exportar em `packages/domain/src/index.ts` ao lado de `NotFoundError` (procurar onde os erros base são exportados).

- [ ] **Step 5: Entidade `Course`**

`packages/domain/src/catalog/Course.ts`:

```ts
import { v7 as uuid } from "uuid";
import { z } from "zod";
import {
  BASE_PROPS_KEYS,
  SoftDeletableModel,
  SoftDeletableModelPropsSchema,
} from "../shared/base/SoftDeletableModel.js";

/** How the certificate is earned (docs/REGRAS-NEGOCIO.md §6). */
export const CertificateRuleSchema = z.enum(["automatic", "exam_required"]);
export type CertificateRule = z.infer<typeof CertificateRuleSchema>;

/**
 * What a row may hold. Looser than what may be written: courses that predate
 * OOC-36 carry `level = ''` and `summary = ''` (the columns landed with those
 * defaults), and reading them back must not throw.
 */
export const CoursePropsSchema = SoftDeletableModelPropsSchema.extend({
  name: z.string().trim().min(1),
  language: z.string().trim().min(1),
  level: z.string(),
  summary: z.string(),
  minAge: z.number().int().positive(),
  modules: z.number().int().positive(),
  totalHours: z.number().int().nonnegative(),
  certificateRule: CertificateRuleSchema,
  allowsFreeze: z.boolean(),
  allowsTransfer: z.boolean(),
});

export type CourseProps = z.infer<typeof CoursePropsSchema>;

/** What coordination may change day to day (the options sheet). */
export const CourseOptionsSchema = z.object({
  minAge: z.number().int().positive(),
  modules: z.number().int().positive(),
  totalHours: z.number().int().nonnegative(),
  certificateRule: CertificateRuleSchema,
  allowsFreeze: z.boolean(),
  allowsTransfer: z.boolean(),
});

/**
 * Opening a course. Level and summary are required here even though old rows
 * may lack them: a course created without a summary reaches students blank.
 */
export const CreateCourseSchema = CoursePropsSchema.omit(BASE_PROPS_KEYS).extend({
  level: z.string().trim().min(1),
  summary: z.string().trim().min(1),
});

export type CreateCourseDTO = z.infer<typeof CreateCourseSchema>;

export const UpdateCourseSchema = CreateCourseSchema.partial();
export type UpdateCourseDTO = z.infer<typeof UpdateCourseSchema>;

export class Course extends SoftDeletableModel {
  public name: string;
  public language: string;
  public level: string;
  public summary: string;
  public minAge: number;
  public modules: number;
  public totalHours: number;
  public certificateRule: CertificateRule;
  public allowsFreeze: boolean;
  public allowsTransfer: boolean;

  constructor(props: CourseProps) {
    super(props);
    this.name = props.name;
    this.language = props.language;
    this.level = props.level;
    this.summary = props.summary;
    this.minAge = props.minAge;
    this.modules = props.modules;
    this.totalHours = props.totalHours;
    this.certificateRule = props.certificateRule;
    this.allowsFreeze = props.allowsFreeze;
    this.allowsTransfer = props.allowsTransfer;
  }

  static create(dto: CreateCourseDTO): Course {
    return new Course(CoursePropsSchema.parse({ ...CreateCourseSchema.parse(dto), id: uuid() }));
  }

  /**
   * Applies a validated patch and answers which fields actually changed — the
   * audit line names those, and an empty answer means there is nothing to
   * write.
   */
  update(patch: UpdateCourseDTO): (keyof UpdateCourseDTO)[] {
    const valid = UpdateCourseSchema.parse(patch);
    const changed: (keyof UpdateCourseDTO)[] = [];

    for (const key of Object.keys(valid) as (keyof UpdateCourseDTO)[]) {
      const next = valid[key];
      if (next === undefined || this[key] === next) continue;
      (this as Record<string, unknown>)[key] = next;
      changed.push(key);
    }

    if (changed.length > 0) this.touch();
    return changed;
  }
}
```

- [ ] **Step 6: Porta, erro e usecases**

`packages/domain/src/catalog/ports/ICourseRepository.ts`:

```ts
import type { Course } from "../Course.js";

/**
 * No delete: a course leaves the catalog through RetireCatalogEntryUseCase
 * (deleted_at), never physically (CLAUDE.md §6). `findById` answers retired
 * rows too — the caller decides whether a retired course is acceptable.
 */
export interface ICourseRepository {
  create(course: Course): Promise<Course>;
  findById(id: string): Promise<Course | null>;
  update(course: Course): Promise<Course>;
}
```

Acrescentar em `packages/domain/src/catalog/errors.ts`:

```ts
export class CourseNotFoundError extends NotFoundError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({ reason: "catalog.course_not_found", message: "No live course with that id.", ...params });
  }
}
```

`packages/domain/src/catalog/CreateCourseUseCase.ts`:

```ts
import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import type { IAuditLogRepository } from "../identity/ports/IAuditLogRepository.js";
import { Course, type CreateCourseDTO } from "./Course.js";
import type { ICourseRepository } from "./ports/ICourseRepository.js";

export interface CreateCourseInput {
  actorId: string;
  course: CreateCourseDTO;
}

/**
 * Opens a course (OOC-36). It is on the shelf the moment this returns: the
 * class group form reads live courses, so the next screen can open a class
 * group on it — that is the whole acceptance criterion.
 */
export class CreateCourseUseCase extends BaseUseCase<CreateCourseInput, Course> {
  constructor(
    private readonly courses: ICourseRepository,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: CreateCourseInput): Promise<Course> {
    const created = await this.courses.create(Course.create(input.course));

    await this.auditLog.append({
      actorId: input.actorId,
      action: "catalog.course.created",
      targetId: created.id,
      metadata: { name: created.name, language: created.language },
      at: created.createdAt,
    });

    return created;
  }
}
```

`packages/domain/src/catalog/UpdateCourseUseCase.ts`:

```ts
import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import type { IAuditLogRepository } from "../identity/ports/IAuditLogRepository.js";
import type { Course, UpdateCourseDTO } from "./Course.js";
import { CourseNotFoundError } from "./errors.js";
import type { ICourseRepository } from "./ports/ICourseRepository.js";

export interface UpdateCourseInput {
  actorId: string;
  id: string;
  patch: UpdateCourseDTO;
}

/**
 * Changes a course from here on. Class groups already running keep the rule
 * their students enrolled under — the same reasoning that freezes the price
 * at enrollment. Which fields a caller may send is the route's business (two
 * routes, two role sets); this usecase only applies and audits.
 */
export class UpdateCourseUseCase extends BaseUseCase<UpdateCourseInput, Course> {
  constructor(
    private readonly courses: ICourseRepository,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: UpdateCourseInput): Promise<Course> {
    const course = await this.courses.findById(input.id);
    if (!course) throw new CourseNotFoundError();

    const changed = course.update(input.patch);
    if (changed.length === 0) return course;

    const saved = await this.courses.update(course);

    await this.auditLog.append({
      actorId: input.actorId,
      action: "catalog.course.updated",
      targetId: course.id,
      metadata: { fields: changed },
      at: saved.updatedAt,
    });

    return saved;
  }
}
```

Exportar tudo em `packages/domain/src/index.ts`, no bloco de catálogo:

```ts
export {
  Course,
  CertificateRuleSchema,
  CourseOptionsSchema,
  CreateCourseSchema,
  UpdateCourseSchema,
  type CertificateRule,
  type CourseProps,
  type CreateCourseDTO,
  type UpdateCourseDTO,
} from "./catalog/Course.js";
export type { ICourseRepository } from "./catalog/ports/ICourseRepository.js";
export { CreateCourseUseCase, type CreateCourseInput } from "./catalog/CreateCourseUseCase.js";
export { UpdateCourseUseCase, type UpdateCourseInput } from "./catalog/UpdateCourseUseCase.js";
```

e trocar a linha `export { CatalogEntryNotFoundError } from "./catalog/errors.js";` por `export { CatalogEntryNotFoundError, CourseNotFoundError } from "./catalog/errors.js";` (as tasks seguintes vão estendendo essa lista).

- [ ] **Step 7: Rodar e ver passar**

Run: `pnpm --filter @ooc/api test -- catalog-course && pnpm typecheck:domain`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/domain apps/api/src/tests/catalog-course.test.ts apps/api/src/tests/fakes/catalog.ts
git commit -m "feat(domain): add the course entity with create and update usecases"
```

---

### Task 3: Domínio — `Plan`, `PlanPrice`, `CreatePlan`, `RenamePlan`, `SchedulePlanPrice`

**Files:**
- Create: `packages/domain/src/catalog/Plan.ts`
- Create: `packages/domain/src/catalog/ports/IPlanRepository.ts`
- Create: `packages/domain/src/catalog/CreatePlanUseCase.ts`
- Create: `packages/domain/src/catalog/RenamePlanUseCase.ts`
- Create: `packages/domain/src/catalog/SchedulePlanPriceUseCase.ts`
- Modify: `packages/domain/src/catalog/errors.ts`, `packages/domain/src/index.ts`
- Modify: `apps/api/src/tests/fakes/catalog.ts` (+ `FakePlanRepository`)
- Test: `apps/api/src/tests/catalog-plan.test.ts`

**Interfaces:**
- Consumes: `Course`, `ICourseRepository`, `CourseNotFoundError`, fakes da Task 2.
- Produces:
  - `class Plan extends SoftDeletableModel { courseId: string; name: string; static create({courseId, name}); rename(name): boolean }`
  - `class PlanPrice extends BaseModel { planId: string; amountCents: number; validFrom: Date; static schedule({ planId, amountCents, validFrom? }, now = new Date()): PlanPrice }`
  - `PRICE_PAST_TOLERANCE_MS = 60_000`
  - `interface IPlanRepository { createWithPrice(plan: Plan, price: PlanPrice): Promise<void>; findById(id: string): Promise<Plan | null>; rename(plan: Plan): Promise<void>; addPrice(price: PlanPrice): Promise<void> }`
  - `PlanNotFoundError` (`catalog.plan_not_found`, 404), `PriceInPastError` (`catalog.price_in_past`, 422)
  - `CreatePlanUseCase.run({ actorId, courseId, name, amountCents, validFrom?: Date }): Promise<{ plan: Plan; price: PlanPrice }>`
  - `RenamePlanUseCase.run({ actorId, id, name }): Promise<Plan>`
  - `SchedulePlanPriceUseCase.run({ actorId, planId, amountCents, validFrom?: Date }): Promise<PlanPrice>`

- [ ] **Step 1: Fake de plano**

Acrescentar em `apps/api/src/tests/fakes/catalog.ts`:

```ts
import type { IPlanRepository, Plan, PlanPrice } from "@ooc/domain";

export class FakePlanRepository implements IPlanRepository {
  public readonly plans = new Map<string, Plan>();
  public readonly prices: PlanPrice[] = [];

  async createWithPrice(plan: Plan, price: PlanPrice): Promise<void> {
    this.plans.set(plan.id, plan);
    this.prices.push(price);
  }

  async findById(id: string): Promise<Plan | null> {
    return this.plans.get(id) ?? null;
  }

  async rename(plan: Plan): Promise<void> {
    this.plans.set(plan.id, plan);
  }

  async addPrice(price: PlanPrice): Promise<void> {
    this.prices.push(price);
  }
}
```

(juntar os imports de tipo no topo do arquivo, num só `import type`.)

- [ ] **Step 2: Teste que falha**

`apps/api/src/tests/catalog-plan.test.ts`:

```ts
import {
  Course,
  CourseNotFoundError,
  CreatePlanUseCase,
  Plan,
  PlanNotFoundError,
  PlanPrice,
  PriceInPastError,
  RenamePlanUseCase,
  SchedulePlanPriceUseCase,
} from "@ooc/domain";
import { beforeEach, describe, expect, it } from "vitest";
import { FakeAuditLogRepository, FakeCourseRepository, FakePlanRepository } from "./fakes/catalog.js";

/**
 * Plans and their versioned prices (CLAUDE.md §1 "sem descontos", apps/api
 * CLAUDE.md "preço é versionado, nunca editado"). A new price is always a new
 * row; a price may start now or later, never earlier.
 */

const ACTOR = "usr_admin";
const DAY = 24 * 60 * 60 * 1000;

let courses: FakeCourseRepository;
let plans: FakePlanRepository;
let auditLog: FakeAuditLogRepository;
let course: Course;

beforeEach(async () => {
  courses = new FakeCourseRepository();
  plans = new FakePlanRepository();
  auditLog = new FakeAuditLogRepository();
  course = await courses.create(
    Course.create({
      name: "Francés",
      language: "Francés",
      level: "A1",
      summary: "Francés para principiantes.",
      minAge: 13,
      modules: 4,
      totalHours: 80,
      certificateRule: "automatic",
      allowsFreeze: true,
      allowsTransfer: false,
    }),
  );
});

describe("PlanPrice.schedule", () => {
  it("defaults validFrom to now", () => {
    const now = new Date("2026-10-01T12:00:00Z");
    expect(PlanPrice.schedule({ planId: "p", amountCents: 8000 }, now).validFrom).toEqual(now);
  });

  it("accepts a future date", () => {
    const now = new Date("2026-10-01T12:00:00Z");
    const later = new Date(now.getTime() + 30 * DAY);
    expect(PlanPrice.schedule({ planId: "p", amountCents: 8000, validFrom: later }, now).validFrom).toEqual(later);
  });

  it("tolerates a few seconds of clock skew", () => {
    const now = new Date("2026-10-01T12:00:00Z");
    const skewed = new Date(now.getTime() - 5_000);
    expect(() => PlanPrice.schedule({ planId: "p", amountCents: 8000, validFrom: skewed }, now)).not.toThrow();
  });

  it("refuses a date in the past", () => {
    const now = new Date("2026-10-01T12:00:00Z");
    expect(() =>
      PlanPrice.schedule({ planId: "p", amountCents: 8000, validFrom: new Date(now.getTime() - DAY) }, now),
    ).toThrow(PriceInPastError);
  });

  it("refuses a non-positive or fractional amount", () => {
    expect(() => PlanPrice.schedule({ planId: "p", amountCents: 0 })).toThrow();
    expect(() => PlanPrice.schedule({ planId: "p", amountCents: 10.5 })).toThrow();
  });
});

describe("CreatePlanUseCase", () => {
  it("creates the plan with its first price and audits it", async () => {
    const result = await new CreatePlanUseCase(courses, plans, auditLog).run({
      actorId: ACTOR,
      courseId: course.id,
      name: "Paquete completo",
      amountCents: 8000,
    });

    expect(result.plan.courseId).toBe(course.id);
    expect(plans.prices).toEqual([result.price]);
    expect(auditLog.appended.map((entry) => entry.action)).toEqual(["catalog.plan.created"]);
  });

  it("refuses a retired course", async () => {
    course.softDelete();
    await expect(
      new CreatePlanUseCase(courses, plans, auditLog).run({ actorId: ACTOR, courseId: course.id, name: "X", amountCents: 100 }),
    ).rejects.toBeInstanceOf(CourseNotFoundError);
  });
});

describe("SchedulePlanPriceUseCase", () => {
  it("adds a new price row and never touches the old one", async () => {
    const { plan, price: first } = await new CreatePlanUseCase(courses, plans, auditLog).run({
      actorId: ACTOR,
      courseId: course.id,
      name: "Paquete completo",
      amountCents: 8000,
    });

    const next = await new SchedulePlanPriceUseCase(plans, auditLog).run({
      actorId: ACTOR,
      planId: plan.id,
      amountCents: 9000,
      validFrom: new Date(Date.now() + 7 * DAY),
    });

    expect(plans.prices).toEqual([first, next]);
    expect(first.amountCents).toBe(8000);
    expect(auditLog.appended.at(-1)).toEqual(
      expect.objectContaining({ action: "catalog.plan_price.scheduled", targetId: plan.id }),
    );
  });

  it("answers 404 for a retired plan", async () => {
    const plan = Plan.create({ courseId: course.id, name: "Viejo" });
    plan.softDelete();
    plans.plans.set(plan.id, plan);

    await expect(
      new SchedulePlanPriceUseCase(plans, auditLog).run({ actorId: ACTOR, planId: plan.id, amountCents: 100 }),
    ).rejects.toBeInstanceOf(PlanNotFoundError);
  });
});

describe("RenamePlanUseCase", () => {
  it("renames and audits; a same-name rename writes nothing", async () => {
    const plan = Plan.create({ courseId: course.id, name: "Mensual" });
    plans.plans.set(plan.id, plan);
    const rename = new RenamePlanUseCase(plans, auditLog);

    await rename.run({ actorId: ACTOR, id: plan.id, name: "Mensual" });
    expect(auditLog.appended).toEqual([]);

    await rename.run({ actorId: ACTOR, id: plan.id, name: "Mensualidad" });
    expect(plans.plans.get(plan.id)?.name).toBe("Mensualidad");
    expect(auditLog.appended.map((entry) => entry.action)).toEqual(["catalog.plan.renamed"]);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm --filter @ooc/api test -- catalog-plan`
Expected: FAIL — exports inexistentes.

- [ ] **Step 4: Entidades**

`packages/domain/src/catalog/Plan.ts`:

```ts
import { v7 as uuid } from "uuid";
import { z } from "zod";
import { BaseModel, BaseModelPropsSchema } from "../shared/base/BaseModel.js";
import { SoftDeletableModel, SoftDeletableModelPropsSchema } from "../shared/base/SoftDeletableModel.js";
import { PriceInPastError } from "./errors.js";

/**
 * How far behind "now" a price may claim to start and still count as now: the
 * screen sends its own clock, and a form submitted a few seconds after it was
 * rendered must not be refused as "in the past".
 */
export const PRICE_PAST_TOLERANCE_MS = 60_000;

export const PlanPropsSchema = SoftDeletableModelPropsSchema.extend({
  courseId: z.string().uuid(),
  name: z.string().trim().min(1),
});

export type PlanProps = z.infer<typeof PlanPropsSchema>;

/** A way of buying a course ("Paquete completo", "Mensual"). Price lives apart. */
export class Plan extends SoftDeletableModel {
  public readonly courseId: string;
  public name: string;

  constructor(props: PlanProps) {
    super(props);
    this.courseId = props.courseId;
    this.name = props.name;
  }

  static create(dto: { courseId: string; name: string }): Plan {
    return new Plan(PlanPropsSchema.parse({ ...dto, id: uuid() }));
  }

  /** Answers whether the name actually changed. */
  rename(name: string): boolean {
    const next = PlanPropsSchema.shape.name.parse(name);
    if (next === this.name) return false;
    this.name = next;
    this.touch();
    return true;
  }
}

export const PlanPricePropsSchema = BaseModelPropsSchema.extend({
  planId: z.string().min(1),
  amountCents: z.number().int().positive(),
  validFrom: z.coerce.date(),
});

export type PlanPriceProps = z.infer<typeof PlanPricePropsSchema>;

/**
 * One version of a plan's price. Append-only — no setter, no update: a new
 * price is a new row, and migration 0017 makes Postgres refuse the rest. The
 * price in force on a date is the greatest validFrom not after it.
 */
export class PlanPrice extends BaseModel {
  public readonly planId: string;
  public readonly amountCents: number;
  public readonly validFrom: Date;

  constructor(props: PlanPriceProps) {
    super(props);
    this.planId = props.planId;
    this.amountCents = props.amountCents;
    this.validFrom = props.validFrom;
  }

  static schedule(
    dto: { planId: string; amountCents: number; validFrom?: Date },
    now: Date = new Date(),
  ): PlanPrice {
    const validFrom = dto.validFrom ?? now;

    // Backdating a price would reprice enrollments that already froze the old
    // one in every report that asks "what did this cost on date X".
    if (validFrom.getTime() < now.getTime() - PRICE_PAST_TOLERANCE_MS) {
      throw new PriceInPastError();
    }

    return new PlanPrice(PlanPricePropsSchema.parse({ ...dto, validFrom, id: uuid() }));
  }
}
```

Erros em `packages/domain/src/catalog/errors.ts` (importar `UnableToProcessEntryError`):

```ts
export class PlanNotFoundError extends NotFoundError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({ reason: "catalog.plan_not_found", message: "No live plan with that id.", ...params });
  }
}

export class PriceInPastError extends UnableToProcessEntryError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({ reason: "catalog.price_in_past", message: "A price cannot start in the past.", ...params });
  }
}
```

- [ ] **Step 5: Porta e usecases**

`packages/domain/src/catalog/ports/IPlanRepository.ts`:

```ts
import type { Plan, PlanPrice } from "../Plan.js";

/**
 * There is no `updatePrice` and never will be (CLAUDE.md §5). `createWithPrice`
 * is one operation because a plan without a price cannot be sold and must not
 * exist half-written. `findById` answers retired plans too.
 */
export interface IPlanRepository {
  createWithPrice(plan: Plan, price: PlanPrice): Promise<void>;
  findById(id: string): Promise<Plan | null>;
  rename(plan: Plan): Promise<void>;
  addPrice(price: PlanPrice): Promise<void>;
}
```

`packages/domain/src/catalog/CreatePlanUseCase.ts`:

```ts
import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import type { IAuditLogRepository } from "../identity/ports/IAuditLogRepository.js";
import { CourseNotFoundError } from "./errors.js";
import { Plan, PlanPrice } from "./Plan.js";
import type { ICourseRepository } from "./ports/ICourseRepository.js";
import type { IPlanRepository } from "./ports/IPlanRepository.js";

export interface CreatePlanInput {
  actorId: string;
  courseId: string;
  name: string;
  amountCents: number;
  validFrom?: Date;
}

/** A plan is born with its first price — there is no sellable plan without one. */
export class CreatePlanUseCase extends BaseUseCase<CreatePlanInput, { plan: Plan; price: PlanPrice }> {
  constructor(
    private readonly courses: ICourseRepository,
    private readonly plans: IPlanRepository,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: CreatePlanInput): Promise<{ plan: Plan; price: PlanPrice }> {
    const course = await this.courses.findById(input.courseId);
    if (!course || course.isDeleted) throw new CourseNotFoundError();

    const plan = Plan.create({ courseId: course.id, name: input.name });
    const price = PlanPrice.schedule({ planId: plan.id, amountCents: input.amountCents, validFrom: input.validFrom });

    await this.plans.createWithPrice(plan, price);

    await this.auditLog.append({
      actorId: input.actorId,
      action: "catalog.plan.created",
      targetId: plan.id,
      metadata: { courseId: course.id, amountCents: price.amountCents, validFrom: price.validFrom.toISOString() },
      at: plan.createdAt,
    });

    return { plan, price };
  }
}
```

`packages/domain/src/catalog/RenamePlanUseCase.ts`:

```ts
import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import type { IAuditLogRepository } from "../identity/ports/IAuditLogRepository.js";
import { PlanNotFoundError } from "./errors.js";
import type { Plan } from "./Plan.js";
import type { IPlanRepository } from "./ports/IPlanRepository.js";

export interface RenamePlanInput {
  actorId: string;
  id: string;
  name: string;
}

export class RenamePlanUseCase extends BaseUseCase<RenamePlanInput, Plan> {
  constructor(
    private readonly plans: IPlanRepository,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: RenamePlanInput): Promise<Plan> {
    const plan = await this.plans.findById(input.id);
    if (!plan) throw new PlanNotFoundError();

    const previous = plan.name;
    if (!plan.rename(input.name)) return plan;

    await this.plans.rename(plan);
    await this.auditLog.append({
      actorId: input.actorId,
      action: "catalog.plan.renamed",
      targetId: plan.id,
      metadata: { from: previous, to: plan.name },
      at: plan.updatedAt,
    });

    return plan;
  }
}
```

`packages/domain/src/catalog/SchedulePlanPriceUseCase.ts`:

```ts
import { BaseUseCase } from "../shared/base/BaseUseCase.js";
import type { IAuditLogRepository } from "../identity/ports/IAuditLogRepository.js";
import { PlanNotFoundError } from "./errors.js";
import { PlanPrice } from "./Plan.js";
import type { IPlanRepository } from "./ports/IPlanRepository.js";

export interface SchedulePlanPriceInput {
  actorId: string;
  planId: string;
  amountCents: number;
  validFrom?: Date;
}

/**
 * Puts a new price in force, now or on a future date. The old price keeps
 * answering until then, and keeps answering for every enrollment that froze
 * it. Correcting a wrong price is scheduling another one — never an edit.
 */
export class SchedulePlanPriceUseCase extends BaseUseCase<SchedulePlanPriceInput, PlanPrice> {
  constructor(
    private readonly plans: IPlanRepository,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: SchedulePlanPriceInput): Promise<PlanPrice> {
    const plan = await this.plans.findById(input.planId);
    if (!plan || plan.isDeleted) throw new PlanNotFoundError();

    const price = PlanPrice.schedule({ planId: plan.id, amountCents: input.amountCents, validFrom: input.validFrom });
    await this.plans.addPrice(price);

    await this.auditLog.append({
      actorId: input.actorId,
      action: "catalog.plan_price.scheduled",
      targetId: plan.id,
      metadata: { priceId: price.id, amountCents: price.amountCents, validFrom: price.validFrom.toISOString() },
      at: price.createdAt,
    });

    return price;
  }
}
```

Exports em `index.ts`:

```ts
export { Plan, PlanPrice, PRICE_PAST_TOLERANCE_MS, type PlanProps, type PlanPriceProps } from "./catalog/Plan.js";
export type { IPlanRepository } from "./catalog/ports/IPlanRepository.js";
export { CreatePlanUseCase, type CreatePlanInput } from "./catalog/CreatePlanUseCase.js";
export { RenamePlanUseCase, type RenamePlanInput } from "./catalog/RenamePlanUseCase.js";
export { SchedulePlanPriceUseCase, type SchedulePlanPriceInput } from "./catalog/SchedulePlanPriceUseCase.js";
```

e acrescentar `PlanNotFoundError, PriceInPastError` ao export de `./catalog/errors.js`.

- [ ] **Step 6: Rodar e ver passar**

Run: `pnpm --filter @ooc/api test -- catalog-plan && pnpm typecheck:domain`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/domain apps/api/src/tests
git commit -m "feat(domain): add plans with versioned, never-backdated prices"
```

---

### Task 4: Infra — repositórios e queries de curso/plano

**Files:**
- Create: `apps/api/src/infra/persistence/catalog/DrizzleCourseRepository.ts`
- Create: `apps/api/src/infra/persistence/catalog/DrizzlePlanRepository.ts`
- Create: `apps/api/src/infra/persistence/catalog/ListCoursesQuery.ts`
- Create: `apps/api/src/infra/persistence/catalog/GetCourseQuery.ts`
- Test: `apps/api/src/infra/persistence/catalog/CourseCatalog.integration.test.ts`

**Interfaces:**
- Consumes: `Course`, `Plan`, `PlanPrice`, portas da Task 2/3.
- Produces:
  - `DrizzleCourseRepository implements ICourseRepository`
  - `DrizzlePlanRepository implements IPlanRepository`
  - `ListCoursesQuery.run(): Promise<CourseListItem[]>` com `CourseListItem = { id; name; language; level; summary; minAge; modules; totalHours; certificateRule: "automatic" | "exam_required"; allowsFreeze; allowsTransfer; active: boolean; classGroupCount: number }`
  - `GetCourseQuery.run(id): Promise<CourseDetail | null>` com `CourseDetail = { course: CourseListItem; plans: PlanDetail[] }`, `PlanDetail = { id; name; active: boolean; currentPriceId: string | null; prices: { id; amountCents; validFrom: string; createdAt: string }[] }` (preços em ordem `validFrom` desc)

- [ ] **Step 1: Teste de integração que falha**

`apps/api/src/infra/persistence/catalog/CourseCatalog.integration.test.ts` — mesmo esqueleto de `DrizzleCatalogEntryRepository.integration.test.ts` (pool `max: 1`, `begin`/`rollback`, throw sem `DATABASE_URL`):

```ts
import * as schema from "@ooc/db";
import { academicPeriods, classGroups } from "@ooc/db";
import { Course, Plan, PlanPrice } from "@ooc/domain";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/infra/db/client.js";
import { DrizzleCourseRepository } from "./DrizzleCourseRepository.js";
import { DrizzlePlanRepository } from "./DrizzlePlanRepository.js";
import { GetCourseQuery } from "./GetCourseQuery.js";
import { ListCoursesQuery } from "./ListCoursesQuery.js";

/**
 * The OOC-36 acceptance criterion at the storage layer: a course written
 * through the repository is listed live right away and a class group can hang
 * off it. Plus the price history read — ordering and "which one is current"
 * are SQL the typecheck cannot vouch for.
 */

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required: this suite exercises the course catalog against a real, migrated Postgres.");
}

const DAY = 24 * 60 * 60 * 1000;
let pool: pg.Pool;
let db: Db;

beforeAll(() => {
  pool = new Pool({ connectionString: DATABASE_URL, max: 1 });
  db = drizzle(pool, { schema, casing: "snake_case" });
});
afterAll(async () => {
  await pool.end();
});
beforeEach(async () => {
  await pool.query("begin");
});
afterEach(async () => {
  await pool.query("rollback");
});

function aCourse(): Course {
  return Course.create({
    name: "Italiano (integration)",
    language: "Italiano",
    level: "A1",
    summary: "Italiano para principiantes.",
    minAge: 13,
    modules: 6,
    totalHours: 60,
    certificateRule: "exam_required",
    allowsFreeze: false,
    allowsTransfer: true,
  });
}

describe("course catalog storage", () => {
  it("round-trips every course column", async () => {
    const repository = new DrizzleCourseRepository(db);
    const created = await repository.create(aCourse());
    const read = await repository.findById(created.id);

    expect(read).toMatchObject({
      name: "Italiano (integration)",
      certificateRule: "exam_required",
      allowsFreeze: false,
      allowsTransfer: true,
      deletedAt: null,
    });
  });

  it("lists a new course as live, and a class group can be opened on it", async () => {
    const course = await new DrizzleCourseRepository(db).create(aCourse());

    const listed = (await new ListCoursesQuery(db).run()).find((item) => item.id === course.id);
    expect(listed).toMatchObject({ active: true, classGroupCount: 0, language: "Italiano" });

    const [period] = await db
      .insert(academicPeriods)
      .values({ name: "Ciclo (integration)", startsOn: new Date("2026-11-01T05:00:00Z"), endsOn: new Date("2027-02-28T05:00:00Z") })
      .returning();
    await db.insert(classGroups).values({
      courseId: course.id,
      academicPeriodId: period!.id,
      schedule: "",
      startsOn: new Date("2026-11-02T05:00:00Z"),
      endsOn: new Date("2027-01-30T05:00:00Z"),
      capacity: 30,
    });

    const relisted = (await new ListCoursesQuery(db).run()).find((item) => item.id === course.id);
    expect(relisted?.classGroupCount).toBe(1);
  });

  it("keeps price history and names the current price", async () => {
    const course = await new DrizzleCourseRepository(db).create(aCourse());
    const plans = new DrizzlePlanRepository(db);
    const plan = Plan.create({ courseId: course.id, name: "Paquete completo" });
    const first = PlanPrice.schedule({ planId: plan.id, amountCents: 8000 });
    await plans.createWithPrice(plan, first);
    const future = PlanPrice.schedule({ planId: plan.id, amountCents: 9000, validFrom: new Date(Date.now() + 30 * DAY) });
    await plans.addPrice(future);

    const detail = await new GetCourseQuery(db).run(course.id);

    expect(detail?.plans).toHaveLength(1);
    expect(detail?.plans[0]?.prices.map((price) => price.amountCents)).toEqual([9000, 8000]);
    expect(detail?.plans[0]?.currentPriceId).toBe(first.id);
  });

  it("answers null for a course not on file", async () => {
    expect(await new GetCourseQuery(db).run("018f2b5c-1000-7000-8000-0000000000ff")).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @ooc/api test:db -- CourseCatalog`
Expected: FAIL — módulos inexistentes.

- [ ] **Step 3: `DrizzleCourseRepository`**

```ts
import { Course, type CertificateRule, type ICourseRepository } from "@ooc/domain";
import { courses } from "@ooc/db";
import { eq } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";

type CourseRow = typeof courses.$inferSelect;

export function courseFromRow(row: CourseRow): Course {
  return new Course({
    id: row.id,
    name: row.name,
    language: row.language,
    level: row.level,
    summary: row.summary,
    minAge: row.minAge,
    modules: row.modules,
    totalHours: row.totalHours,
    certificateRule: row.certificateRule as CertificateRule,
    allowsFreeze: row.allowsFreeze,
    allowsTransfer: row.allowsTransfer,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  });
}

export class DrizzleCourseRepository implements ICourseRepository {
  constructor(private readonly db: Db) {}

  async create(course: Course): Promise<Course> {
    const [row] = await this.db
      .insert(courses)
      .values({
        id: course.id,
        name: course.name,
        language: course.language,
        level: course.level,
        summary: course.summary,
        minAge: course.minAge,
        modules: course.modules,
        totalHours: course.totalHours,
        certificateRule: course.certificateRule,
        allowsFreeze: course.allowsFreeze,
        allowsTransfer: course.allowsTransfer,
      })
      .returning();
    if (!row) throw new Error("Insert into courses returned no row");
    return courseFromRow(row);
  }

  async findById(id: string): Promise<Course | null> {
    const [row] = await this.db.select().from(courses).where(eq(courses.id, id)).limit(1);
    return row ? courseFromRow(row) : null;
  }

  async update(course: Course): Promise<Course> {
    // deleted_at is not written here: leaving the catalog is
    // RetireCatalogEntryUseCase's job, and an edit must not undo it.
    const [row] = await this.db
      .update(courses)
      .set({
        name: course.name,
        language: course.language,
        level: course.level,
        summary: course.summary,
        minAge: course.minAge,
        modules: course.modules,
        totalHours: course.totalHours,
        certificateRule: course.certificateRule,
        allowsFreeze: course.allowsFreeze,
        allowsTransfer: course.allowsTransfer,
        updatedAt: course.updatedAt,
      })
      .where(eq(courses.id, course.id))
      .returning();
    if (!row) throw new Error("Update of courses matched no row");
    return courseFromRow(row);
  }
}
```

- [ ] **Step 4: `DrizzlePlanRepository`**

```ts
import { Plan, type IPlanRepository, type PlanPrice } from "@ooc/domain";
import { planPrices, plans } from "@ooc/db";
import { eq } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";

export class DrizzlePlanRepository implements IPlanRepository {
  constructor(private readonly db: Db) {}

  async createWithPrice(plan: Plan, price: PlanPrice): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(plans).values({ id: plan.id, courseId: plan.courseId, name: plan.name });
      await tx.insert(planPrices).values({
        id: price.id,
        planId: price.planId,
        amountCents: price.amountCents,
        validFrom: price.validFrom,
      });
    });
  }

  async findById(id: string): Promise<Plan | null> {
    const [row] = await this.db.select().from(plans).where(eq(plans.id, id)).limit(1);
    return row
      ? new Plan({
          id: row.id,
          courseId: row.courseId,
          name: row.name,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          deletedAt: row.deletedAt,
        })
      : null;
  }

  async rename(plan: Plan): Promise<void> {
    await this.db.update(plans).set({ name: plan.name, updatedAt: plan.updatedAt }).where(eq(plans.id, plan.id));
  }

  /** INSERT only — the 0017 trigger refuses anything else on this table. */
  async addPrice(price: PlanPrice): Promise<void> {
    await this.db.insert(planPrices).values({
      id: price.id,
      planId: price.planId,
      amountCents: price.amountCents,
      validFrom: price.validFrom,
    });
  }
}
```

- [ ] **Step 5: `ListCoursesQuery`**

```ts
import { classGroups, courses } from "@ooc/db";
import { asc, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";

export interface CourseListItem {
  id: string;
  name: string;
  language: string;
  level: string;
  summary: string;
  minAge: number;
  modules: number;
  totalHours: number;
  certificateRule: "automatic" | "exam_required";
  allowsFreeze: boolean;
  allowsTransfer: boolean;
  /** Not retired. The backoffice lists both — taking a course off the shelf is reversible. */
  active: boolean;
  /** Class groups opened on it that are not retired themselves. */
  classGroupCount: number;
}

/**
 * The backoffice course catalog — retired courses included, flagged. Read-only
 * shaping, so it lives beside the repository and not in the domain (same as
 * ListStudentsQuery).
 */
export class ListCoursesQuery {
  constructor(private readonly db: Db) {}

  async run(): Promise<CourseListItem[]> {
    const rows = await this.db
      .select({
        row: courses,
        classGroupCount: sql<number>`count(${classGroups.id})`.mapWith(Number),
      })
      .from(courses)
      .leftJoin(classGroups, sql`${classGroups.courseId} = ${courses.id} and ${isNull(classGroups.deletedAt)}`)
      .groupBy(courses.id)
      .orderBy(asc(courses.language), asc(courses.name));

    return rows.map(({ row, classGroupCount }) => toCourseListItem(row, classGroupCount));
  }
}

export function toCourseListItem(row: typeof courses.$inferSelect, classGroupCount: number): CourseListItem {
  return {
    id: row.id,
    name: row.name,
    language: row.language,
    level: row.level,
    summary: row.summary,
    minAge: row.minAge,
    modules: row.modules,
    totalHours: row.totalHours,
    certificateRule: row.certificateRule as CourseListItem["certificateRule"],
    allowsFreeze: row.allowsFreeze,
    allowsTransfer: row.allowsTransfer,
    active: row.deletedAt === null,
    classGroupCount,
  };
}
```

(`eq` pode ficar sem uso — remover do import se o lint reclamar.)

- [ ] **Step 6: `GetCourseQuery`**

```ts
import { classGroups, courses, planPrices, plans } from "@ooc/db";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";
import { toCourseListItem, type CourseListItem } from "./ListCoursesQuery.js";

export interface PlanPriceItem {
  id: string;
  amountCents: number;
  validFrom: string;
  createdAt: string;
}

export interface PlanDetail {
  id: string;
  name: string;
  active: boolean;
  /** The price in force now — greatest validFrom not after now. Null when every price is still scheduled. */
  currentPriceId: string | null;
  /** Newest validFrom first: a scheduled price sits on top of the one in force. */
  prices: PlanPriceItem[];
}

export interface CourseDetail {
  course: CourseListItem;
  plans: PlanDetail[];
}

export class GetCourseQuery {
  constructor(private readonly db: Db) {}

  async run(id: string, now: Date = new Date()): Promise<CourseDetail | null> {
    const [course] = await this.db.select().from(courses).where(eq(courses.id, id)).limit(1);
    if (!course) return null;

    const [count] = await this.db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(classGroups)
      .where(and(eq(classGroups.courseId, id), isNull(classGroups.deletedAt)));

    const planRows = await this.db.select().from(plans).where(eq(plans.courseId, id)).orderBy(asc(plans.createdAt));
    const priceRows =
      planRows.length === 0
        ? []
        : await this.db
            .select()
            .from(planPrices)
            .where(inArray(planPrices.planId, planRows.map((plan) => plan.id)))
            .orderBy(desc(planPrices.validFrom), desc(planPrices.createdAt));

    return {
      course: toCourseListItem(course, count?.value ?? 0),
      plans: planRows.map((plan) => {
        const prices = priceRows.filter((price) => price.planId === plan.id);
        const current = prices.find((price) => price.validFrom.getTime() <= now.getTime());
        return {
          id: plan.id,
          name: plan.name,
          active: plan.deletedAt === null,
          currentPriceId: current?.id ?? null,
          prices: prices.map((price) => ({
            id: price.id,
            amountCents: price.amountCents,
            validFrom: price.validFrom.toISOString(),
            createdAt: price.createdAt.toISOString(),
          })),
        };
      }),
    };
  }
}
```

- [ ] **Step 7: Rodar e ver passar**

Run: `pnpm --filter @ooc/api test:db -- CourseCatalog && pnpm typecheck:api`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/infra/persistence/catalog
git commit -m "feat(api): persist courses and plans, and read the course catalog"
```

---

### Task 5: Rotas de curso/plano/preço + container + teste de autorização

**Files:**
- Create: `apps/api/src/http/catalog/catalogRoles.ts`
- Create: `apps/api/src/http/catalog/CatalogSchemas.ts`
- Create: `apps/api/src/http/catalog/ListCoursesRoute.ts`, `GetCourseRoute.ts`, `CreateCourseRoute.ts`, `UpdateCourseRoute.ts`, `UpdateCourseOptionsRoute.ts`, `CreatePlanRoute.ts`, `RenamePlanRoute.ts`, `SchedulePlanPriceRoute.ts`
- Modify: `apps/api/src/container.ts`, `apps/api/src/app.ts`
- Test: `apps/api/src/tests/catalog-routes-authorization.test.ts`

**Interfaces:**
- Consumes: usecases das Tasks 2-3, queries/repos da Task 4.
- Produces:
  - `CATALOG_READ_ROLES`, `CATALOG_WRITE_ROLES`, `CATALOG_OWNER_ROLES` (readonly tuples de `Role`)
  - `container.repositories.course`, `container.repositories.plan`
  - `container.useCases.catalog.{createCourse, updateCourse, createPlan, renamePlan, schedulePlanPrice}`
  - `container.queries.{listCourses, getCourse}`
  - Rotas: `GET /catalog/courses`, `GET /catalog/courses/:id`, `POST /catalog/courses`, `PATCH /catalog/courses/:id`, `PATCH /catalog/courses/:id/options`, `POST /catalog/courses/:id/plans`, `PATCH /catalog/plans/:id`, `POST /catalog/plans/:id/prices`

- [ ] **Step 1: Teste de autorização que falha**

`apps/api/src/tests/catalog-routes-authorization.test.ts`:

```ts
import type { AuthenticatedUser, Role } from "@ooc/domain";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app.js";
import { container } from "@/container.js";
import { SESSION_COOKIE_NAME } from "@/infra/auth/betterAuth.js";

/**
 * CI gate §6.5 for the catalog: every catalog route answers 403 to a role it
 * did not declare. The handler never runs (the authorization hook answers
 * first), so no database is needed.
 */

const ID = "018f2b5c-0000-7000-8000-000000000001";

/** [method, url, a role that must be refused] */
const CASES: [string, string, Role][] = [
  ["GET", "/api/v1/catalog/courses", "billing"],
  ["GET", "/api/v1/catalog/courses", "teacher"],
  ["GET", `/api/v1/catalog/courses/${ID}`, "billing"],
  ["POST", "/api/v1/catalog/courses", "enrollment_supervisor"],
  ["PATCH", `/api/v1/catalog/courses/${ID}`, "enrollment_supervisor"],
  ["PATCH", `/api/v1/catalog/courses/${ID}/options`, "analyst"],
  ["POST", `/api/v1/catalog/courses/${ID}/plans`, "enrollment_supervisor"],
  ["PATCH", `/api/v1/catalog/plans/${ID}`, "enrollment_supervisor"],
  ["POST", `/api/v1/catalog/plans/${ID}/prices`, "billing"],
];

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
});

describe("catalog routes refuse undeclared roles", () => {
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

Se o `buildApp()` exigir env que o teste unitário não tem, ver como `authorization.test.ts` faz ("the real app boots successfully") — ele já chama `buildApp()` no mesmo runner, então deve funcionar igual. Se a validação de body (400) rodar antes do hook de autorização, trocar `payload: {}` por um body válido mínimo; conferir a ordem no `infra/plugins/authorization.ts` (hook `onRequest` roda antes de `preValidation`, então 403 vem primeiro).

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @ooc/api test -- catalog-routes-authorization`
Expected: FAIL — rotas inexistentes respondem 404.

- [ ] **Step 3: Papéis e schemas compartilhados**

`apps/api/src/http/catalog/catalogRoles.ts`:

```ts
import type { Role } from "@ooc/domain";

/**
 * Who reads the catalog in the backoffice — the same people who read the
 * enrollment ledger (apps/app permissions.ts canBrowseEnrollments). Billing
 * settles money and sees no academic data; a teacher sees their own class
 * groups through a scope this catalog does not have yet (Sessão 36).
 */
export const CATALOG_READ_ROLES = [
  "master",
  "admin",
  "analyst",
  "enrollment_supervisor",
  "academic_supervisor",
  "sales",
  "support",
] as const satisfies readonly Role[];

/** Who opens and runs class groups and periods (CLAUDE.md §1, §8). */
export const CATALOG_WRITE_ROLES = ["master", "admin", "enrollment_supervisor"] as const satisfies readonly Role[];

/** Who opens a course, renames it, and sets money (CLAUDE.md §1 "sem descontos"). */
export const CATALOG_OWNER_ROLES = ["master", "admin"] as const satisfies readonly Role[];
```

`apps/api/src/http/catalog/CatalogSchemas.ts`:

```ts
import { CertificateRuleSchema } from "@ooc/domain";
import { z } from "zod";

export const IdParamsSchema = z.object({ id: z.string().uuid() });

/** Every catalog write answers the id it touched; the screen re-reads. */
export const IdResponseSchema = z.object({ id: z.string().uuid() });

export const CourseListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  language: z.string(),
  level: z.string(),
  summary: z.string(),
  minAge: z.number().int(),
  modules: z.number().int(),
  totalHours: z.number().int(),
  certificateRule: CertificateRuleSchema,
  allowsFreeze: z.boolean(),
  allowsTransfer: z.boolean(),
  active: z.boolean(),
  classGroupCount: z.number().int(),
});

export const PlanDetailSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  active: z.boolean(),
  currentPriceId: z.string().uuid().nullable(),
  prices: z.array(
    z.object({
      id: z.string().uuid(),
      amountCents: z.number().int(),
      validFrom: z.string().datetime(),
      createdAt: z.string().datetime(),
    }),
  ),
});

/** A price as the screen sends it — whole cents, and an optional start. */
export const PriceBodySchema = z.object({
  amountCents: z.number().int().positive(),
  validFrom: z.string().datetime({ offset: true }).optional(),
});
```

- [ ] **Step 4: Rotas de leitura**

`ListCoursesRoute.ts`:

```ts
import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { container } from "@/container.js";
import { CATALOG_READ_ROLES } from "./catalogRoles.js";
import { CourseListItemSchema } from "./CatalogSchemas.js";

export const listCoursesRoute = RouteBuilder.get("/catalog/courses")
  .docs({
    tags: ["Catalog"],
    summary: "List courses for the backoffice",
    description: "Every course, retired ones included and flagged, with how many live class groups hang off each.",
  })
  .roles(...CATALOG_READ_ROLES)
  .response(200, z.object({ items: z.array(CourseListItemSchema) }))
  .handler(async (_request, reply) => {
    reply.status(200).send({ items: await container.queries.listCourses.run() });
  });
```

`GetCourseRoute.ts`:

```ts
import { CourseNotFoundError } from "@ooc/domain";
import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";
import { CATALOG_READ_ROLES } from "./catalogRoles.js";
import { CourseListItemSchema, IdParamsSchema, PlanDetailSchema } from "./CatalogSchemas.js";

export const getCourseRoute = RouteBuilder.get("/catalog/courses/:id")
  .docs({ tags: ["Catalog"], summary: "One course with its plans and price history" })
  .roles(...CATALOG_READ_ROLES)
  .params(IdParamsSchema)
  .response(200, z.object({ course: CourseListItemSchema, plans: z.array(PlanDetailSchema) }))
  .response(404, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const detail = await container.queries.getCourse.run(request.params.id);
    if (!detail) throw new CourseNotFoundError();
    reply.status(200).send(detail);
  });
```

- [ ] **Step 5: Rotas de escrita de curso**

`CreateCourseRoute.ts`:

```ts
import { CreateCourseSchema } from "@ooc/domain";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";
import { CATALOG_OWNER_ROLES } from "./catalogRoles.js";
import { IdResponseSchema } from "./CatalogSchemas.js";

/**
 * Opens a course (OOC-36). Management only: the whole catalog, the price
 * table and every future class group hang off it.
 * No rate limit yet (docs/ROADMAP.md Sessão 25).
 */
export const createCourseRoute = RouteBuilder.post("/catalog/courses")
  .docs({ tags: ["Catalog"], summary: "Create a course" })
  .roles(...CATALOG_OWNER_ROLES)
  .body(CreateCourseSchema)
  .response(201, IdResponseSchema)
  .response(400, ErrorResponseSchema)
  .response(403, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const course = await container.useCases.catalog.createCourse.run({
      actorId: request.currentUser!.id,
      course: request.body,
    });
    reply.status(201).send({ id: course.id });
  });
```

`UpdateCourseRoute.ts` (identidade + opções — só gestão):

```ts
import { UpdateCourseSchema } from "@ooc/domain";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";
import { CATALOG_OWNER_ROLES } from "./catalogRoles.js";
import { IdParamsSchema, IdResponseSchema } from "./CatalogSchemas.js";

/**
 * Renaming or re-identifying a course rewrites what students enrolled in, so
 * it belongs to whoever may create one. Coordination's day-to-day changes go
 * through PATCH /catalog/courses/:id/options.
 * No rate limit yet (docs/ROADMAP.md Sessão 25).
 */
export const updateCourseRoute = RouteBuilder.patch("/catalog/courses/:id")
  .docs({ tags: ["Catalog"], summary: "Edit a course (identity and options)" })
  .roles(...CATALOG_OWNER_ROLES)
  .params(IdParamsSchema)
  .body(UpdateCourseSchema.refine((patch) => Object.keys(patch).length > 0))
  .response(200, IdResponseSchema)
  .response(400, ErrorResponseSchema)
  .response(404, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const course = await container.useCases.catalog.updateCourse.run({
      actorId: request.currentUser!.id,
      id: request.params.id,
      patch: request.body,
    });
    reply.status(200).send({ id: course.id });
  });
```

`UpdateCourseOptionsRoute.ts`: igual ao anterior, com URL `/catalog/courses/:id/options`, `.roles(...CATALOG_WRITE_ROLES)`, body `CourseOptionsSchema.partial().refine((patch) => Object.keys(patch).length > 0)` (importar `CourseOptionsSchema` de `@ooc/domain`), summary `"Change a course's options"`, comentário: `/** Coordination's day-to-day: age, load, certificate rule, procedures. Applies to class groups opened afterwards. No rate limit yet (docs/ROADMAP.md Sessão 25). */`, export `updateCourseOptionsRoute`.

- [ ] **Step 6: Rotas de plano e preço**

`CreatePlanRoute.ts`:

```ts
import { z } from "zod";
import { RouteBuilder } from "@/shared/http/RouteBuilder.js";
import { ErrorResponseSchema } from "@/shared/http/ErrorResponseSchema.js";
import { container } from "@/container.js";
import { CATALOG_OWNER_ROLES } from "./catalogRoles.js";
import { IdParamsSchema, PriceBodySchema } from "./CatalogSchemas.js";

/** A plan is born with its first price. No rate limit yet (docs/ROADMAP.md Sessão 25). */
export const createPlanRoute = RouteBuilder.post("/catalog/courses/:id/plans")
  .docs({ tags: ["Catalog"], summary: "Create a plan with its first price" })
  .roles(...CATALOG_OWNER_ROLES)
  .params(IdParamsSchema)
  .body(PriceBodySchema.extend({ name: z.string().trim().min(1) }))
  .response(201, z.object({ id: z.string().uuid(), priceId: z.string().uuid() }))
  .response(404, ErrorResponseSchema)
  .response(422, ErrorResponseSchema)
  .handler(async (request, reply) => {
    const { plan, price } = await container.useCases.catalog.createPlan.run({
      actorId: request.currentUser!.id,
      courseId: request.params.id,
      name: request.body.name,
      amountCents: request.body.amountCents,
      validFrom: request.body.validFrom ? new Date(request.body.validFrom) : undefined,
    });
    reply.status(201).send({ id: plan.id, priceId: price.id });
  });
```

`RenamePlanRoute.ts`: `RouteBuilder.patch("/catalog/plans/:id")`, `.roles(...CATALOG_OWNER_ROLES)`, body `z.object({ name: z.string().trim().min(1) })`, chama `container.useCases.catalog.renamePlan.run({ actorId, id, name })`, responde `200 { id }`; respostas 404. Export `renamePlanRoute`.

`SchedulePlanPriceRoute.ts`: `RouteBuilder.post("/catalog/plans/:id/prices")`, `.roles(...CATALOG_OWNER_ROLES)`, body `PriceBodySchema`, chama `container.useCases.catalog.schedulePlanPrice.run({ actorId, planId: request.params.id, amountCents, validFrom })`, responde `201 { id: price.id }`; respostas 404/422. Comentário: `/** A new price is always a new row — correcting a price is scheduling another one (CLAUDE.md §5). No rate limit yet (docs/ROADMAP.md Sessão 25). */` Export `schedulePlanPriceRoute`.

- [ ] **Step 7: Container**

Em `apps/api/src/container.ts`:
- Importar `CreateCourseUseCase, UpdateCourseUseCase, CreatePlanUseCase, RenamePlanUseCase, SchedulePlanPriceUseCase, type ICourseRepository, type IPlanRepository` de `@ooc/domain`, e os quatro módulos da Task 4.
- `AppRepositories`: `course: ICourseRepository; plan: IPlanRepository;`
- `AppUseCases.catalog`: `createCourse: CreateCourseUseCase; updateCourse: UpdateCourseUseCase; createPlan: CreatePlanUseCase; renamePlan: RenamePlanUseCase; schedulePlanPrice: SchedulePlanPriceUseCase;`
- `AppQueries`: `listCourses: ListCoursesQuery; getCourse: GetCourseQuery;`
- Construção, perto da linha 228/282:

```ts
  const courseRepository = new DrizzleCourseRepository(db);
  const planRepository = new DrizzlePlanRepository(db);
  const createCourse = new CreateCourseUseCase(courseRepository, auditLogRepository);
  const updateCourse = new UpdateCourseUseCase(courseRepository, auditLogRepository);
  const createPlan = new CreatePlanUseCase(courseRepository, planRepository, auditLogRepository);
  const renamePlan = new RenamePlanUseCase(planRepository, auditLogRepository);
  const schedulePlanPrice = new SchedulePlanPriceUseCase(planRepository, auditLogRepository);
  const listCourses = new ListCoursesQuery(db);
  const getCourse = new GetCourseQuery(db);
```

- e plugar cada um no objeto final (`repositories`, `useCases.catalog`, `queries`).

- [ ] **Step 8: Registrar no `app.ts`**

Importar as oito rotas e acrescentar, logo depois de `restoreCatalogEntryRoute`:

```ts
        instance.withTypeProvider<ZodTypeProvider>().route(listCoursesRoute);
        instance.withTypeProvider<ZodTypeProvider>().route(getCourseRoute);
        instance.withTypeProvider<ZodTypeProvider>().route(createCourseRoute);
        instance.withTypeProvider<ZodTypeProvider>().route(updateCourseRoute);
        instance.withTypeProvider<ZodTypeProvider>().route(updateCourseOptionsRoute);
        instance.withTypeProvider<ZodTypeProvider>().route(createPlanRoute);
        instance.withTypeProvider<ZodTypeProvider>().route(renamePlanRoute);
        instance.withTypeProvider<ZodTypeProvider>().route(schedulePlanPriceRoute);
```

- [ ] **Step 9: Rodar e ver passar**

Run: `pnpm --filter @ooc/api test && pnpm typecheck:api && pnpm --filter @ooc/api lint`
Expected: PASS (inclui `authorization.test.ts` "the real app boots successfully").

- [ ] **Step 10: Commit**

```bash
git add apps/api/src
git commit -m "feat(api): expose course, plan and price routes under /catalog"
```

---

### Task 6: Backoffice — cursos reais (lista, criar, opções, sair/voltar do catálogo)

**Files:**
- Create: `apps/app/src/lib/backoffice/catalog.ts` (leitura server-side)
- Create: `apps/app/src/lib/backoffice/catalog-client.ts` (escrita client-side)
- Create: `apps/app/src/lib/backoffice/lima-date.ts`
- Modify: `apps/app/src/lib/backoffice/types.ts` (tipos `CatalogErrorKey`, `PlanDetail`, `CourseDetail`)
- Modify: `apps/app/src/app/[locale]/backoffice/(panel)/(gated)/courses/page.tsx`
- Modify: `.../courses/courses-view.tsx`, `.../courses/new-course-form.tsx`, `.../courses/course-options-sheet.tsx`
- Modify: `apps/app/src/messages/backoffice/{es-PE,pt-BR,en}.json`
- Modify: `apps/app/src/lib/backoffice/permissions.ts` (`canBrowseCatalog`, `canManagePrices`)

**Interfaces:**
- Consumes: rotas da Task 5.
- Produces:
  - `listCatalogCourses(): Promise<CourseRow[] | null>`; `getCatalogCourse(id): Promise<CourseDetail | null>` em `lib/backoffice/catalog.ts`
  - `catalogWrite<T = { id: string }>(path: string, method: 'POST' | 'PATCH', body?: unknown): Promise<CatalogWriteResult<T>>` com `CatalogWriteResult<T> = { ok: true; data: T } | { ok: false; error: CatalogErrorKey }` em `lib/backoffice/catalog-client.ts`
  - `catalogErrorKey(reason: string | undefined): CatalogErrorKey`
  - `limaDateToIso(date: 'YYYY-MM-DD'): string`, `limaDateTimeToIso(value: 'YYYY-MM-DDTHH:mm'): string`, `isoToLimaDate(iso): string`, `isoToLimaDateTime(iso): string`
  - `canBrowseCatalog(role)`, `canManagePrices(role)`

- [ ] **Step 1: Tipos de UI**

Em `apps/app/src/lib/backoffice/types.ts`, depois de `CourseOptions`:

```ts
/**
 * Every `reason` a catalog write can answer, as the locale knows it
 * (`bo.catalog_errors.*`). Anything else falls back to `generic` — a code the
 * screen does not know never reaches the reader (CLAUDE.md §4).
 */
export type CatalogErrorKey =
  | 'generic'
  | 'course_not_found'
  | 'plan_not_found'
  | 'price_in_past'
  | 'period_not_found'
  | 'class_group_not_found'
  | 'invalid_date_range'
  | 'invalid_status_transition'
  | 'class_group_incomplete'
  | 'capacity_below_seats_taken'
  | 'class_group_course_locked'
  | 'period_already_duplicated'
  | 'duplicate_same_period'
  | 'class_group_not_full'
  | 'waitlist_already_joined'
  | 'waitlist_already_enrolled'
  | 'waitlist_student_not_found'
  | 'waitlist_entry_closed'

export interface PlanPriceItem {
  id: string
  amountCents: number
  validFrom: string
  createdAt: string
}

export interface PlanDetail {
  id: string
  name: string
  active: boolean
  currentPriceId: string | null
  prices: PlanPriceItem[]
}

export interface CourseDetail {
  course: CourseRow
  plans: PlanDetail[]
}
```

- [ ] **Step 2: Datas de Lima**

`apps/app/src/lib/backoffice/lima-date.ts`:

```ts
/**
 * A date typed on the panel is a day in Lima. Peru keeps UTC−5 all year (no
 * daylight saving), so the offset is a constant, not a timezone lookup — and
 * the database stores the instant in UTC (CLAUDE.md §6, "timestamptz sempre").
 */
const LIMA_OFFSET = '-05:00'
const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000

/** `2026-11-02` → the instant Lima's 2 Nov begins, as ISO UTC. */
export function limaDateToIso(date: string): string {
  return new Date(`${date}T00:00:00${LIMA_OFFSET}`).toISOString()
}

/** `2026-11-02T18:30` (a datetime-local value) → ISO UTC. */
export function limaDateTimeToIso(value: string): string {
  return new Date(`${value}:00${LIMA_OFFSET}`).toISOString()
}

/** ISO UTC → `YYYY-MM-DD` as Lima reads it — the value a date input wants. */
export function isoToLimaDate(iso: string): string {
  return new Date(new Date(iso).getTime() - LIMA_OFFSET_MS).toISOString().slice(0, 10)
}

/** ISO UTC → `YYYY-MM-DDTHH:mm` as Lima reads it — the value a datetime-local input wants. */
export function isoToLimaDateTime(iso: string): string {
  return new Date(new Date(iso).getTime() - LIMA_OFFSET_MS).toISOString().slice(0, 16)
}
```

- [ ] **Step 3: Leitura server-side**

`apps/app/src/lib/backoffice/catalog.ts`:

```ts
import { apiFetch } from './api-client'
import type { CourseDetail, CourseRow } from './types'

/** The API's course item; `language` is a plain name there (no languages table). */
interface ApiCourse extends Omit<CourseRow, 'language'> {
  language: string
}

/**
 * `courses.language` is catalog text ("Inglés"), not a code — so it is its own
 * id. The screen groups by it and the form offers the ones already in use.
 */
function toCourseRow(course: ApiCourse): CourseRow {
  return { ...course, language: { id: course.language, name: course.language } }
}

/**
 * `null` means the API failed — the page shows an error state, because a
 * silent empty catalog reads as data loss (same contract as listStudents).
 */
export async function listCatalogCourses(): Promise<CourseRow[] | null> {
  try {
    const response = await apiFetch('/api/v1/catalog/courses')
    if (!response.ok) return null
    const body = (await response.json()) as { items: ApiCourse[] }
    return body.items.map(toCourseRow)
  } catch {
    return null
  }
}

export async function getCatalogCourse(id: string): Promise<CourseDetail | null> {
  try {
    const response = await apiFetch(`/api/v1/catalog/courses/${encodeURIComponent(id)}`)
    if (!response.ok) return null
    const body = (await response.json()) as { course: ApiCourse; plans: CourseDetail['plans'] }
    return { course: toCourseRow(body.course), plans: body.plans }
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Escrita client-side**

`apps/app/src/lib/backoffice/catalog-client.ts`:

```ts
import type { CatalogErrorKey } from './types'

export type CatalogWriteResult<T> = { ok: true; data: T } | { ok: false; error: CatalogErrorKey }

const KNOWN: ReadonlySet<CatalogErrorKey> = new Set<CatalogErrorKey>([
  'course_not_found',
  'plan_not_found',
  'price_in_past',
  'period_not_found',
  'class_group_not_found',
  'invalid_date_range',
  'invalid_status_transition',
  'class_group_incomplete',
  'capacity_below_seats_taken',
  'class_group_course_locked',
  'period_already_duplicated',
  'duplicate_same_period',
  'class_group_not_full',
  'waitlist_already_joined',
  'waitlist_already_enrolled',
  'waitlist_student_not_found',
  'waitlist_entry_closed',
])

/** `catalog.price_in_past` → `price_in_past`; anything unknown → `generic`. */
export function catalogErrorKey(reason: string | undefined): CatalogErrorKey {
  const key = reason?.startsWith('catalog.') ? reason.slice('catalog.'.length) : undefined
  return key && KNOWN.has(key as CatalogErrorKey) ? (key as CatalogErrorKey) : 'generic'
}

/**
 * One catalog write through the same-origin proxy. The API answers the
 * project's error envelope `{status, reason}` (docs/ARCHITECTURE.md §5.7);
 * this turns it into a key the locale can say.
 */
export async function catalogWrite<T = { id: string }>(
  path: string,
  method: 'POST' | 'PATCH',
  body?: unknown,
): Promise<CatalogWriteResult<T>> {
  try {
    const response = await fetch(`/api/v1/catalog${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    })
    if (response.ok) return { ok: true, data: (await response.json()) as T }
    const failure = (await response.json().catch(() => null)) as { reason?: string } | null
    return { ok: false, error: catalogErrorKey(failure?.reason) }
  } catch {
    return { ok: false, error: 'generic' }
  }
}
```

- [ ] **Step 5: Permissões**

Em `apps/app/src/lib/backoffice/permissions.ts`, depois de `canConfigureCourse`:

```ts
/**
 * Who reads the catalog (courses, plans, class groups) — mirrors
 * CATALOG_READ_ROLES in apps/api. Billing sees no academic data; a teacher
 * reaches their own class groups through their own screen.
 */
export function canBrowseCatalog(role: StaffRole): boolean {
  return canBrowseEnrollments(role)
}

/** Who opens a plan or puts a new price in force — money, so management only. */
export function canManagePrices(role: StaffRole): boolean {
  return isManagement(role)
}
```

(`canBrowseEnrollments` é declarada mais abaixo no arquivo — function hoisting resolve; se o lint de `no-use-before-define` reclamar, mover `canBrowseCatalog` para depois de `canBrowseEnrollments`.)

- [ ] **Step 6: Mensagens (três locales)**

Em cada `apps/app/src/messages/backoffice/*.json`, dentro de `"bo"`:

1. Em `"courses"`: **remover** `"local_only"`; acrescentar:
   - es-PE: `"load_error_title": "No pudimos cargar los cursos"`, `"load_error_body": "Vuelve a intentar en unos segundos. Si sigue fallando, avisa a soporte."`, `"field_language_hint": "Elige uno existente o escribe un idioma nuevo."`, `"retired_notice": "{count, plural, =0 {Curso fuera de catálogo.} one {Curso fuera de catálogo. # matrícula sigue en curso.} other {Curso fuera de catálogo. # matrículas siguen en curso.}}"`, `"restored": "Curso de vuelta en el catálogo"`, `"plans": "Planes y precios"`
   - pt-BR: `"load_error_title": "Não conseguimos carregar os cursos"`, `"load_error_body": "Tente de novo em alguns segundos. Se continuar falhando, avise o suporte."`, `"field_language_hint": "Escolha um existente ou digite um idioma novo."`, `"retired_notice": "{count, plural, =0 {Curso fora do catálogo.} one {Curso fora do catálogo. # matrícula continua em andamento.} other {Curso fora do catálogo. # matrículas continuam em andamento.}}"`, `"restored": "Curso de volta ao catálogo"`, `"plans": "Planos e preços"`
   - en: `"load_error_title": "We couldn't load the courses"`, `"load_error_body": "Try again in a few seconds. If it keeps failing, let support know."`, `"field_language_hint": "Pick an existing one or type a new language."`, `"retired_notice": "{count, plural, =0 {Course taken off the catalog.} one {Course taken off the catalog. # enrollment is still running.} other {Course taken off the catalog. # enrollments are still running.}}"`, `"restored": "Course back in the catalog"`, `"plans": "Plans and prices"`
2. Novo bloco `"catalog_errors"` (as chaves de `CatalogErrorKey`):
   - es-PE: `generic` "No se pudo guardar. Intenta de nuevo.", `course_not_found` "Ese curso ya no está en el catálogo.", `plan_not_found` "Ese plan ya no está disponible.", `price_in_past` "El precio no puede empezar en una fecha pasada.", `period_not_found` "Ese período ya no está disponible.", `class_group_not_found` "Esa aula ya no está disponible.", `invalid_date_range` "La fecha de inicio debe ser anterior a la de término.", `invalid_status_transition` "El aula ya cambió de estado. Recarga la página.", `class_group_incomplete` "Faltan las fechas de inicio y término para abrir la matrícula.", `capacity_below_seats_taken` "Las vacantes no pueden quedar por debajo de las ya ocupadas.", `class_group_course_locked` "El curso solo se cambia en un aula en borrador y sin matriculados.", `period_already_duplicated` "Las aulas de ese período ya se copiaron a este.", `duplicate_same_period` "Elige un período de origen distinto.", `class_group_not_full` "El aula todavía tiene vacantes: matricula directamente.", `waitlist_already_joined` "El alumno ya está en la lista de espera.", `waitlist_already_enrolled` "El alumno ya está matriculado en esta aula.", `waitlist_student_not_found` "No encontramos a ese alumno.", `waitlist_entry_closed` "Ese alumno ya salió de la lista."
   - pt-BR: `generic` "Não foi possível salvar. Tente de novo.", `course_not_found` "Esse curso não está mais no catálogo.", `plan_not_found` "Esse plano não está mais disponível.", `price_in_past` "O preço não pode começar numa data passada.", `period_not_found` "Esse período não está mais disponível.", `class_group_not_found` "Essa turma não está mais disponível.", `invalid_date_range` "A data de início precisa ser anterior à de término.", `invalid_status_transition` "A turma já mudou de status. Recarregue a página.", `class_group_incomplete` "Faltam as datas de início e término para abrir as inscrições.", `capacity_below_seats_taken` "As vagas não podem ficar abaixo das já ocupadas.", `class_group_course_locked` "O curso só muda numa turma em rascunho e sem matriculados.", `period_already_duplicated` "As turmas desse período já foram copiadas para este.", `duplicate_same_period` "Escolha um período de origem diferente.", `class_group_not_full` "A turma ainda tem vagas: matricule direto.", `waitlist_already_joined` "O aluno já está na lista de espera.", `waitlist_already_enrolled` "O aluno já está matriculado nesta turma.", `waitlist_student_not_found` "Não encontramos esse aluno.", `waitlist_entry_closed` "Esse aluno já saiu da lista."
   - en: `generic` "Couldn't save. Try again.", `course_not_found` "That course is no longer in the catalog.", `plan_not_found` "That plan is no longer available.", `price_in_past` "A price can't start on a past date.", `period_not_found` "That period is no longer available.", `class_group_not_found` "That class group is no longer available.", `invalid_date_range` "The start date must come before the end date.", `invalid_status_transition` "The class group already changed status. Reload the page.", `class_group_incomplete` "Start and end dates are needed to open enrollment.", `capacity_below_seats_taken` "Seats can't go below the ones already taken.", `class_group_course_locked` "The course can only change on a draft class group with nobody enrolled.", `period_already_duplicated` "That period's class groups were already copied here.", `duplicate_same_period` "Pick a different source period.", `class_group_not_full` "The class group still has seats: enroll directly.", `waitlist_already_joined` "The student is already on the waitlist.", `waitlist_already_enrolled` "The student is already enrolled in this class group.", `waitlist_student_not_found` "We couldn't find that student.", `waitlist_entry_closed` "That student already left the list."

Conferir os três arquivos com: `node -e "const k=o=>Object.entries(o).flatMap(([a,v])=>typeof v==='object'?k(v).map(x=>a+'.'+x):[a]);const f=n=>new Set(k(require('./apps/app/src/messages/backoffice/'+n+'.json')));const [a,b,c]=['es-PE','pt-BR','en'].map(f);for(const x of a)if(!b.has(x)||!c.has(x))console.log('missing',x);for(const x of [...b,...c])if(!a.has(x))console.log('extra',x)"` → saída vazia.

- [ ] **Step 7: Página de cursos lendo a API**

`courses/page.tsx`: trocar `import { listCourses } from '@/lib/backoffice/mock-data'` por `import { listCatalogCourses } from '@/lib/backoffice/catalog'`; importar `EmptyState, Card` de `@/components/backoffice/ui` e `notFound` de `next/navigation`; logo depois de `getStaffSession()`:

```tsx
  if (!canBrowseCatalog(staff.role)) notFound()
  const rows = await listCatalogCourses()
```

e no JSX trocar `<CoursesView rows={listCourses()} ... />` por:

```tsx
      {rows === null ? (
        <Card className="p-4">
          <EmptyState icon="alert" title={t('courses.load_error_title')} body={t('courses.load_error_body')} />
        </Card>
      ) : (
        <CoursesView
          rows={rows}
          canCreate={canCreateCourse(staff.role)}
          canConfigure={canConfigureCourse(staff.role)}
          canManagePrices={canManagePrices(staff.role)}
        />
      )}
```

(Importar `canBrowseCatalog`. **Não** passar `canManagePrices` nesta task — a prop entra junto com a folha que a consome, na Task 7; remover essa linha do JSX acima por enquanto.)

- [ ] **Step 8: `NewCourseForm` grava de verdade**

Em `new-course-form.tsx`:
- Trocar a prop `onCreate: (course: CourseRow) => void` por `onCreated: () => void`.
- Idioma vira `<input list="course-languages">` + `<datalist id="course-languages">` com os `languages`, estado `language` (string) em vez de `languageId`; hint `t('courses.field_language_hint')` abaixo do campo.
- Novo estado `saving` e `error: CatalogErrorKey | null`.
- `submit` vira:

```tsx
  async function submit() {
    setSaving(true)
    setError(null)
    const { active: _active, ...options } = draftOptions
    const result = await catalogWrite('/courses', 'POST', {
      name: name.trim(),
      language: language.trim(),
      level: level.trim(),
      summary: summary.trim(),
      ...options,
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onCreated()
  }
```

  (renomear o estado `options` para `draftOptions` para evitar sombra; `active` não vai no corpo — curso nasce no catálogo.)
- `ready` usa `language.trim() !== ''`; o botão fica `disabled={!ready || saving}`.
- Abaixo dos botões: `{error && <p role="alert" className="mt-3 text-sm text-red-700">{t(`catalog_errors.${error}`)}</p>}`.
- Atualizar o comentário de topo: tirar "Screen-local"; dizer que grava por `POST /api/v1/catalog/courses`.
- `CourseOptionFields` continua com o toggle `active` — no formulário de criação, passar uma prop nova `hideActive` (acrescentar em `course-option-fields.tsx`: `hideActive?: boolean`, e envolver o `<Toggle ... active>` em `{!hideActive && (...)}`).

- [ ] **Step 9: `CourseOptionsSheet` grava de verdade**

- Trocar a prop `onSave` por `onSaved: (message: 'saved' | 'retired' | 'restored', liveEnrollments?: number) => void`.
- O botão salvar chama:

```tsx
  async function save(course: CourseRow, draft: CourseOptions) {
    setSaving(true)
    setError(null)
    const { active, ...options } = draft
    const changed = (Object.keys(options) as (keyof typeof options)[]).filter((key) => options[key] !== course[key])
    if (changed.length > 0) {
      const patch = Object.fromEntries(changed.map((key) => [key, options[key]]))
      const result = await catalogWrite(`/courses/${course.id}/options`, 'PATCH', patch)
      if (!result.ok) {
        setSaving(false)
        setError(result.error)
        return
      }
    }
    if (active !== course.active) {
      const result = await catalogWrite<{ liveEnrollments: number }>(
        `/course/${course.id}/${active ? 'restore' : 'retire'}`,
        'POST',
      )
      setSaving(false)
      if (!result.ok) {
        setError(result.error)
        return
      }
      onSaved(active ? 'restored' : 'retired', result.data.liveEnrollments)
      onClose()
      return
    }
    setSaving(false)
    onSaved('saved')
    onClose()
  }
```

  O path de retire/restore é `/catalog/:kind/:id/retire` com `kind = course` → `catalogWrite('/course/<id>/retire', 'POST')` monta `/api/v1/catalog/course/<id>/retire`. Correto.
- Mesmo bloco de erro com `role="alert"` e `disabled={saving}` no botão.

- [ ] **Step 10: `CoursesView` sem estado local de verdade**

- Remover `setCourses`/`touched`/banner `local_only`; usar `rows` direto (`const courses = rows`).
- `const router = useRouter()` (de `next/navigation`).
- `NewCourseForm onCreated={() => { setCreating(false); setQuery(''); setToast(t('courses.created')); router.refresh() }}`.
- `CourseOptionsSheet onSaved={(message, live) => { setToast(message === 'retired' ? t('courses.retired_notice', { count: live ?? 0 }) : t(message === 'restored' ? 'courses.restored' : 'courses.saved')); router.refresh() }}`.
- Atualizar o comentário do componente onde falar de mock.

- [ ] **Step 11: Verificar**

Run: `pnpm typecheck:app && pnpm --filter @ooc/app lint`
Expected: PASS (inclusive `no-literal-string`).

Verificação manual (skill `run` ou `pnpm dev:stack` com `pnpm db:up && pnpm db:migrate && pnpm seed:admin`): logar como admin, `/backoffice/courses` → criar curso com idioma novo → aparece na lista; abrir opções, mudar idade mínima, salvar → valor persiste após F5; desligar "Curso en catálogo" → toast com matrículas vivas; religar.

- [ ] **Step 12: Commit**

```bash
git add apps/app/src
git commit -m "feat(app): read and write courses through the catalog API"
```

---

### Task 7: Backoffice — folha "Planos e preços"

**Files:**
- Create: `apps/app/src/app/[locale]/backoffice/(panel)/(gated)/courses/course-plans-sheet.tsx`
- Modify: `.../courses/courses-view.tsx` (abrir a folha), `.../courses/page.tsx` (prop `canManagePrices`)
- Modify: messages (bloco `plans`)

**Interfaces:**
- Consumes: `catalogWrite`, `CourseDetail`, `PlanDetail`, `limaDateToIso`, `isoToLimaDate`, `formatDate` (`@/lib/format`), `formatMoney` ou equivalente de dinheiro existente em `@/lib/format` (procurar `amountCents` em `lib/format.ts`; usar o helper que a tela de pagamentos usa).
- Produces: `CoursePlansSheet({ course: CourseRow | null; canManage: boolean; onClose(): void })`

- [ ] **Step 1: Mensagens `plans` (três locales)**

es-PE: `"title": "Planes y precios"`, `"subtitle": "{course} · {language}"`, `"empty": "Este curso todavía no tiene planes. Sin plan con precio, no aparece en la matrícula."`, `"current": "Vigente"`, `"scheduled": "Desde el {date}"`, `"history": "Historial"`, `"valid_from": "Vigente desde el {date}"`, `"no_current": "Sin precio vigente todavía"`, `"new_plan": "Nuevo plan"`, `"plan_name": "Nombre del plan"`, `"plan_name_placeholder": "Paquete completo"`, `"amount": "Precio (S/)"`, `"start": "Empieza a regir"`, `"start_hint": "Hoy o una fecha futura. Las matrículas ya hechas mantienen su precio."`, `"create_plan": "Crear plan"`, `"new_price": "Nuevo precio"`, `"schedule_price": "Programar precio"`, `"rename": "Renombrar"`, `"save": "Guardar"`, `"cancel": "Cancelar"`, `"close": "Cerrar"`, `"no_edit_rule": "Un precio nunca se edita: para corregirlo, programa uno nuevo."`, `"load_error": "No pudimos cargar los planes."`, `"inactive": "Fuera de venta"`, `"created": "Plan creado"`, `"price_scheduled": "Precio programado"`.

pt-BR: `"title": "Planos e preços"`, `"subtitle": "{course} · {language}"`, `"empty": "Este curso ainda não tem planos. Sem plano com preço, ele não aparece na matrícula."`, `"current": "Vigente"`, `"scheduled": "A partir de {date}"`, `"history": "Histórico"`, `"valid_from": "Vigente desde {date}"`, `"no_current": "Sem preço vigente ainda"`, `"new_plan": "Novo plano"`, `"plan_name": "Nome do plano"`, `"plan_name_placeholder": "Pacote completo"`, `"amount": "Preço (S/)"`, `"start": "Começa a valer"`, `"start_hint": "Hoje ou uma data futura. Matrículas já feitas mantêm o preço delas."`, `"create_plan": "Criar plano"`, `"new_price": "Novo preço"`, `"schedule_price": "Programar preço"`, `"rename": "Renomear"`, `"save": "Salvar"`, `"cancel": "Cancelar"`, `"close": "Fechar"`, `"no_edit_rule": "Preço nunca é editado: para corrigir, programe um novo."`, `"load_error": "Não conseguimos carregar os planos."`, `"inactive": "Fora de venda"`, `"created": "Plano criado"`, `"price_scheduled": "Preço programado"`.

en: `"title": "Plans and prices"`, `"subtitle": "{course} · {language}"`, `"empty": "This course has no plans yet. Without a priced plan it doesn't show up at enrollment."`, `"current": "Current"`, `"scheduled": "From {date}"`, `"history": "History"`, `"valid_from": "In force since {date}"`, `"no_current": "No price in force yet"`, `"new_plan": "New plan"`, `"plan_name": "Plan name"`, `"plan_name_placeholder": "Full package"`, `"amount": "Price (S/)"`, `"start": "Takes effect"`, `"start_hint": "Today or a future date. Enrollments already made keep their price."`, `"create_plan": "Create plan"`, `"new_price": "New price"`, `"schedule_price": "Schedule price"`, `"rename": "Rename"`, `"save": "Save"`, `"cancel": "Cancel"`, `"close": "Close"`, `"no_edit_rule": "A price is never edited: to correct it, schedule a new one."`, `"load_error": "We couldn't load the plans."`, `"inactive": "Off sale"`, `"created": "Plan created"`, `"price_scheduled": "Price scheduled"`.

- [ ] **Step 2: Componente**

`course-plans-sheet.tsx` — estrutura (mesmos primitivos de `course-options-sheet.tsx`):

```tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { CatalogErrorKey, CourseRow, PlanDetail } from '@/lib/backoffice/types'
import { catalogWrite } from '@/lib/backoffice/catalog-client'
import { isoToLimaDate, limaDateToIso } from '@/lib/backoffice/lima-date'
import { formatDate, type Locale } from '@/lib/format'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { BoIcon } from '@/components/backoffice/icons'

/**
 * A course's plans and the history of each price (OOC-36). Prices are
 * versioned and never edited (CLAUDE.md §5): the only write here for money is
 * "schedule a new price", and the sheet says so where the reader would look
 * for an edit button.
 */
export function CoursePlansSheet({
  course,
  canManage,
  onClose,
}: {
  course: CourseRow | null
  canManage: boolean
  onClose: () => void
}) {
  const t = useTranslations('bo')
  const locale = useLocale() as Locale
  const [plans, setPlans] = useState<PlanDetail[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  const load = useCallback(async (id: string) => {
    setLoadFailed(false)
    try {
      const response = await fetch(`/api/v1/catalog/courses/${id}`)
      if (!response.ok) throw new Error(String(response.status))
      const body = (await response.json()) as { plans: PlanDetail[] }
      setPlans(body.plans)
    } catch {
      setLoadFailed(true)
    }
  }, [])

  useEffect(() => {
    setPlans(null)
    if (course) void load(course.id)
  }, [course, load])

  // ...render: header (title + subtitle), the no-edit rule note, load error,
  // empty state, one <PlanCard> per plan, and <NewPlanForm> when canManage.
}
```

Dentro do mesmo arquivo:

- `PlanCard({ plan, canManage, onChanged })`: nome + badge `plans.inactive` se `!plan.active`; preço vigente (`plan.prices.find(p => p.id === plan.currentPriceId)`) em destaque com `plans.valid_from`; preços com `validFrom > now` listados como `plans.scheduled`; resto em "Histórico" (lista simples, mais novo primeiro). Com `canManage`: botão `plans.new_price` abre `<PriceForm>` inline; botão `plans.rename` abre input inline que chama `catalogWrite(`/plans/${plan.id}`, 'PATCH', { name })`.
- `PriceForm({ onSubmit(amountCents, validFromIso | undefined) })`: input número em soles com `step="0.01"`, `min="0.01"`; input `type="date"` com `min={isoToLimaDate(new Date().toISOString())}` e valor padrão hoje; hint `plans.start_hint`. Converte soles → centavos com `Math.round(Number(value) * 100)`. Se a data escolhida for hoje, manda `validFrom` omitido (vale agora); senão `limaDateToIso(date)`.
- `NewPlanForm({ courseId, onCreated })`: nome + `PriceForm` → `catalogWrite(`/courses/${courseId}/plans`, 'POST', { name, amountCents, validFrom })`.
- Cada escrita: em sucesso, `await load(course.id)` e aviso curto (`plans.created` / `plans.price_scheduled`) em `<p role="status">`; em erro, `<p role="alert">{t(`catalog_errors.${error}`)}</p>`.
- Valores em dinheiro: usar o formatador de soles que já existe em `@/lib/format` (procurar `formatPen`/`formatMoney`/`formatCents`); se não existir, usar `new Intl.NumberFormat(..., { style: 'currency', currency: 'PEN' })` a partir de `amountCents / 100` num helper local `pen(cents)` — sem texto literal.

Escrever o componente completo seguindo esse esqueleto; nenhum texto visível fora do `t(...)`.

- [ ] **Step 3: Ligar na lista**

Em `courses-view.tsx`: prop nova `canManagePrices: boolean`; estado `pricing: CourseRow | null`; na linha do curso, uma coluna/ação `t('courses.plans')` (botão pequeno com ícone, `onClick` com `event.stopPropagation()` para não abrir a folha de opções) visível para todo leitor do catálogo; renderizar `<CoursePlansSheet course={pricing} canManage={canManagePrices} onClose={() => setPricing(null)} />`. Ao adicionar coluna, atualizar `TableShell columns` e o `<colgroup>` mantendo soma 100%. Em `page.tsx`, passar `canManagePrices={canManagePrices(staff.role)}`.

- [ ] **Step 4: Verificar**

Run: `pnpm typecheck:app && pnpm --filter @ooc/app lint` + checagem de chaves dos três locales (comando da Task 6).
Manual: criar plano com preço hoje → aparece "Vigente"; programar preço daqui a 30 dias → aparece "Desde el …" acima; como `enrollment_supervisor` a folha abre só leitura; `GET /api/v1/catalog` (checkout) passa a listar o curso se houver turma aberta.

- [ ] **Step 5: Commit**

```bash
git add apps/app/src
git commit -m "feat(app): manage plans and scheduled prices from the course list"
```

---

### Task 8: Docs do PR 1 + verificação final + PR

**Files:**
- Modify: `README.md` ("Estado atual" e tabela "Estado de integração por tela")
- Modify: `apps/api/CLAUDE.md` (trava de `plan_prices`; preço agendado)
- Modify: `packages/db/CLAUDE.md` (lista de tabelas travadas inclui `plan_prices`)

- [ ] **Step 1: Docs**

- `packages/db/CLAUDE.md`: no item "Sem grant de DELETE…", acrescentar `plan_prices` (sem UPDATE nem DELETE, desde a `0017`), com as duas camadas.
- `apps/api/CLAUDE.md`: no item "Preço é versionado, nunca editado", acrescentar que desde a `0017` o banco recusa UPDATE/DELETE em `plan_prices`, que preço novo pode ser agendado (`valid_from` futuro, nunca passado — tolerância 60 s) e que só `master`/`admin` criam plano e lançam preço (`POST /catalog/courses/:id/plans`, `POST /catalog/plans/:id/prices`).
- `README.md`: tela de Cursos passa de mock para real (lista, criar, opções, sair/voltar do catálogo, planos e preços); `courses.local_only` sumiu.

- [ ] **Step 2: Verificação completa**

Run:
```
pnpm typecheck:domain && pnpm typecheck:db && pnpm typecheck:api && pnpm typecheck:app
pnpm lint
pnpm --filter @ooc/api test
pnpm --filter @ooc/api test:db
pnpm --filter @ooc/db test
```
Expected: tudo verde. Se algo falhar, parar e diagnosticar (superpowers:systematic-debugging) antes de seguir.

- [ ] **Step 3: Commit e PR**

```bash
git add README.md apps/api/CLAUDE.md packages/db/CLAUDE.md
git commit -m "docs: record the real course catalog and the plan_prices lock"
```

Confirmar com o usuário antes de `git push` e `gh pr create` (ação externa). PR em inglês: título `feat: real course CRUD with versioned plan prices (OOC-36)`, corpo com resumo, teste, e a linha `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

---

# PARTE 2 — OOC-35 · Turmas, períodos, duplicação e lista de espera

Começa numa branch nova a partir da branch do PR 1 (ou de `main` depois do merge): `tech/ooc-35-class-groups-crud`.

### Task 9: Migration 0018 — turma em rascunho, janela, rastro de cópia, saída da espera; leituras públicas

**Files:**
- Modify: `packages/db/src/schema.ts:170-222` (class_groups), `:630-648` (waitlist_entries)
- Create: `packages/db/migrations/0018_<gerado>.sql`
- Modify: `apps/api/src/infra/persistence/catalog/ListOpenClassGroupsQuery.ts`
- Modify: `apps/api/src/infra/persistence/catalog/GetPublicCatalogQuery.ts`
- Modify: `apps/api/src/infra/persistence/enrollment/DrizzleEnrollmentRepository.ts`, `DrizzleSeatHoldRepository.ts`
- Create: `apps/api/src/infra/persistence/catalog/sellableClassGroup.ts`
- Test: `apps/api/src/infra/persistence/catalog/OpenClassGroups.integration.test.ts`

**Interfaces:**
- Produces:
  - Drizzle: `classGroups.startsOn/endsOn` nullable; `classGroups.enrollmentOpensAt`, `enrollmentClosesAt`, `sourceClassGroupId`; `waitlistEntries.leftAt`, `leftReason`
  - `sellableClassGroup(now?: SQL)`: condição SQL `status = 'enrolling' and deleted_at is null and (opens is null or opens <= now()) and (closes is null or closes > now())`
  - `OpenClassGroupResult` ganha `slots: unknown` (WeeklySlot[] cru)

- [ ] **Step 1: Teste de integração que falha**

`OpenClassGroups.integration.test.ts` (esqueleto igual ao da Task 4). Seed: período, curso, plano + preço vigente; quatro turmas — `draft` (sem datas), `enrolling` sem janela, `enrolling` com `enrollmentClosesAt` no passado, `enrolling` com `enrollmentOpensAt` no futuro — e uma quinta `enrolling` num período aposentado. Asserções:

```ts
  it("lists only class groups on sale now", async () => {
    const open = await new ListOpenClassGroupsQuery(db).run();
    const ids = open.map((row) => row.id);
    expect(ids).toContain(ON_SALE);
    expect(ids).not.toContain(DRAFT);
    expect(ids).not.toContain(WINDOW_CLOSED);
    expect(ids).not.toContain(WINDOW_NOT_OPEN);
    expect(ids).not.toContain(RETIRED_PERIOD);
  });

  it("the public checkout applies the same filter", async () => {
    const catalog = await new GetPublicCatalogQuery(db).run();
    const ids = catalog.classGroups.map((group) => group.id);
    expect(ids).toEqual(expect.arrayContaining([ON_SALE]));
    for (const hidden of [DRAFT, WINDOW_CLOSED, WINDOW_NOT_OPEN, RETIRED_PERIOD]) expect(ids).not.toContain(hidden);
  });

  it("a draft class group never takes a seat", async () => {
    await expect(
      new DrizzleSeatHoldRepository(db).claim(/* args as the existing seat-hold integration test builds them, classGroupId: DRAFT */),
    ).rejects.toBeInstanceOf(ClassGroupFullError);
  });
```

Para o terceiro caso, copiar a chamada exata de `claim` de `DrizzleSeatHoldRepository.integration.test.ts` (ler o arquivo) e trocar a turma por `DRAFT`. Ver o nome real do método e o retorno quando não há vaga (pode ser `null` em vez de throw — ajustar a asserção ao contrato existente). `GetPublicCatalogQuery.run()` pode receber argumentos — conferir assinatura.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @ooc/api test:db -- OpenClassGroups`
Expected: FAIL (colunas inexistentes / draft não aceito pelo CHECK).

- [ ] **Step 3: Schema**

Em `class_groups`:
- `startsOn: timestamp("starts_on", { withTimezone: true }),` e idem `endsOn` — sem `.notNull()`; comentário: `// Null only while the class group is a draft (OOC-35): a duplicated class group starts without dates on purpose.`
- Depois de `endsOn`:

```ts
    // Optional enrollment window (OOC-35). Null on either side = no limit on
    // that side; the class group sells while status = 'enrolling' and now is
    // inside the window.
    enrollmentOpensAt: timestamp("enrollment_opens_at", { withTimezone: true }),
    enrollmentClosesAt: timestamp("enrollment_closes_at", { withTimezone: true }),
    // The class group this one was copied from when a period was duplicated —
    // the trail, and what stops the same copy from running twice.
    sourceClassGroupId: uuid("source_class_group_id").references(
      (): AnyPgColumn => classGroups.id,
      { onDelete: "restrict" },
    ),
```

  (importar `type AnyPgColumn` de `drizzle-orm/pg-core`).
- Check de status: `in ('draft', 'enrolling', 'in_progress', 'finished', 'closed')` — **mesmo nome de constraint** (`class_groups_status_check`); o drizzle-kit gera DROP + ADD.
- Checks novos:

```ts
    check(
      "class_groups_dates_check",
      sql`${table.status} = 'draft' or (${table.startsOn} is not null and ${table.endsOn} is not null)`,
    ),
    check(
      "class_groups_enrollment_window_check",
      sql`${table.enrollmentOpensAt} is null or ${table.enrollmentClosesAt} is null or ${table.enrollmentOpensAt} < ${table.enrollmentClosesAt}`,
    ),
    index("class_groups_source_class_group_id_idx").on(table.sourceClassGroupId),
```

- `status` default continua `'enrolling'` (não mudar o comportamento de quem insere sem status — seed/legado).

Em `waitlist_entries`:

```ts
    // Leaving the queue is marked, never deleted (CLAUDE.md §6). 'enrolled' is
    // written by the manual enrollment in the same transaction; the other two
    // by staff.
    leftAt: timestamp("left_at", { withTimezone: true }),
    leftReason: text("left_reason"),
    // The row changes once now (when it leaves the queue), so it carries
    // updated_at like every table that changes (packages/db CLAUDE.md).
    updatedAt: updatedAt(),
```

- trocar o `uniqueIndex(...)` por `uniqueIndex("waitlist_entries_active_uidx").on(table.classGroupId, table.studentId).where(sql`${table.leftAt} is null`)` e acrescentar:

```ts
    check(
      "waitlist_entries_left_reason_check",
      sql`${table.leftReason} is null or ${table.leftReason} in ('enrolled', 'withdrawn', 'removed_by_staff')`,
    ),
    check(
      "waitlist_entries_left_check",
      sql`(${table.leftAt} is null) = (${table.leftReason} is null)`,
    ),
    index("waitlist_entries_class_group_id_created_at_idx").on(table.classGroupId, table.createdAt),
```

  Atualizar o comentário da tabela: "Backoffice-only and manual since OOC-35; the public checkout offering it is still Sessão 22."

- [ ] **Step 4: Gerar e revisar a migration**

Run: `pnpm --filter @ooc/db db:generate --name catalog_class_groups`
Abrir o SQL e conferir: `ALTER COLUMN "starts_on" DROP NOT NULL`, idem `ends_on`; ADD das três colunas + FK; DROP/ADD do status check; ADD dos checks novos; `DROP INDEX "waitlist_entries_class_group_id_student_id_uidx"` + `CREATE UNIQUE INDEX "waitlist_entries_active_uidx" ... WHERE "left_at" is null`. Se o drizzle-kit gerar o DROP do índice antigo depois do CREATE do novo, tudo bem (nomes diferentes).

Run: `pnpm db:migrate && pnpm --filter @ooc/db test`
Expected: PASS.

- [ ] **Step 5: Condição "à venda" num lugar só**

`apps/api/src/infra/persistence/catalog/sellableClassGroup.ts`:

```ts
import { classGroups } from "@ooc/db";
import { and, eq, gt, isNull, lte, or, sql, type SQL } from "drizzle-orm";

/**
 * What "this class group is on sale right now" means, written once (OOC-35):
 * enrolling, not retired, and inside its enrollment window when it has one.
 * The public checkout and the manual-enrollment picker both read through this
 * — a draft, or a window that closed, must disappear from both at once.
 */
export function sellableClassGroup(now: SQL = sql`now()`): SQL {
  return and(
    eq(classGroups.status, "enrolling"),
    isNull(classGroups.deletedAt),
    or(isNull(classGroups.enrollmentOpensAt), lte(classGroups.enrollmentOpensAt, now)),
    or(isNull(classGroups.enrollmentClosesAt), gt(classGroups.enrollmentClosesAt, now)),
  )!;
}
```

- [ ] **Step 6: Aplicar nas duas leituras**

- `ListOpenClassGroupsQuery`: trocar `eq(classGroups.status, "enrolling")` e `isNull(classGroups.deletedAt)` por `sellableClassGroup()`; acrescentar `slots: classGroups.slots` ao select e `slots: unknown` a `OpenClassGroupResult`; `startsOn: row.startsOn!.toISOString()` com comentário `// Never null here: sellableClassGroup excludes drafts, and the 0018 check forbids a non-draft without dates.`
- `GetPublicCatalogQuery`: na query de class groups, `.innerJoin(academicPeriods, eq(classGroups.academicPeriodId, academicPeriods.id))` e `.where(and(sellableClassGroup(), isNull(academicPeriods.deletedAt)))`; tratar `startsOn`/`endsOn` com `!` e o mesmo comentário (ver como a rota serializa — ajustar o tipo `Date` no result para aceitar o non-null assertion).
- `ListOpenClassGroupsRoute.ts`: acrescentar `slots: z.array(z.object({ weekday: z.enum(["mon","tue","wed","thu","fri","sat","sun"]), startTime: z.string(), endTime: z.string() }))` ao schema de resposta (o banco guarda jsonb; fazer `slots: row.slots as WeeklySlot[]` no handler ou na query).

- [ ] **Step 7: Rascunho nunca toma vaga**

Em `DrizzleEnrollmentRepository.createWithPayment` e no UPDATE atômico de `DrizzleSeatHoldRepository` (linhas ~36-37), acrescentar ao `where` `ne(classGroups.status, "draft")` com o comentário: `// A draft has no dates and is not on sale (OOC-35); zero rows is the same answer as full, which the caller already handles.`

- [ ] **Step 8: Rodar e ver passar**

Run: `pnpm --filter @ooc/api test:db && pnpm typecheck:api`
Expected: PASS — inclusive as suítes antigas de seat hold e enrollment (o `seed` delas não usa `draft`).

Corrigir qualquer outro ponto que o `tsc` aponte por `startsOn`/`endsOn` agora `Date | null` (ex.: `seed-catalog.ts`, `legacy-import/catalog.ts`, `DrizzleEnrollmentEmailContextLookup.ts`, `ListEnrollmentsQuery.ts`) — em leitura, tratar `null` explicitamente (`?.toISOString() ?? null` e ajustar o tipo de saída se a tela aceita) ou non-null assertion **só** onde a query já filtra status ≠ draft, sempre com comentário dizendo por quê.

- [ ] **Step 9: Commit**

```bash
git add packages/db apps/api/src
git commit -m "feat(db): allow draft class groups, enrollment windows and leaving the waitlist"
```

---

### Task 10: Domínio — `AcademicPeriod`, `ClassGroup` e seus usecases

**Files:**
- Create: `packages/domain/src/catalog/AcademicPeriod.ts`, `ClassGroup.ts`
- Create: `packages/domain/src/catalog/ports/IAcademicPeriodRepository.ts`, `IClassGroupRepository.ts`
- Create: `packages/domain/src/catalog/CreateAcademicPeriodUseCase.ts`, `UpdateAcademicPeriodUseCase.ts`, `CreateClassGroupUseCase.ts`, `UpdateClassGroupUseCase.ts`, `AdvanceClassGroupStatusUseCase.ts`
- Modify: `packages/domain/src/catalog/errors.ts`, `packages/domain/src/index.ts`
- Modify: `apps/api/src/tests/fakes/catalog.ts`
- Test: `apps/api/src/tests/catalog-class-group.test.ts`

**Interfaces:**
- Consumes: `Course`, `ICourseRepository`, `CourseNotFoundError`, `ConflictError`.
- Produces:
  - `WeekdaySchema = z.enum(["mon","tue","wed","thu","fri","sat","sun"])`, `WeeklySlotSchema`, `type WeeklySlot = { weekday; startTime: "HH:mm"; endTime: "HH:mm" }`
  - `ClassGroupStatusSchema = z.enum(["draft","enrolling","in_progress","finished","closed"])`, `type ClassGroupStatus`, `NEXT_CLASS_GROUP_STATUS: Record<ClassGroupStatus, ClassGroupStatus | null>`
  - `class AcademicPeriod extends SoftDeletableModel { name; startsOn: Date; endsOn: Date; static create(dto); update(patch): string[] }`, `CreateAcademicPeriodSchema`, `UpdateAcademicPeriodSchema`
  - `class ClassGroup extends SoftDeletableModel` com `courseId, academicPeriodId, code, teacherName, slots, startsOn: Date | null, endsOn: Date | null, enrollmentOpensAt: Date | null, enrollmentClosesAt: Date | null, capacity, seatsTaken (readonly), status, sourceClassGroupId: string | null`; `static create(dto: CreateClassGroupDTO)` (nasce `draft`); `update(patch: UpdateClassGroupDTO): string[]`; `advanceTo(next: ClassGroupStatus): ClassGroupStatus` (devolve o anterior); `get isFull(): boolean`; `static copyInto(source: ClassGroup, academicPeriodId: string): ClassGroup`
  - `CreateClassGroupSchema` (courseId, academicPeriodId, code, teacherName, slots, capacity, startsOn?, endsOn?, enrollmentOpensAt?, enrollmentClosesAt? — datas como `z.coerce.date().nullable().optional()`), `UpdateClassGroupSchema = CreateClassGroupSchema.omit({ academicPeriodId: true }).partial()`
  - `IAcademicPeriodRepository { create(p): Promise<AcademicPeriod>; findById(id): Promise<AcademicPeriod | null>; update(p): Promise<AcademicPeriod> }`
  - `IClassGroupRepository { create(g): Promise<ClassGroup>; findById(id): Promise<ClassGroup | null>; update(g): Promise<ClassGroup> /* throws CapacityBelowSeatsTakenError */; listForCopy(periodId): Promise<{ copyable: ClassGroup[]; skippedRetired: number }>; insertCopies(sourcePeriodId, targetPeriodId, copies): Promise<void> /* throws PeriodAlreadyDuplicatedError */ }`
  - Erros: `PeriodNotFoundError` (404 `catalog.period_not_found`), `ClassGroupNotFoundError` **do catálogo** com nome `CatalogClassGroupNotFoundError` (404 `catalog.class_group_not_found` — o nome `ClassGroupNotFoundError` já existe em `enrollment/errors.ts`), `InvalidDateRangeError` (422), `InvalidStatusTransitionError` (409), `ClassGroupIncompleteError` (422), `CapacityBelowSeatsTakenError` (422), `ClassGroupCourseLockedError` (422), `PeriodAlreadyDuplicatedError` (409), `DuplicateSamePeriodError` (422)
  - Usecases: `CreateAcademicPeriodUseCase.run({ actorId, period })`, `UpdateAcademicPeriodUseCase.run({ actorId, id, patch })`, `CreateClassGroupUseCase.run({ actorId, classGroup: CreateClassGroupDTO, publish: boolean }): Promise<ClassGroup>`, `UpdateClassGroupUseCase.run({ actorId, id, patch })`, `AdvanceClassGroupStatusUseCase.run({ actorId, id, to }): Promise<ClassGroup>`

- [ ] **Step 1: Fakes**

Acrescentar em `fakes/catalog.ts`: `FakeAcademicPeriodRepository` (Map, mesmo formato do `FakeCourseRepository`) e `FakeClassGroupRepository`:

```ts
export class FakeClassGroupRepository implements IClassGroupRepository {
  public readonly rows = new Map<string, ClassGroup>();
  /** Lets a test simulate seats taken by the checkout between read and write. */
  public seatsTakenOverride = new Map<string, number>();

  async create(group: ClassGroup): Promise<ClassGroup> {
    this.rows.set(group.id, group);
    return group;
  }

  async findById(id: string): Promise<ClassGroup | null> {
    return this.rows.get(id) ?? null;
  }

  async update(group: ClassGroup): Promise<ClassGroup> {
    const taken = this.seatsTakenOverride.get(group.id) ?? group.seatsTaken;
    if (group.capacity < taken) throw new CapacityBelowSeatsTakenError();
    this.rows.set(group.id, group);
    return group;
  }

  async listForCopy(periodId: string): Promise<{ copyable: ClassGroup[]; skippedRetired: number }> {
    const inPeriod = [...this.rows.values()].filter((group) => group.academicPeriodId === periodId);
    return {
      copyable: inPeriod.filter((group) => !group.isDeleted),
      skippedRetired: inPeriod.filter((group) => group.isDeleted).length,
    };
  }

  async insertCopies(sourcePeriodId: string, targetPeriodId: string, copies: ClassGroup[]): Promise<void> {
    const already = [...this.rows.values()].some(
      (group) =>
        group.academicPeriodId === targetPeriodId &&
        group.sourceClassGroupId !== null &&
        this.rows.get(group.sourceClassGroupId)?.academicPeriodId === sourcePeriodId,
    );
    if (already) throw new PeriodAlreadyDuplicatedError();
    for (const copy of copies) this.rows.set(copy.id, copy);
  }
}
```

- [ ] **Step 2: Teste que falha**

`apps/api/src/tests/catalog-class-group.test.ts` — cobrir, com fakes:

```ts
import {
  AcademicPeriod,
  AdvanceClassGroupStatusUseCase,
  CapacityBelowSeatsTakenError,
  ClassGroup,
  ClassGroupCourseLockedError,
  ClassGroupIncompleteError,
  Course,
  CourseNotFoundError,
  CreateClassGroupUseCase,
  InvalidDateRangeError,
  InvalidStatusTransitionError,
  UpdateClassGroupUseCase,
  type CreateClassGroupDTO,
} from "@ooc/domain";
import { beforeEach, describe, expect, it } from "vitest";
import {
  FakeAcademicPeriodRepository,
  FakeAuditLogRepository,
  FakeClassGroupRepository,
  FakeCourseRepository,
} from "./fakes/catalog.js";

/**
 * A class group's life (OOC-35): born a draft, published once complete, moved
 * forward one step at a time by a person — never by a date. Capacity never
 * drops below the seats already taken; the course only changes while nothing
 * hangs off it.
 */

const ACTOR = "usr_coord";
let courses: FakeCourseRepository;
let periods: FakeAcademicPeriodRepository;
let groups: FakeClassGroupRepository;
let auditLog: FakeAuditLogRepository;
let course: Course;
let period: AcademicPeriod;

function draftOf(overrides: Partial<CreateClassGroupDTO> = {}): CreateClassGroupDTO {
  return {
    courseId: course.id,
    academicPeriodId: period.id,
    code: "ING-0101",
    teacherName: "Ana Torres",
    slots: [{ weekday: "mon", startTime: "18:00", endTime: "19:30" }],
    capacity: 30,
    ...overrides,
  };
}

const DATES = {
  startsOn: new Date("2026-11-02T05:00:00Z"),
  endsOn: new Date("2027-01-30T05:00:00Z"),
};

beforeEach(async () => {
  courses = new FakeCourseRepository();
  periods = new FakeAcademicPeriodRepository();
  groups = new FakeClassGroupRepository();
  auditLog = new FakeAuditLogRepository();
  course = await courses.create(
    Course.create({
      name: "Inglés Básico", language: "Inglés", level: "A1", summary: "x", minAge: 13, modules: 4,
      totalHours: 80, certificateRule: "automatic", allowsFreeze: true, allowsTransfer: false,
    }),
  );
  period = await periods.create(AcademicPeriod.create({ name: "Ciclo 2026-IV", ...DATES }));
});

describe("CreateClassGroupUseCase", () => {
  const create = () => new CreateClassGroupUseCase(courses, periods, groups, auditLog);

  it("creates a draft without dates", async () => {
    const group = await create().run({ actorId: ACTOR, classGroup: draftOf(), publish: false });
    expect(group.status).toBe("draft");
    expect(group.startsOn).toBeNull();
    expect(group.seatsTaken).toBe(0);
    expect(auditLog.appended.map((entry) => entry.action)).toEqual(["catalog.class_group.created"]);
  });

  it("publishes straight away when complete", async () => {
    const group = await create().run({ actorId: ACTOR, classGroup: draftOf(DATES), publish: true });
    expect(group.status).toBe("enrolling");
  });

  it("refuses to publish without dates", async () => {
    await expect(create().run({ actorId: ACTOR, classGroup: draftOf(), publish: true })).rejects.toBeInstanceOf(
      ClassGroupIncompleteError,
    );
  });

  it("refuses a retired course", async () => {
    course.softDelete();
    await expect(create().run({ actorId: ACTOR, classGroup: draftOf(), publish: false })).rejects.toBeInstanceOf(
      CourseNotFoundError,
    );
  });

  it("refuses an end before the start", async () => {
    await expect(
      create().run({ actorId: ACTOR, classGroup: draftOf({ startsOn: DATES.endsOn, endsOn: DATES.startsOn }), publish: false }),
    ).rejects.toBeInstanceOf(InvalidDateRangeError);
  });

  it("refuses an enrollment window that closes before it opens", async () => {
    await expect(
      create().run({
        actorId: ACTOR,
        classGroup: draftOf({ enrollmentOpensAt: DATES.endsOn, enrollmentClosesAt: DATES.startsOn }),
        publish: false,
      }),
    ).rejects.toBeInstanceOf(InvalidDateRangeError);
  });
});

describe("AdvanceClassGroupStatusUseCase", () => {
  it("walks the whole life one step at a time", async () => {
    const group = await groups.create(ClassGroup.create(draftOf(DATES)));
    const advance = new AdvanceClassGroupStatusUseCase(groups, auditLog);

    for (const to of ["enrolling", "in_progress", "finished", "closed"] as const) {
      expect((await advance.run({ actorId: ACTOR, id: group.id, to })).status).toBe(to);
    }
    expect(auditLog.appended.at(-1)).toEqual(
      expect.objectContaining({ action: "catalog.class_group.status_changed", metadata: { from: "finished", to: "closed" } }),
    );
  });

  it("refuses skipping a step or going back", async () => {
    const group = await groups.create(ClassGroup.create(draftOf(DATES)));
    const advance = new AdvanceClassGroupStatusUseCase(groups, auditLog);

    await expect(advance.run({ actorId: ACTOR, id: group.id, to: "in_progress" })).rejects.toBeInstanceOf(
      InvalidStatusTransitionError,
    );
    await advance.run({ actorId: ACTOR, id: group.id, to: "enrolling" });
    await expect(advance.run({ actorId: ACTOR, id: group.id, to: "draft" })).rejects.toBeInstanceOf(
      InvalidStatusTransitionError,
    );
  });
});

describe("UpdateClassGroupUseCase", () => {
  it("refuses a capacity below the seats taken", async () => {
    const group = await groups.create(ClassGroup.create(draftOf(DATES)));
    groups.seatsTakenOverride.set(group.id, 12);

    await expect(
      new UpdateClassGroupUseCase(courses, groups, auditLog).run({ actorId: ACTOR, id: group.id, patch: { capacity: 10 } }),
    ).rejects.toBeInstanceOf(CapacityBelowSeatsTakenError);
  });

  it("changes the course only on a draft", async () => {
    const other = await courses.create(Course.create({ ...course, name: "Inglés Kids" } as never));
    const group = await groups.create(ClassGroup.create(draftOf(DATES)));
    const update = new UpdateClassGroupUseCase(courses, groups, auditLog);

    await update.run({ actorId: ACTOR, id: group.id, patch: { courseId: other.id } });
    expect(groups.rows.get(group.id)?.courseId).toBe(other.id);

    await new AdvanceClassGroupStatusUseCase(groups, auditLog).run({ actorId: ACTOR, id: group.id, to: "enrolling" });
    await expect(update.run({ actorId: ACTOR, id: group.id, patch: { courseId: course.id } })).rejects.toBeInstanceOf(
      ClassGroupCourseLockedError,
    );
  });

  it("refuses clearing the dates of a published class group", async () => {
    const group = await groups.create(ClassGroup.create(draftOf(DATES)));
    await new AdvanceClassGroupStatusUseCase(groups, auditLog).run({ actorId: ACTOR, id: group.id, to: "enrolling" });

    await expect(
      new UpdateClassGroupUseCase(courses, groups, auditLog).run({ actorId: ACTOR, id: group.id, patch: { startsOn: null } }),
    ).rejects.toBeInstanceOf(ClassGroupIncompleteError);
  });
});
```

(No teste "changes the course only on a draft", construir o segundo curso com um DTO completo explícito em vez de `{ ...course } as never` — escrever o objeto inteiro.)

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm --filter @ooc/api test -- catalog-class-group`
Expected: FAIL.

- [ ] **Step 4: Erros**

Em `catalog/errors.ts` (importar `ConflictError`):

```ts
export class PeriodNotFoundError extends NotFoundError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({ reason: "catalog.period_not_found", message: "No live academic period with that id.", ...params });
  }
}

export class CatalogClassGroupNotFoundError extends NotFoundError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({ reason: "catalog.class_group_not_found", message: "No live class group with that id.", ...params });
  }
}

export class InvalidDateRangeError extends UnableToProcessEntryError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({ reason: "catalog.invalid_date_range", message: "A range must start before it ends.", ...params });
  }
}

export class InvalidStatusTransitionError extends ConflictError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({ reason: "catalog.invalid_status_transition", message: "A class group moves forward one step at a time.", ...params });
  }
}

export class ClassGroupIncompleteError extends UnableToProcessEntryError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({ reason: "catalog.class_group_incomplete", message: "Only a draft may lack start and end dates.", ...params });
  }
}

export class CapacityBelowSeatsTakenError extends UnableToProcessEntryError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({ reason: "catalog.capacity_below_seats_taken", message: "Capacity cannot drop below the seats already taken.", ...params });
  }
}

export class ClassGroupCourseLockedError extends UnableToProcessEntryError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({ reason: "catalog.class_group_course_locked", message: "The course only changes on an empty draft.", ...params });
  }
}

export class PeriodAlreadyDuplicatedError extends ConflictError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({ reason: "catalog.period_already_duplicated", message: "That period was already copied into this one.", ...params });
  }
}

export class DuplicateSamePeriodError extends UnableToProcessEntryError {
  constructor(params?: { path?: string; cause?: unknown }) {
    super({ reason: "catalog.duplicate_same_period", message: "Source and target periods must differ.", ...params });
  }
}
```

- [ ] **Step 5: `AcademicPeriod`**

```ts
import { v7 as uuid } from "uuid";
import { z } from "zod";
import { BASE_PROPS_KEYS, SoftDeletableModel, SoftDeletableModelPropsSchema } from "../shared/base/SoftDeletableModel.js";
import { InvalidDateRangeError } from "./errors.js";

export const AcademicPeriodPropsSchema = SoftDeletableModelPropsSchema.extend({
  name: z.string().trim().min(1),
  startsOn: z.coerce.date(),
  endsOn: z.coerce.date(),
});

export type AcademicPeriodProps = z.infer<typeof AcademicPeriodPropsSchema>;
export const CreateAcademicPeriodSchema = AcademicPeriodPropsSchema.omit(BASE_PROPS_KEYS);
export type CreateAcademicPeriodDTO = z.infer<typeof CreateAcademicPeriodSchema>;
export const UpdateAcademicPeriodSchema = CreateAcademicPeriodSchema.partial();
export type UpdateAcademicPeriodDTO = z.infer<typeof UpdateAcademicPeriodSchema>;

/** A sales period: its own courses on offer, dates and class groups (CLAUDE.md §1). */
export class AcademicPeriod extends SoftDeletableModel {
  public name: string;
  public startsOn: Date;
  public endsOn: Date;

  constructor(props: AcademicPeriodProps) {
    super(props);
    this.name = props.name;
    this.startsOn = props.startsOn;
    this.endsOn = props.endsOn;
  }

  static create(dto: CreateAcademicPeriodDTO): AcademicPeriod {
    const period = new AcademicPeriod(AcademicPeriodPropsSchema.parse({ ...dto, id: uuid() }));
    period.assertRange();
    return period;
  }

  update(patch: UpdateAcademicPeriodDTO): (keyof UpdateAcademicPeriodDTO)[] {
    const valid = UpdateAcademicPeriodSchema.parse(patch);
    const changed: (keyof UpdateAcademicPeriodDTO)[] = [];
    if (valid.name !== undefined && valid.name !== this.name) {
      this.name = valid.name;
      changed.push("name");
    }
    if (valid.startsOn !== undefined && valid.startsOn.getTime() !== this.startsOn.getTime()) {
      this.startsOn = valid.startsOn;
      changed.push("startsOn");
    }
    if (valid.endsOn !== undefined && valid.endsOn.getTime() !== this.endsOn.getTime()) {
      this.endsOn = valid.endsOn;
      changed.push("endsOn");
    }
    this.assertRange();
    if (changed.length > 0) this.touch();
    return changed;
  }

  private assertRange(): void {
    if (this.startsOn.getTime() >= this.endsOn.getTime()) throw new InvalidDateRangeError();
  }
}
```

- [ ] **Step 6: `ClassGroup`**

```ts
import { v7 as uuid } from "uuid";
import { z } from "zod";
import { SoftDeletableModel, SoftDeletableModelPropsSchema } from "../shared/base/SoftDeletableModel.js";
import {
  ClassGroupCourseLockedError,
  ClassGroupIncompleteError,
  InvalidDateRangeError,
  InvalidStatusTransitionError,
} from "./errors.js";

export const WeekdaySchema = z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
const HourMinute = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/** One weekly session, in America/Lima — the shape the checkout already reads. */
export const WeeklySlotSchema = z
  .object({ weekday: WeekdaySchema, startTime: HourMinute, endTime: HourMinute })
  .refine((slot) => slot.startTime < slot.endTime);
export type WeeklySlot = z.infer<typeof WeeklySlotSchema>;

export const ClassGroupStatusSchema = z.enum(["draft", "enrolling", "in_progress", "finished", "closed"]);
export type ClassGroupStatus = z.infer<typeof ClassGroupStatusSchema>;

/**
 * The only way forward, one step at a time, moved by a person (OOC-35). No
 * step back: a class group opened by mistake is retired, not un-published.
 */
export const NEXT_CLASS_GROUP_STATUS: Record<ClassGroupStatus, ClassGroupStatus | null> = {
  draft: "enrolling",
  enrolling: "in_progress",
  in_progress: "finished",
  finished: "closed",
  closed: null,
};

const optionalDate = z.coerce.date().nullable().optional();

export const ClassGroupPropsSchema = SoftDeletableModelPropsSchema.extend({
  courseId: z.string().uuid(),
  academicPeriodId: z.string().uuid(),
  code: z.string().trim(),
  teacherName: z.string().trim(),
  slots: z.array(WeeklySlotSchema),
  startsOn: z.coerce.date().nullable(),
  endsOn: z.coerce.date().nullable(),
  enrollmentOpensAt: z.coerce.date().nullable(),
  enrollmentClosesAt: z.coerce.date().nullable(),
  capacity: z.number().int().positive(),
  seatsTaken: z.number().int().nonnegative(),
  status: ClassGroupStatusSchema,
  sourceClassGroupId: z.string().uuid().nullable(),
});
export type ClassGroupProps = z.infer<typeof ClassGroupPropsSchema>;

export const CreateClassGroupSchema = z.object({
  courseId: z.string().uuid(),
  academicPeriodId: z.string().uuid(),
  code: z.string().trim().min(1),
  teacherName: z.string().trim(),
  slots: z.array(WeeklySlotSchema).min(1),
  capacity: z.number().int().positive(),
  startsOn: optionalDate,
  endsOn: optionalDate,
  enrollmentOpensAt: optionalDate,
  enrollmentClosesAt: optionalDate,
});
export type CreateClassGroupDTO = z.infer<typeof CreateClassGroupSchema>;

/** The period never changes — a class group in the wrong period is retired and reopened. */
export const UpdateClassGroupSchema = CreateClassGroupSchema.omit({ academicPeriodId: true }).partial();
export type UpdateClassGroupDTO = z.infer<typeof UpdateClassGroupSchema>;

type Editable = keyof UpdateClassGroupDTO;

export class ClassGroup extends SoftDeletableModel {
  public courseId: string;
  public readonly academicPeriodId: string;
  public code: string;
  public teacherName: string;
  public slots: WeeklySlot[];
  public startsOn: Date | null;
  public endsOn: Date | null;
  public enrollmentOpensAt: Date | null;
  public enrollmentClosesAt: Date | null;
  public capacity: number;
  /** Read-only here: only the atomic seat UPDATE in apps/api ever moves it (apps/api CLAUDE.md, Vagas). */
  public readonly seatsTaken: number;
  public status: ClassGroupStatus;
  public readonly sourceClassGroupId: string | null;

  constructor(props: ClassGroupProps) {
    super(props);
    this.courseId = props.courseId;
    this.academicPeriodId = props.academicPeriodId;
    this.code = props.code;
    this.teacherName = props.teacherName;
    this.slots = props.slots;
    this.startsOn = props.startsOn;
    this.endsOn = props.endsOn;
    this.enrollmentOpensAt = props.enrollmentOpensAt;
    this.enrollmentClosesAt = props.enrollmentClosesAt;
    this.capacity = props.capacity;
    this.seatsTaken = props.seatsTaken;
    this.status = props.status;
    this.sourceClassGroupId = props.sourceClassGroupId;
  }

  /** Always born a draft; publishing is a separate, checked step. */
  static create(dto: CreateClassGroupDTO): ClassGroup {
    const valid = CreateClassGroupSchema.parse(dto);
    const group = new ClassGroup(
      ClassGroupPropsSchema.parse({
        ...valid,
        id: uuid(),
        startsOn: valid.startsOn ?? null,
        endsOn: valid.endsOn ?? null,
        enrollmentOpensAt: valid.enrollmentOpensAt ?? null,
        enrollmentClosesAt: valid.enrollmentClosesAt ?? null,
        seatsTaken: 0,
        status: "draft",
        sourceClassGroupId: null,
      }),
    );
    group.assertConsistent();
    return group;
  }

  /**
   * Period duplication (OOC-35): same course, schedule, code, teacher and
   * capacity; no dates, no window, no seats, a draft — and a pointer back.
   * Nothing that belongs to the old period's students comes along.
   */
  static copyInto(source: ClassGroup, academicPeriodId: string): ClassGroup {
    return new ClassGroup(
      ClassGroupPropsSchema.parse({
        id: uuid(),
        courseId: source.courseId,
        academicPeriodId,
        code: source.code,
        teacherName: source.teacherName,
        slots: source.slots,
        startsOn: null,
        endsOn: null,
        enrollmentOpensAt: null,
        enrollmentClosesAt: null,
        capacity: source.capacity,
        seatsTaken: 0,
        status: "draft",
        sourceClassGroupId: source.id,
      }),
    );
  }

  get isFull(): boolean {
    return this.seatsTaken >= this.capacity;
  }

  update(patch: UpdateClassGroupDTO): Editable[] {
    const valid = UpdateClassGroupSchema.parse(patch);
    const changed: Editable[] = [];

    if (valid.courseId !== undefined && valid.courseId !== this.courseId) {
      if (this.status !== "draft" || this.seatsTaken > 0) throw new ClassGroupCourseLockedError();
      this.courseId = valid.courseId;
      changed.push("courseId");
    }

    for (const key of ["code", "teacherName", "capacity"] as const) {
      const next = valid[key];
      if (next !== undefined && next !== this[key]) {
        (this as Record<string, unknown>)[key] = next;
        changed.push(key);
      }
    }

    if (valid.slots !== undefined && JSON.stringify(valid.slots) !== JSON.stringify(this.slots)) {
      this.slots = valid.slots;
      changed.push("slots");
    }

    for (const key of ["startsOn", "endsOn", "enrollmentOpensAt", "enrollmentClosesAt"] as const) {
      const next = valid[key];
      if (next === undefined) continue;
      const current = this[key];
      if ((next?.getTime() ?? null) === (current?.getTime() ?? null)) continue;
      this[key] = next;
      changed.push(key);
    }

    this.assertConsistent();
    if (changed.length > 0) this.touch();
    return changed;
  }

  /** Moves one step forward. Answers the status it left. */
  advanceTo(next: ClassGroupStatus): ClassGroupStatus {
    if (NEXT_CLASS_GROUP_STATUS[this.status] !== next) throw new InvalidStatusTransitionError();
    const previous = this.status;
    this.status = next;
    this.assertConsistent();
    this.touch();
    return previous;
  }

  /**
   * What the 0018 checks also say — repeated here so the reader gets a
   * readable reason instead of a constraint name. Capacity vs seats taken is
   * NOT here: the seats move under us, so only the conditional UPDATE in the
   * repository can answer it truthfully.
   */
  private assertConsistent(): void {
    if (this.status !== "draft" && (this.startsOn === null || this.endsOn === null)) {
      throw new ClassGroupIncompleteError();
    }
    if (this.startsOn && this.endsOn && this.startsOn.getTime() >= this.endsOn.getTime()) {
      throw new InvalidDateRangeError();
    }
    if (
      this.enrollmentOpensAt &&
      this.enrollmentClosesAt &&
      this.enrollmentOpensAt.getTime() >= this.enrollmentClosesAt.getTime()
    ) {
      throw new InvalidDateRangeError();
    }
  }
}
```

- [ ] **Step 7: Portas e usecases**

`ports/IAcademicPeriodRepository.ts` e `ports/IClassGroupRepository.ts` com as assinaturas da seção Interfaces, cada uma com comentário curto (sem delete; `findById` responde aposentado; `update` de turma não escreve `seats_taken` e lança `CapacityBelowSeatsTakenError` quando o UPDATE condicional não acha linha; `insertCopies` é uma transação que lança `PeriodAlreadyDuplicatedError`).

`CreateAcademicPeriodUseCase` / `UpdateAcademicPeriodUseCase`: mesmo formato de `CreateCourseUseCase` / `UpdateCourseUseCase`; ações `catalog.academic_period.created` / `catalog.academic_period.updated`; update de período inexistente → `PeriodNotFoundError`.

`CreateClassGroupUseCase`:

```ts
export interface CreateClassGroupInput {
  actorId: string;
  classGroup: CreateClassGroupDTO;
  /** Open enrollment right away (draft → enrolling) — refused if incomplete. */
  publish: boolean;
}

export class CreateClassGroupUseCase extends BaseUseCase<CreateClassGroupInput, ClassGroup> {
  constructor(
    private readonly courses: ICourseRepository,
    private readonly periods: IAcademicPeriodRepository,
    private readonly classGroups: IClassGroupRepository,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: CreateClassGroupInput): Promise<ClassGroup> {
    const course = await this.courses.findById(input.classGroup.courseId);
    if (!course || course.isDeleted) throw new CourseNotFoundError();

    const period = await this.periods.findById(input.classGroup.academicPeriodId);
    if (!period || period.isDeleted) throw new PeriodNotFoundError();

    const group = ClassGroup.create(input.classGroup);
    if (input.publish) group.advanceTo("enrolling");

    const created = await this.classGroups.create(group);

    await this.auditLog.append({
      actorId: input.actorId,
      action: "catalog.class_group.created",
      targetId: created.id,
      metadata: { courseId: course.id, academicPeriodId: period.id, status: created.status },
      at: created.createdAt,
    });

    return created;
  }
}
```

`UpdateClassGroupUseCase(courses, classGroups, auditLog)`: busca a turma (inexistente ou aposentada → `CatalogClassGroupNotFoundError`); se o patch troca `courseId`, confere o curso novo vivo (`CourseNotFoundError`); `group.update(patch)`; se nada mudou, devolve; senão `classGroups.update(group)` e audita `catalog.class_group.updated` com `{ fields }`.

`AdvanceClassGroupStatusUseCase(classGroups, auditLog).run({ actorId, id, to })`: busca (404 se ausente/aposentada), `const from = group.advanceTo(to)`, `classGroups.update(group)`, audita `catalog.class_group.status_changed` com `{ from, to }`.

Exports em `index.ts` para tudo isso (entidades, schemas, tipos, portas, usecases, erros novos).

- [ ] **Step 8: Rodar e ver passar**

Run: `pnpm --filter @ooc/api test -- catalog-class-group && pnpm typecheck:domain`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/domain apps/api/src/tests
git commit -m "feat(domain): add academic periods and the class group lifecycle"
```

---

### Task 11: Duplicar período — usecase, repositório, critério de pronto

**Files:**
- Create: `packages/domain/src/catalog/DuplicateClassGroupsUseCase.ts`
- Create: `apps/api/src/infra/persistence/catalog/DrizzleAcademicPeriodRepository.ts`
- Create: `apps/api/src/infra/persistence/catalog/DrizzleClassGroupRepository.ts`
- Modify: `packages/domain/src/index.ts`
- Test: `apps/api/src/tests/catalog-duplicate.test.ts`, `apps/api/src/infra/persistence/catalog/ClassGroupCatalog.integration.test.ts`

**Interfaces:**
- Consumes: Task 10.
- Produces: `DuplicateClassGroupsUseCase.run({ actorId, sourcePeriodId, targetPeriodId }): Promise<{ copied: number; skippedRetired: number }>`; `DrizzleAcademicPeriodRepository`, `DrizzleClassGroupRepository`, `classGroupFromRow(row)`.

- [ ] **Step 1: Teste unitário que falha**

`catalog-duplicate.test.ts` (fakes): cria período origem com 3 turmas (uma aposentada, uma já `in_progress` com `seatsTaken` simulado via construtor direto `new ClassGroup({... seatsTaken: 20, status: "in_progress" ...})`), período destino vazio. Asserções:
- resultado `{ copied: 2, skippedRetired: 1 }`;
- cada cópia: `status === "draft"`, `startsOn === null`, `endsOn === null`, `enrollmentOpensAt === null`, `enrollmentClosesAt === null`, `seatsTaken === 0`, `capacity` igual à origem, `sourceClassGroupId` = id da origem, `academicPeriodId` = destino;
- segundo disparo → `PeriodAlreadyDuplicatedError`;
- origem = destino → `DuplicateSamePeriodError`;
- destino aposentado → `PeriodNotFoundError`;
- uma linha de auditoria `catalog.academic_period.duplicated` com `{ sourcePeriodId, copied: 2, skippedRetired: 1 }`, `targetId` = destino.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @ooc/api test -- catalog-duplicate` → FAIL.

- [ ] **Step 3: Usecase**

```ts
export interface DuplicateClassGroupsInput {
  actorId: string;
  sourcePeriodId: string;
  targetPeriodId: string;
}

/**
 * Copies a period's class groups into another one, as drafts with no dates and
 * no seats taken (OOC-35 acceptance criterion). Retired class groups — and
 * class groups of retired courses — stay behind. Enrollments, waitlists and
 * seat holds never come along: they belong to people of the old period.
 *
 * Runs once per (source, target): a second run answers 409 instead of 80
 * class groups.
 */
export class DuplicateClassGroupsUseCase extends BaseUseCase<
  DuplicateClassGroupsInput,
  { copied: number; skippedRetired: number }
> {
  constructor(
    private readonly periods: IAcademicPeriodRepository,
    private readonly classGroups: IClassGroupRepository,
    private readonly auditLog: IAuditLogRepository,
  ) {
    super();
  }

  async run(input: DuplicateClassGroupsInput): Promise<{ copied: number; skippedRetired: number }> {
    if (input.sourcePeriodId === input.targetPeriodId) throw new DuplicateSamePeriodError();

    const source = await this.periods.findById(input.sourcePeriodId);
    if (!source) throw new PeriodNotFoundError();
    const target = await this.periods.findById(input.targetPeriodId);
    if (!target || target.isDeleted) throw new PeriodNotFoundError();

    const { copyable, skippedRetired } = await this.classGroups.listForCopy(source.id);
    const copies = copyable.map((group) => ClassGroup.copyInto(group, target.id));

    await this.classGroups.insertCopies(source.id, target.id, copies);

    const at = new Date();
    await this.auditLog.append({
      actorId: input.actorId,
      action: "catalog.academic_period.duplicated",
      targetId: target.id,
      metadata: { sourcePeriodId: source.id, copied: copies.length, skippedRetired },
      at,
    });

    return { copied: copies.length, skippedRetired };
  }
}
```

(Origem aposentada é aceita de propósito: duplicar o ciclo que acabou de sair do ar é o caso normal.)

- [ ] **Step 4: Ver passar**

Run: `pnpm --filter @ooc/api test -- catalog-duplicate` → PASS.

- [ ] **Step 5: Integração que falha — o critério de pronto**

`ClassGroupCatalog.integration.test.ts` (esqueleto da Task 4). Seed na transação: período A; curso vivo C1 e curso aposentado C2; plano + preço; aluno; turma T1 (C1, `in_progress`, datas, capacidade 25) com **uma matrícula** (insert direto em `enrollments` com `seatsTaken: 1` na turma), uma entrada de espera e um `seat_holds` ativo; turma T2 (C1) aposentada; turma T3 (C2, curso aposentado); período B vazio. Asserções:

```ts
  it("duplicating a period copies class groups with dates and seats zeroed, and no enrollment comes along", async () => {
    const periods = new DrizzleAcademicPeriodRepository(db);
    const groups = new DrizzleClassGroupRepository(db);
    const auditLog = new DrizzleAuditLogRepository(db);

    const result = await new DuplicateClassGroupsUseCase(periods, groups, auditLog).run({
      actorId: ACTOR, sourcePeriodId: PERIOD_A, targetPeriodId: PERIOD_B,
    });
    expect(result).toEqual({ copied: 1, skippedRetired: 2 });

    const copies = await db.select().from(classGroups).where(eq(classGroups.academicPeriodId, PERIOD_B));
    expect(copies).toHaveLength(1);
    expect(copies[0]).toMatchObject({
      courseId: C1, status: "draft", startsOn: null, endsOn: null,
      enrollmentOpensAt: null, enrollmentClosesAt: null, seatsTaken: 0, capacity: 25, sourceClassGroupId: T1,
    });

    const copyId = copies[0]!.id;
    expect(await db.select().from(enrollments).where(eq(enrollments.classGroupId, copyId))).toEqual([]);
    expect(await db.select().from(waitlistEntries).where(eq(waitlistEntries.classGroupId, copyId))).toEqual([]);
    expect(await db.select().from(seatHolds).where(eq(seatHolds.classGroupId, copyId))).toEqual([]);

    await expect(
      new DuplicateClassGroupsUseCase(periods, groups, auditLog).run({ actorId: ACTOR, sourcePeriodId: PERIOD_A, targetPeriodId: PERIOD_B }),
    ).rejects.toBeInstanceOf(PeriodAlreadyDuplicatedError);
  });

  it("refuses to shrink capacity below seats taken, atomically", async () => {
    const groups = new DrizzleClassGroupRepository(db);
    const group = (await groups.findById(T1))!;
    group.update({ capacity: 1 }); // 1 seat taken: allowed
    await groups.update(group);

    // simulate the checkout taking a seat after we read the row
    await db.update(classGroups).set({ capacity: 3, seatsTaken: 2 }).where(eq(classGroups.id, T1));
    const stale = (await groups.findById(T1))!;
    await db.update(classGroups).set({ seatsTaken: 3 }).where(eq(classGroups.id, T1));
    stale.update({ capacity: 2 });
    await expect(groups.update(stale)).rejects.toBeInstanceOf(CapacityBelowSeatsTakenError);
  });
```

`ACTOR` precisa ser um `user.id` existente se `audit_log.actor_id` tiver FK — conferir no schema; se tiver, inserir um usuário de teste no seed (ver como outras suítes fazem com `audit_log`, ex. `grep -rn auditLog apps/api/src --include=*.integration.test.ts`). `DrizzleAuditLogRepository` mora em `apps/api/src/infra/...` — achar o caminho com `grep -rn "class DrizzleAuditLogRepository"`.

- [ ] **Step 6: Ver falhar**

Run: `pnpm --filter @ooc/api test:db -- ClassGroupCatalog` → FAIL.

- [ ] **Step 7: Repositórios**

`DrizzleAcademicPeriodRepository`: mesmo padrão de `DrizzleCourseRepository` (create/findById/update; update não escreve `deleted_at`), com `periodFromRow`.

`DrizzleClassGroupRepository`:

```ts
import {
  CapacityBelowSeatsTakenError,
  ClassGroup,
  PeriodAlreadyDuplicatedError,
  type ClassGroupStatus,
  type IClassGroupRepository,
  type WeeklySlot,
} from "@ooc/domain";
import { academicPeriods, classGroups, courses } from "@ooc/db";
import { aliasedTable, and, eq, gte, isNotNull, isNull, or, sql } from "drizzle-orm";
import type { Db } from "@/infra/db/client.js";

type Row = typeof classGroups.$inferSelect;

export function classGroupFromRow(row: Row): ClassGroup {
  return new ClassGroup({
    id: row.id,
    courseId: row.courseId,
    academicPeriodId: row.academicPeriodId,
    code: row.code,
    teacherName: row.teacherName,
    slots: row.slots as WeeklySlot[],
    startsOn: row.startsOn,
    endsOn: row.endsOn,
    enrollmentOpensAt: row.enrollmentOpensAt,
    enrollmentClosesAt: row.enrollmentClosesAt,
    capacity: row.capacity,
    seatsTaken: row.seatsTaken,
    status: row.status as ClassGroupStatus,
    sourceClassGroupId: row.sourceClassGroupId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  });
}

function insertValues(group: ClassGroup) {
  return {
    id: group.id,
    courseId: group.courseId,
    academicPeriodId: group.academicPeriodId,
    // Panel-made class groups keep the schedule in `slots` only; `schedule`
    // is the seed-era text column and stays empty (OOC-35).
    schedule: "",
    slots: group.slots,
    code: group.code,
    teacherName: group.teacherName,
    startsOn: group.startsOn,
    endsOn: group.endsOn,
    enrollmentOpensAt: group.enrollmentOpensAt,
    enrollmentClosesAt: group.enrollmentClosesAt,
    capacity: group.capacity,
    seatsTaken: 0,
    status: group.status,
    sourceClassGroupId: group.sourceClassGroupId,
  };
}

export class DrizzleClassGroupRepository implements IClassGroupRepository {
  constructor(private readonly db: Db) {}

  async create(group: ClassGroup): Promise<ClassGroup> {
    const [row] = await this.db.insert(classGroups).values(insertValues(group)).returning();
    if (!row) throw new Error("Insert into class_groups returned no row");
    return classGroupFromRow(row);
  }

  async findById(id: string): Promise<ClassGroup | null> {
    const [row] = await this.db.select().from(classGroups).where(eq(classGroups.id, id)).limit(1);
    return row ? classGroupFromRow(row) : null;
  }

  /**
   * Never writes seats_taken, and never lowers capacity below it: the WHERE
   * re-reads the counter at write time, so a seat the checkout took a moment
   * ago counts (apps/api CLAUDE.md, "nunca validar vaga na aplicação").
   */
  async update(group: ClassGroup): Promise<ClassGroup> {
    const [row] = await this.db
      .update(classGroups)
      .set({
        courseId: group.courseId,
        code: group.code,
        teacherName: group.teacherName,
        slots: group.slots,
        startsOn: group.startsOn,
        endsOn: group.endsOn,
        enrollmentOpensAt: group.enrollmentOpensAt,
        enrollmentClosesAt: group.enrollmentClosesAt,
        capacity: group.capacity,
        status: group.status,
        updatedAt: group.updatedAt,
      })
      .where(and(eq(classGroups.id, group.id), sql`${classGroups.seatsTaken} <= ${group.capacity}`))
      .returning();
    if (!row) throw new CapacityBelowSeatsTakenError();
    return classGroupFromRow(row);
  }

  async listForCopy(periodId: string): Promise<{ copyable: ClassGroup[]; skippedRetired: number }> {
    const rows = await this.db
      .select({ group: classGroups, courseDeletedAt: courses.deletedAt })
      .from(classGroups)
      .innerJoin(courses, eq(courses.id, classGroups.courseId))
      .where(eq(classGroups.academicPeriodId, periodId));

    const live = rows.filter((row) => row.group.deletedAt === null && row.courseDeletedAt === null);
    return { copyable: live.map((row) => classGroupFromRow(row.group)), skippedRetired: rows.length - live.length };
  }

  async insertCopies(sourcePeriodId: string, targetPeriodId: string, copies: ClassGroup[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Serializes two duplications into the same target: the second one
      // waits here, then sees the first one's copies below.
      await tx.select({ id: academicPeriods.id }).from(academicPeriods).where(eq(academicPeriods.id, targetPeriodId)).for("update");

      const source = aliasedTable(classGroups, "source");
      const [already] = await tx
        .select({ id: classGroups.id })
        .from(classGroups)
        .innerJoin(source, eq(source.id, classGroups.sourceClassGroupId))
        .where(and(eq(classGroups.academicPeriodId, targetPeriodId), eq(source.academicPeriodId, sourcePeriodId)))
        .limit(1);
      if (already) throw new PeriodAlreadyDuplicatedError();

      if (copies.length > 0) await tx.insert(classGroups).values(copies.map(insertValues));
    });
  }
}
```

(Remover imports não usados — `gte`, `isNotNull`, `isNull`, `or` — que o lint apontar.)

- [ ] **Step 8: Ver passar**

Run: `pnpm --filter @ooc/api test:db -- ClassGroupCatalog && pnpm --filter @ooc/api test && pnpm typecheck:api`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/domain apps/api/src
git commit -m "feat(api): duplicate a period's class groups as empty drafts"
```

---

### Task 12: Lista de espera — domínio, repositório, matrícula manual fechando a entrada

**Files:**
- Create: `packages/domain/src/catalog/WaitlistEntry.ts`, `ports/IWaitlistRepository.ts`, `JoinWaitlistUseCase.ts`, `LeaveWaitlistUseCase.ts`
- Modify: `packages/domain/src/catalog/errors.ts`, `packages/domain/src/index.ts`, `packages/domain/src/enrollment/EnrollmentRepository.ts` (comentário da porta)
- Create: `apps/api/src/infra/persistence/catalog/DrizzleWaitlistRepository.ts`, `ListWaitlistQuery.ts`
- Modify: `apps/api/src/infra/persistence/enrollment/DrizzleEnrollmentRepository.ts`
- Modify: `apps/api/src/tests/fakes/catalog.ts`
- Test: `apps/api/src/tests/catalog-waitlist.test.ts`, `apps/api/src/infra/persistence/catalog/Waitlist.integration.test.ts`

**Interfaces:**
- Produces:
  - `WaitlistLeaveReasonSchema = z.enum(["enrolled","withdrawn","removed_by_staff"])`; `StaffWaitlistLeaveReasonSchema = z.enum(["withdrawn","removed_by_staff"])`
  - `class WaitlistEntry extends BaseModel { classGroupId; studentId; leftAt: Date | null; leftReason: WaitlistLeaveReason | null; static join({classGroupId, studentId}); leave(reason, at = new Date()) }`
  - `interface IWaitlistRepository { studentStanding(studentId, classGroupId): Promise<"missing" | "enrolled" | "free">; join(entry): Promise<WaitlistEntry> /* throws WaitlistAlreadyJoinedError */; findById(id): Promise<WaitlistEntry | null>; leave(entry): Promise<void> }`
  - Erros: `ClassGroupNotFullError` (422 `catalog.class_group_not_full`), `WaitlistAlreadyJoinedError` (409 `catalog.waitlist_already_joined`), `WaitlistAlreadyEnrolledError` (422 `catalog.waitlist_already_enrolled`), `WaitlistStudentNotFoundError` (404 `catalog.waitlist_student_not_found`), `WaitlistEntryClosedError` (409 `catalog.waitlist_entry_closed`), `WaitlistEntryNotFoundError` (404 `catalog.waitlist_entry_not_found` — acrescentar `waitlist_entry_not_found` a `CatalogErrorKey`, `KNOWN` e locales na Task 15)
  - `JoinWaitlistUseCase(classGroups, waitlist, auditLog).run({ actorId, classGroupId, studentId }): Promise<WaitlistEntry>`
  - `LeaveWaitlistUseCase(waitlist, auditLog).run({ actorId, entryId, reason: "withdrawn" | "removed_by_staff" }): Promise<WaitlistEntry>`
  - `ListWaitlistQuery.run(classGroupId): Promise<{ id; studentId; studentName; nationalIdType; nationalId; joinedAt: string }[]>` (só ativas, FIFO)

- [ ] **Step 1: Teste unitário que falha** (`catalog-waitlist.test.ts`, fakes)

Casos: entra em turma lotada → entrada criada + audit `catalog.waitlist.joined`; turma com vaga → `ClassGroupNotFullError`; turma aposentada → `CatalogClassGroupNotFoundError`; aluno `missing` → `WaitlistStudentNotFoundError`; aluno `enrolled` → `WaitlistAlreadyEnrolledError`; segunda entrada ativa → `WaitlistAlreadyJoinedError`; sair com `withdrawn` → `leftAt` preenchido, audit `catalog.waitlist.left` com `{ reason }`; sair de novo → `WaitlistEntryClosedError`. Turma lotada no fake: `new ClassGroup({ ...props, capacity: 2, seatsTaken: 2, status: "enrolling", ... })`.

`FakeWaitlistRepository` em `fakes/catalog.ts`: `standing = new Map<string, "missing" | "enrolled" | "free">()` (chave `${studentId}:${classGroupId}`, padrão `"free"`), `rows = new Map<string, WaitlistEntry>()`; `join` lança `WaitlistAlreadyJoinedError` se houver entrada ativa do par.

- [ ] **Step 2: Ver falhar** — `pnpm --filter @ooc/api test -- catalog-waitlist` → FAIL.

- [ ] **Step 3: Entidade, porta, erros, usecases**

```ts
// WaitlistEntry.ts
import { v7 as uuid } from "uuid";
import { z } from "zod";
import { BaseModel, BaseModelPropsSchema } from "../shared/base/BaseModel.js";
import { WaitlistEntryClosedError } from "./errors.js";

export const WaitlistLeaveReasonSchema = z.enum(["enrolled", "withdrawn", "removed_by_staff"]);
export type WaitlistLeaveReason = z.infer<typeof WaitlistLeaveReasonSchema>;
/** 'enrolled' is written by the manual enrollment itself, never chosen by staff. */
export const StaffWaitlistLeaveReasonSchema = z.enum(["withdrawn", "removed_by_staff"]);

export const WaitlistEntryPropsSchema = BaseModelPropsSchema.extend({
  classGroupId: z.string().uuid(),
  studentId: z.string().uuid(),
  leftAt: z.coerce.date().nullable(),
  leftReason: WaitlistLeaveReasonSchema.nullable(),
});
export type WaitlistEntryProps = z.infer<typeof WaitlistEntryPropsSchema>;

/**
 * A place in a full class group's queue (OOC-35, backoffice-only). Leaving is
 * marked, never deleted — who waited and why they stopped is the record.
 */
export class WaitlistEntry extends BaseModel {
  public readonly classGroupId: string;
  public readonly studentId: string;
  public leftAt: Date | null;
  public leftReason: WaitlistLeaveReason | null;

  constructor(props: WaitlistEntryProps) {
    super(props);
    this.classGroupId = props.classGroupId;
    this.studentId = props.studentId;
    this.leftAt = props.leftAt;
    this.leftReason = props.leftReason;
  }

  static join(dto: { classGroupId: string; studentId: string }): WaitlistEntry {
    return new WaitlistEntry(WaitlistEntryPropsSchema.parse({ ...dto, id: uuid(), leftAt: null, leftReason: null }));
  }

  leave(reason: WaitlistLeaveReason, at: Date = new Date()): void {
    if (this.leftAt !== null) throw new WaitlistEntryClosedError();
    this.leftAt = at;
    this.leftReason = reason;
    this.touch(at);
  }
}
```

`JoinWaitlistUseCase.run`: `group = classGroups.findById` (ausente/aposentada → `CatalogClassGroupNotFoundError`); `!group.isFull` → `ClassGroupNotFullError`; `standing = waitlist.studentStanding(...)` → `missing`/`enrolled` → erros respectivos; `entry = await waitlist.join(WaitlistEntry.join(...))`; audit `catalog.waitlist.joined` (targetId = entry.id, metadata `{ classGroupId, studentId }`).

`LeaveWaitlistUseCase.run`: busca (ausente → `WaitlistEntryNotFoundError`), `entry.leave(reason)`, `waitlist.leave(entry)`, audit `catalog.waitlist.left` (`{ classGroupId, reason }`).

Exports no `index.ts`.

- [ ] **Step 4: Ver passar** — PASS.

- [ ] **Step 5: Integração que falha** (`Waitlist.integration.test.ts`)

Seed: período, curso, turma lotada (capacity 1, seatsTaken 1, enrolling), dois alunos, plano + preço. Casos:
- `studentStanding` devolve `free` para aluno sem matrícula, `enrolled` para aluno com matrícula viva na turma, `missing` para UUID inexistente;
- `join` duas vezes o mesmo par → segunda lança `WaitlistAlreadyJoinedError` (violação 23505 traduzida);
- `leave` e depois `join` de novo funciona (índice parcial);
- `ListWaitlistQuery` traz só ativas, mais antiga primeiro, com `studentName = "<first> <last>"`;
- **matrícula manual fecha a entrada**: liberar a vaga (`update classGroups set seatsTaken 0`), `DrizzleEnrollmentRepository.createWithPayment(...)` para o aluno da fila (montar `Enrollment.createManual` e `Payment.createManual` como `CreateManualEnrollmentUseCase` faz) → a entrada passa a ter `leftReason: "enrolled"` e `leftAt` não nulo.

- [ ] **Step 6: Ver falhar** → FAIL.

- [ ] **Step 7: Implementar**

`DrizzleWaitlistRepository`:
- `studentStanding`: `select id from students where id = $1 and deleted_at is null` → ausente = `missing`; senão `select 1 from enrollments where student_id and class_group_id and deleted_at is null and seat_status <> 'released' limit 1` → `enrolled` ou `free`.
- `join`: insert; capturar erro com `code === "23505"` (pg `DatabaseError`; o erro pode vir embrulhado em `cause` pelo drizzle — checar `error.code ?? error.cause?.code`) → `WaitlistAlreadyJoinedError`.
- `findById`, `leave` (`update waitlist_entries set left_at, left_reason where id and left_at is null`; zero linhas → `WaitlistEntryClosedError`).

`ListWaitlistQuery`: join `students`, `where class_group_id = $1 and left_at is null`, `order by created_at asc`.

Em `DrizzleEnrollmentRepository.createWithPayment`, logo depois do insert de `payments`:

```ts
      // A seat taken from the waitlist closes the student's place in the
      // queue in the same transaction (OOC-35) — the queue never shows
      // somebody who is already in.
      await tx
        .update(waitlistEntries)
        .set({ leftAt: sql`now()`, leftReason: "enrolled", updatedAt: sql`now()` })
        .where(
          and(
            eq(waitlistEntries.classGroupId, enrollment.classGroupId),
            eq(waitlistEntries.studentId, enrollment.studentId),
            isNull(waitlistEntries.leftAt),
          ),
        );
```

`waitlist_entries.updated_at` entra na migration 0018 (Task 9, Step 3); mapear `createdAt`/`updatedAt` no repositório.

Atualizar o comentário de `IEnrollmentRepository` dizendo que a operação também fecha a entrada de espera ativa daquele aluno naquela turma.

- [ ] **Step 8: Ver passar** — `pnpm --filter @ooc/api test:db && pnpm --filter @ooc/api test && pnpm typecheck:api` → PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/domain apps/api/src
git commit -m "feat(api): manual waitlist for full class groups, closed by the enrollment"
```

---

### Task 13: Rotas de período, turma e espera + container + autorização

**Files:**
- Create em `apps/api/src/http/catalog/`: `ListPeriodsRoute.ts`, `CreatePeriodRoute.ts`, `UpdatePeriodRoute.ts`, `DuplicatePeriodRoute.ts`, `ListClassGroupsRoute.ts`, `GetClassGroupRoute.ts`, `CreateClassGroupRoute.ts`, `UpdateClassGroupRoute.ts`, `AdvanceClassGroupStatusRoute.ts`, `ListWaitlistRoute.ts`, `JoinWaitlistRoute.ts`, `LeaveWaitlistRoute.ts`
- Create: `apps/api/src/infra/persistence/catalog/ListPeriodsQuery.ts`, `ListClassGroupsQuery.ts`
- Modify: `CatalogSchemas.ts`, `container.ts`, `app.ts`, `apps/api/src/tests/catalog-routes-authorization.test.ts`
- Test: `apps/api/src/infra/persistence/catalog/ClassGroupCatalog.integration.test.ts` (acrescentar casos das queries)

**Interfaces:**
- Produces:
  - `ListPeriodsQuery.run(): Promise<{ id; name; startsOn: string; endsOn: string; active: boolean; classGroupCount: number }[]>` (ordem `starts_on desc`)
  - `ListClassGroupsQuery.run(filter: { periodId?: string; courseId?: string; status?: ClassGroupStatus; q?: string; id?: string }): Promise<ClassGroupItem[]>` com `ClassGroupItem = { id; code; courseId; courseName; language; courseActive: boolean; academicPeriodId; academicPeriodName; teacherName; slots: WeeklySlot[]; startsOn: string | null; endsOn: string | null; enrollmentOpensAt: string | null; enrollmentClosesAt: string | null; capacity; seatsTaken; status: ClassGroupStatus; active: boolean; waitlistCount: number }`
  - `ClassGroupItemSchema` em `CatalogSchemas.ts`
  - Rotas (escrita = `CATALOG_WRITE_ROLES`, leitura = `CATALOG_READ_ROLES`):
    - `GET /catalog/periods` → `{ items }`
    - `POST /catalog/periods` body `{ name, startsOn: datetime, endsOn: datetime }` → 201 `{ id }`
    - `PATCH /catalog/periods/:id` body parcial → 200 `{ id }`
    - `POST /catalog/periods/:id/duplicate` body `{ sourcePeriodId: uuid }` → 201 `{ copied, skippedRetired }` (`:id` é o **destino**)
    - `GET /catalog/class-groups?periodId&courseId&status&q` → `{ items }` (sem `periodId` e sem `q`: limite 500, mais recentes primeiro)
    - `GET /catalog/class-groups/:id` → `ClassGroupItem` ou 404
    - `POST /catalog/class-groups` body `CreateClassGroupSchema` (datas como string datetime) + `publish: boolean` → 201 `{ id, status }`
    - `PATCH /catalog/class-groups/:id` body `UpdateClassGroupSchema` (datas string|null) → 200 `{ id }`
    - `POST /catalog/class-groups/:id/status` body `{ to: ClassGroupStatusSchema }` → 200 `{ id, status }`
    - `GET /catalog/class-groups/:id/waitlist` → `{ items }`
    - `POST /catalog/class-groups/:id/waitlist` body `{ studentId: uuid }` → 201 `{ id }`
    - `POST /catalog/waitlist/:id/leave` body `{ reason: StaffWaitlistLeaveReasonSchema }` → 200 `{ id }`

- [ ] **Step 1: Estender o teste de autorização (falha)**

Acrescentar a `CASES`:

```ts
  ["GET", "/api/v1/catalog/periods", "billing"],
  ["POST", "/api/v1/catalog/periods", "academic_supervisor"],
  ["PATCH", `/api/v1/catalog/periods/${ID}`, "sales"],
  ["POST", `/api/v1/catalog/periods/${ID}/duplicate`, "academic_supervisor"],
  ["GET", "/api/v1/catalog/class-groups", "teacher"],
  ["GET", `/api/v1/catalog/class-groups/${ID}`, "billing"],
  ["POST", "/api/v1/catalog/class-groups", "academic_supervisor"],
  ["PATCH", `/api/v1/catalog/class-groups/${ID}`, "support"],
  ["POST", `/api/v1/catalog/class-groups/${ID}/status`, "analyst"],
  ["GET", `/api/v1/catalog/class-groups/${ID}/waitlist`, "billing"],
  ["POST", `/api/v1/catalog/class-groups/${ID}/waitlist`, "sales"],
  ["POST", `/api/v1/catalog/waitlist/${ID}/leave`, "support"],
```

Run: `pnpm --filter @ooc/api test -- catalog-routes-authorization` → FAIL (404).

- [ ] **Step 2: Queries com teste de integração**

Acrescentar em `ClassGroupCatalog.integration.test.ts`: `ListClassGroupsQuery` filtra por período; `q` casa código, curso e docente (`ilike`); turma de curso aposentado vem com `courseActive: false`; `waitlistCount` conta só ativas; `ListPeriodsQuery` traz `classGroupCount` só de turmas vivas. Implementar as duas queries (joins `courses`, `academic_periods`, subquery `count(*) filter (where left_at is null)` de `waitlist_entries`; datas `?.toISOString() ?? null`). Ordem de `ListClassGroupsQuery`: `courses.language asc, courses.name asc, class_groups.starts_on asc nulls last, class_groups.code asc`.

Run: `pnpm --filter @ooc/api test:db -- ClassGroupCatalog` → PASS.

- [ ] **Step 3: Rotas**

Seguir o padrão de `CreateCourseRoute.ts` (Task 5). Datas chegam como `z.string().datetime({ offset: true })` e viram `new Date(...)`; `null` explícito no PATCH limpa o campo (`z.string().datetime({ offset: true }).nullable().optional()`). Corpo de `CreateClassGroupRoute`:

```ts
const DateTimeOrNull = z.string().datetime({ offset: true }).nullable().optional();
const toDate = (value: string | null | undefined) => (value === undefined ? undefined : value === null ? null : new Date(value));

const CreateClassGroupBodySchema = z.object({
  courseId: z.string().uuid(),
  academicPeriodId: z.string().uuid(),
  code: z.string().trim().min(1),
  teacherName: z.string().trim(),
  slots: z.array(WeeklySlotSchema).min(1),
  capacity: z.number().int().positive(),
  startsOn: DateTimeOrNull,
  endsOn: DateTimeOrNull,
  enrollmentOpensAt: DateTimeOrNull,
  enrollmentClosesAt: DateTimeOrNull,
  publish: z.boolean(),
});
```

(`DateTimeOrNull` e `toDate` vão para `CatalogSchemas.ts` e são reusados pelo PATCH.) Respostas de erro declaradas por rota: 404/409/422 conforme os erros que o usecase pode lançar.

`GetClassGroupRoute` reusa `ListClassGroupsQuery.run({ id })` e responde 404 (`CatalogClassGroupNotFoundError`) se vazio.

- [ ] **Step 4: Container + app.ts**

Mesmo procedimento da Task 5: repositórios `academicPeriod`, `classGroup`, `waitlist`; usecases `catalog.{createPeriod, updatePeriod, duplicatePeriod, createClassGroup, updateClassGroup, advanceClassGroupStatus, joinWaitlist, leaveWaitlist}`; queries `listPeriods, listClassGroups, listWaitlist`; registrar as 12 rotas.

- [ ] **Step 5: Ver passar**

Run: `pnpm --filter @ooc/api test && pnpm --filter @ooc/api test:db && pnpm typecheck:api && pnpm --filter @ooc/api lint` → PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src
git commit -m "feat(api): expose period, class group and waitlist routes under /catalog"
```

---

### Task 14: Backoffice — lista de turmas real, períodos, duplicar, criar turma

**Files:**
- Modify: `apps/app/src/lib/backoffice/types.ts` (`ClassGroupItem`, `AcademicPeriodItem`, `WeeklySlot` reexport, `ClassGroupStatus` + `'draft'`)
- Modify: `apps/app/src/lib/backoffice/catalog.ts` (`listCatalogPeriods`, `listCatalogClassGroups`, `getCatalogClassGroup`, `listCatalogWaitlist`)
- Modify: `apps/app/src/components/backoffice/status-tone.ts` (`draft: 'neutral'`)
- Rewrite: `.../class-groups/class-groups-view.tsx`
- Modify: `.../class-groups/page.tsx`
- Create: `.../class-groups/period-bar.tsx` (seletor + novo período + copiar turmas)
- Create: `.../class-groups/class-group-form.tsx` (criar e editar — compartilhado com a Task 15)
- Create: `apps/app/src/lib/backoffice/schedule.ts` (formatação de `slots` para o painel)
- Modify: messages (`class_groups`, `class_group_status.draft`, bloco `periods`)

**Interfaces:**
- Consumes: rotas da Task 13; `catalogWrite`; `lima-date`; `scheduleLines` de `@/lib/enrollment/schedule`.
- Produces:
  - `ClassGroupItem` (mesmo shape da API), `AcademicPeriodItem = { id; name; startsOn; endsOn; active; classGroupCount }`
  - `listCatalogPeriods(): Promise<AcademicPeriodItem[] | null>`, `listCatalogClassGroups(periodId?: string): Promise<ClassGroupItem[] | null>`, `getCatalogClassGroup(id): Promise<ClassGroupItem | null>`
  - `ClassGroupForm({ mode: 'create' | 'edit'; courses: CourseRow[]; periods: AcademicPeriodItem[]; initial?: ClassGroupItem; onDone(id: string): void; onCancel(): void })`
  - `slotsLabel(slots, t)` em `lib/backoffice/schedule.ts`

- [ ] **Step 1: Tipos**

Em `types.ts`: `ClassGroupStatus` passa a incluir `'draft'` (primeiro da união). Isso quebra `Record<ClassGroupStatus, …>` existentes (`classGroupTone` e qualquer outro) — corrigir cada um apontado pelo `tsc`, sempre acrescentando `draft`. Acrescentar:

```ts
export interface WeeklySlotItem {
  weekday: Weekday
  startTime: string
  endTime: string
}

/** A class group as the catalog API answers it (OOC-35). */
export interface ClassGroupItem {
  id: string
  code: string
  courseId: string
  courseName: string
  language: string
  courseActive: boolean
  academicPeriodId: string
  academicPeriodName: string
  teacherName: string
  slots: WeeklySlotItem[]
  /** Null only on a draft. */
  startsOn: string | null
  endsOn: string | null
  enrollmentOpensAt: string | null
  enrollmentClosesAt: string | null
  capacity: number
  seatsTaken: number
  status: ClassGroupStatus
  active: boolean
  waitlistCount: number
}

export interface AcademicPeriodItem {
  id: string
  name: string
  startsOn: string
  endsOn: string
  active: boolean
  classGroupCount: number
}

export interface WaitlistItem {
  id: string
  studentId: string
  studentName: string
  nationalIdType: NationalIdType
  nationalId: string
  joinedAt: string
}
```

(`NationalIdType` — usar o tipo já existente em `types.ts`; procurar o nome exato.)

- [ ] **Step 2: Leituras server-side**

Em `lib/backoffice/catalog.ts`, mesmo formato de `listCatalogCourses` (try/catch, `null` em falha):
- `listCatalogPeriods()` → `GET /api/v1/catalog/periods` → `items`
- `listCatalogClassGroups(periodId?)` → `GET /api/v1/catalog/class-groups${periodId ? `?periodId=${encodeURIComponent(periodId)}` : ''}` → `items`
- `getCatalogClassGroup(id)` → `GET /api/v1/catalog/class-groups/:id`
- `listCatalogWaitlist(id)` → `GET /api/v1/catalog/class-groups/:id/waitlist` → `items`

- [ ] **Step 3: Horário**

`lib/backoffice/schedule.ts`:

```ts
import { scheduleLines } from '@/lib/enrollment/schedule'
import type { WeeklySlotItem } from './types'

type Translate = (key: string, values?: Record<string, string>) => string

/**
 * A class group's week in one line for a table cell — "Lun 18–19:30 · Mié
 * 18–19:30". Built on the checkout's own formatter so both screens say the
 * same hours the same way; words (weekday, range connector) come from the
 * locale.
 */
export function slotsLabel(slots: WeeklySlotItem[], t: Translate): string {
  return scheduleLines(
    { slots },
    (day) => t(`weekday.${day}`),
    (vars) => t('class_groups.time_range', vars),
  )
    .map((line) => `${line.day} ${line.time}`)
    .join(' · ')
}
```

- [ ] **Step 4: Mensagens**

Nos três locales:
- `class_group_status.draft`: es-PE "Borrador", pt-BR "Rascunho", en "Draft".
- Em `class_groups`: remover `created_local_only`; acrescentar `time_range` (es-PE `"{start}–{end}"`, pt-BR `"{start}–{end}"`, en `"{start}–{end}"`), `load_error_title`/`load_error_body` (mesmos textos de cursos trocando "cursos" por "aulas"/"turmas"/"class groups"), `field_end_time` ("Hasta"/"Até"/"Until"), `field_window_opens` ("Matrícula abre"/"Inscrições abrem"/"Enrollment opens"), `field_window_closes` ("Matrícula cierra"/"Inscrições fecham"/"Enrollment closes"), `window_hint` ("Vacío = sin límite de ese lado."/"Vazio = sem limite desse lado."/"Empty = no limit on that side."), `save_draft` ("Guardar borrador"/"Salvar rascunho"/"Save draft"), `open_enrollment` ("Abrir matrícula"/"Abrir inscrições"/"Open enrollment"), `created_draft` ("Aula guardada como borrador"/"Turma salva como rascunho"/"Class group saved as a draft"), `created_open` ("Aula abierta para matrícula"/"Turma aberta para inscrições"/"Class group open for enrollment"), `missing_to_publish` ("Falta para abrir la matrícula: fechas de inicio y término."/"Falta para abrir as inscrições: datas de início e término."/"Missing to open enrollment: start and end dates."), `no_courses` ("Crea un curso antes de abrir un aula."/"Crie um curso antes de abrir uma turma."/"Create a course before opening a class group."), `no_periods` ("Crea un período antes de abrir un aula."/"Crie um período antes de abrir uma turma."/"Create a period before opening a class group."), `waitlist_count` (`"{count, plural, one {# en espera} other {# en espera}}"` / `"{count, plural, one {# na espera} other {# na espera}}"` / `"{count, plural, one {# waiting} other {# waiting}}"`), `no_dates` ("Sin fechas"/"Sem datas"/"No dates"), `retired` ("Fuera de catálogo"/"Fora do catálogo"/"Off the catalog"), `course_off_catalog` ("Curso fuera de catálogo"/"Curso fora do catálogo"/"Course off the catalog").
- Novo bloco `periods`: `label` ("Período"/"Período"/"Period"), `new` ("Nuevo período"/"Novo período"/"New period"), `name` ("Nombre"/"Nome"/"Name"), `name_placeholder` ("Ciclo 2027-I"/"Ciclo 2027-I"/"Cycle 2027-I"), `starts` ("Inicio"/"Início"/"Start"), `ends` ("Término"/"Término"/"End"), `copy_from` ("Copiar aulas de"/"Copiar turmas de"/"Copy class groups from"), `copy_none` ("No copiar"/"Não copiar"/"Don't copy"), `copy_hint` ("Las aulas llegan como borrador: sin fechas, sin matriculados y con las mismas vacantes."/"As turmas chegam como rascunho: sem datas, sem matriculados e com as mesmas vagas."/"Class groups arrive as drafts: no dates, nobody enrolled, same capacity."), `create` ("Crear período"/"Criar período"/"Create period"), `cancel` ("Cancelar"/"Cancelar"/"Cancel"), `copied` (`"{copied, plural, =0 {Período creado. No había aulas para copiar.} one {Período creado con # aula en borrador.} other {Período creado con # aulas en borrador.}}{skipped, plural, =0 {} other { # fuera de catálogo no se copiaron.}}"` — e equivalentes pt-BR/en com a mesma estrutura ICU), `created` ("Período creado"/"Período criado"/"Period created"), `copy_into_existing` ("Copiar aulas a este período"/"Copiar turmas para este período"/"Copy class groups into this period"), `empty` ("Todavía no hay períodos."/"Ainda não há períodos."/"No periods yet.").

Rodar a checagem de chaves dos três locales.

- [ ] **Step 5: `PeriodBar`**

`period-bar.tsx` (client): props `periods: AcademicPeriodItem[]`, `selectedId: string | null`, `canManage: boolean`. Renderiza `<select>` dos períodos (nome + `formatDateRange(startsOn, endsOn, locale)`); `onChange` faz `router.push(`/backoffice/class-groups?period=${id}`)` (usar o `useRouter` de `@/i18n/navigation` se for o que o resto do backoffice usa para navegação com locale; conferir em outra tela que troca query string). Com `canManage`: botão "Nuevo período" abre formulário inline (nome, `type="date"` início/término, `<select>` "Copiar aulas de" com `copy_none` + períodos existentes, hint `copy_hint`). Submit:

```tsx
    const created = await catalogWrite('/periods', 'POST', {
      name: name.trim(),
      startsOn: limaDateToIso(startsOn),
      endsOn: limaDateToIso(endsOn),
    })
    if (!created.ok) return fail(created.error)
    if (copyFrom) {
      const copied = await catalogWrite<{ copied: number; skippedRetired: number }>(
        `/periods/${created.data.id}/duplicate`,
        'POST',
        { sourcePeriodId: copyFrom },
      )
      if (!copied.ok) return fail(copied.error) // the period exists; the message says what failed
      notify(t('periods.copied', { copied: copied.data.copied, skipped: copied.data.skippedRetired }))
    } else {
      notify(t('periods.created'))
    }
    router.push(`/backoffice/class-groups?period=${created.data.id}`)
    router.refresh()
```

Também, para o período selecionado sem turmas e com `canManage`, um botão `periods.copy_into_existing` que abre só o seletor de origem e chama o `duplicate` (cobre o caso de o segundo passo ter falhado depois de criar o período). Botão de envio desabilitado enquanto salva; erro em `role="alert"` com `catalog_errors.*`.

- [ ] **Step 6: `ClassGroupForm`**

`class-group-form.tsx` (client), usado para criar (aqui) e editar (Task 15). Campos:
- curso (`<select>` só com cursos `active`; em `edit`, desabilitado se `initial.status !== 'draft' || initial.seatsTaken > 0`);
- período (`<select>`, só em `create`; padrão = período selecionado na tela);
- código (texto, obrigatório), docente (texto livre);
- dias (toggles dos 7 `Weekday`, como o formulário atual faz), hora início e hora fim (`<select>` HH + MM como o atual `HOURS`/`MINUTES`); viram `slots = weekdays.map(weekday => ({ weekday, startTime, endTime }))` — exigir `startTime < endTime` e ao menos um dia;
- início/término (`type="date"`), janela abre/fecha (`type="datetime-local"`, com hint `window_hint`);
- vagas (`type="number"`, min 1).

Envio em `create`:

```tsx
  const body = {
    courseId,
    academicPeriodId,
    code: code.trim(),
    teacherName: teacherName.trim(),
    slots,
    capacity,
    startsOn: startsOn ? limaDateToIso(startsOn) : null,
    endsOn: endsOn ? limaDateToIso(endsOn) : null,
    enrollmentOpensAt: opensAt ? limaDateTimeToIso(opensAt) : null,
    enrollmentClosesAt: closesAt ? limaDateTimeToIso(closesAt) : null,
  }
  const result = await catalogWrite<{ id: string; status: ClassGroupStatus }>('/class-groups', 'POST', { ...body, publish })
```

Dois botões: `save_draft` (`publish: false`) e `open_enrollment` (`publish: true`, desabilitado sem `startsOn && endsOn`). Em `edit`: um botão salvar que manda `PATCH /class-groups/:id` só com os campos que mudaram em relação a `initial` (datas `null` quando apagadas). Em sucesso chama `onDone(id)`; em erro mostra `catalog_errors.*`. Inicialização em `edit`: `isoToLimaDate`/`isoToLimaDateTime` para preencher os inputs; dias/horas a partir de `initial.slots` (todos os slots com o mesmo horário — se os slots tiverem horários diferentes, mostrar os dias e o horário do primeiro e avisar? **Não**: manter simples — o formulário edita "dias + um horário"; se a turma tiver horários diferentes por dia, o formulário reescreve todos com o horário escolhido. Documentar isso no comentário do componente.)

- [ ] **Step 7: `ClassGroupsView` reescrito**

Reescrever `class-groups-view.tsx` com props `{ items: ClassGroupItem[]; courses: CourseRow[]; periods: AcademicPeriodItem[]; selectedPeriodId: string | null; canManage: boolean }`. Manter do arquivo atual o que continua valendo: `Toolbar` com busca, `FiltersDropdown` com filtro de **idioma** e **status** (o de docente sai — é texto livre agora; o de período sai — virou `PeriodBar`), divisão em "ativas" (`draft`, `enrolling`, `in_progress`) e "fechadas" (`finished`, `closed`) com paginação das fechadas (`CLOSED_PAGE_SIZE`), dobra por idioma. Remover: `teacherId`, `modality`, `pendingCertificates`, `codePrefix`, sorteio de código, `created`/`created_local_only`, o `NewClassGroupForm` interno (substituído por `ClassGroupForm`). Colunas: aula (curso + código), docente, horário (`slotsLabel`), datas (`formatDateRange` ou `class_groups.no_dates`), vagas (`seatsTaken/capacity` + `waitlist_count` quando > 0), status (`StatusBadge` com `classGroupTone`, mais `class_groups.retired` se `!active` e `course_off_catalog` se `!courseActive`). Linha clicável → `/backoffice/class-groups/:id` (mesmo `Link` do arquivo atual). Busca em memória sobre `courseName`, `code`, `teacherName`. Criar: botão `new_class_group` (só `canManage`) abre `ClassGroupForm mode="create"`; se `courses.filter(c => c.active).length === 0` mostra `no_courses`; se `periods.length === 0` mostra `no_periods`. `onDone` → toast `created_draft`/`created_open` e `router.refresh()`. `TableShell columns` com os títulos na mesma ordem das células (regra de celular do `apps/app/CLAUDE.md`).

- [ ] **Step 8: `page.tsx`**

```tsx
  const { period } = await searchParams // searchParams: Promise<{ group?: string; period?: string }>
  ...
  if (restricted) { /* teacher branch unchanged — still mock until Sessão 36 */ }
  if (!canBrowseCatalog(staff.role)) notFound()

  const [periods, courses] = await Promise.all([listCatalogPeriods(), listCatalogCourses()])
  const selectedPeriodId = period ?? periods?.find((item) => item.active)?.id ?? periods?.[0]?.id ?? null
  const items = periods && courses ? await listCatalogClassGroups(selectedPeriodId ?? undefined) : null
```

Se `items === null` (ou `periods`/`courses` nulos): `EmptyState` de erro (`class_groups.load_error_*`). Senão `<PeriodBar ... />` + `<ClassGroupsView ... canManage={canCreateClassGroup(staff.role)} />`. Remover os imports de mock que sobrarem (manter `listClassGroupRostersFor` só no ramo do docente). Atualizar o comentário de topo (não roda mais "without a backend").

- [ ] **Step 9: Verificar**

Run: `pnpm typecheck:app && pnpm --filter @ooc/app lint` + checagem dos locales.
Manual: com `master`, criar período "Ciclo X" → criar turma rascunho → abrir matrícula → aparece no checkout público (`/matricula`) se o curso tiver plano com preço; criar "Ciclo Y" copiando de "Ciclo X" → toast com contagem; turmas de Y em rascunho, sem datas, vagas 0/capacidade; tentar copiar de novo pelo `copy_into_existing` → mensagem `period_already_duplicated`.

- [ ] **Step 10: Commit**

```bash
git add apps/app/src
git commit -m "feat(app): real class group list with periods, drafts and period duplication"
```

---

### Task 15: Backoffice — detalhe da turma, ciclo de vida, edição, lista de espera, RBAC, matrícula manual

**Files:**
- Modify: `.../class-groups/[classGroupId]/page.tsx`
- Create: `.../class-groups/[classGroupId]/class-group-actions.tsx` (próximo passo de status + editar)
- Create: `.../class-groups/[classGroupId]/waitlist-card.tsx`
- Modify: `apps/app/src/lib/backoffice/permissions.ts` (`canCreateClassGroup` sem `academic_supervisor`)
- Modify: `apps/app/src/app/[locale]/backoffice/(panel)/layout.tsx` (item "academic" só com `canBrowseCatalog`)
- Modify: `.../enrollments/new-enrollment-form.tsx` (horário por `slots`; pré-seleção por query)
- Modify: messages (`class_group`, bloco `waitlist`, `class_group_actions`)

**Interfaces:**
- Consumes: `getCatalogClassGroup`, `listCatalogWaitlist`, `listCatalogCourses`, `ClassGroupForm`, `catalogWrite`, `slotsLabel`.
- Produces: `ClassGroupActions({ group: ClassGroupItem; courses: CourseRow[]; canManage: boolean })`, `WaitlistCard({ group: ClassGroupItem; entries: WaitlistItem[]; canManage: boolean; canEnroll: boolean })`

- [ ] **Step 1: RBAC (skill `rbac-role-change`)**

Invocar o skill `rbac-role-change` e seguir o checklist dele para a mudança "`academic_supervisor` deixa de poder abrir turma na UI". Mudança em si:

```ts
/**
 * Who opens and runs class groups — the same roles the API declares on every
 * catalog write (CLAUDE.md §1, "quem abre turma é admin/enrollment_supervisor").
 * The academic supervisor follows the teachers, not the catalog.
 */
export function canCreateClassGroup(role: StaffRole): boolean {
  return isManagement(role) || role === 'enrollment_supervisor'
}
```

No `(panel)/layout.tsx`, o item `academic` do staff (não-docente) passa a exigir `canBrowseCatalog(staff.role)` além da flag (`billing` deixa de ver um link que daria 404). Conferir como o layout obtém o papel (variável `staff` ou similar) e importar `canBrowseCatalog`.

- [ ] **Step 2: Mensagens**

- `class_group_actions`: `advance_enrolling` ("Abrir matrícula"/"Abrir inscrições"/"Open enrollment"), `advance_in_progress` ("Iniciar clases"/"Iniciar aulas"/"Start classes"), `advance_finished` ("Finalizar clases"/"Finalizar aulas"/"Finish classes"), `advance_closed` ("Cerrar aula"/"Encerrar turma"/"Close class group"), `confirm_enrolling` ("El aula aparecerá en la matrícula dentro de su ventana."/"A turma vai aparecer na matrícula dentro da janela."/"The class group will appear at enrollment within its window."), `confirm_in_progress` ("La matrícula pública deja de ofrecer esta aula."/"A matrícula pública deixa de oferecer esta turma."/"Public enrollment stops offering this class group."), `confirm_finished` ("Las clases terminaron; los certificados quedan pendientes."/"As aulas terminaram; os certificados ficam pendentes."/"Classes are over; certificates are still owed."), `confirm_closed` ("Todos los certificados que correspondían ya se emitieron."/"Todos os certificados devidos já foram emitidos."/"Every certificate owed has been issued."), `confirm` ("Confirmar"/"Confirmar"/"Confirm"), `cancel` ("Cancelar"/"Cancelar"/"Cancel"), `edit` ("Editar aula"/"Editar turma"/"Edit class group"), `saved` ("Cambios guardados"/"Alterações salvas"/"Changes saved"), `status_changed` ("Estado actualizado"/"Status atualizado"/"Status updated"), `forward_only` ("El estado solo avanza. Un aula abierta por error se saca del catálogo."/"O status só avança. Turma aberta por engano sai do catálogo."/"Status only moves forward. A class group opened by mistake is taken off the catalog.").
- `waitlist`: `title` ("Lista de espera"/"Lista de espera"/"Waitlist"), `empty` ("Nadie en espera."/"Ninguém na espera."/"Nobody waiting."), `add` ("Agregar a la espera"/"Adicionar à espera"/"Add to waitlist"), `search_placeholder` ("Nombre o documento del alumno"/"Nome ou documento do aluno"/"Student name or ID"), `joined_on` ("Desde el {date}"/"Desde {date}"/"Since {date}"), `remove` ("Retirar"/"Retirar"/"Remove"), `reason_withdrawn` ("El alumno desistió"/"O aluno desistiu"/"Student withdrew"), `reason_removed_by_staff` ("Retirado por la coordinación"/"Retirado pela coordenação"/"Removed by staff"), `seat_free` (`"{count, plural, one {Se liberó # vacante.} other {Se liberaron # vacantes.}}"` / `"{count, plural, one {Abriu # vaga.} other {Abriram # vagas.}}"` / `"{count, plural, one {# seat opened up.} other {# seats opened up.}}"`), `enroll_first` ("Matricular a {name}"/"Matricular {name}"/"Enroll {name}"), `added` ("Alumno agregado a la espera"/"Aluno adicionado à espera"/"Student added to the waitlist"), `removed` ("Alumno retirado de la espera"/"Aluno retirado da espera"/"Student removed from the waitlist"), `only_when_full` ("La espera se abre cuando el aula se llena."/"A espera abre quando a turma lota."/"The waitlist opens once the class group is full.").
- `class_group`: acrescentar `field_window` ("Ventana de matrícula"/"Janela de inscrição"/"Enrollment window"), `window_open_ended` ("Sin límite"/"Sem limite"/"No limit"), `mock_section_note` ("Notas y certificados todavía no están conectados: esta sección es una vista previa."/"Notas e certificados ainda não estão conectados: esta seção é uma prévia."/"Grades and certificates aren't connected yet: this section is a preview.").
- `catalog_errors.waitlist_entry_not_found` (es-PE "Ese registro de espera ya no existe.", pt-BR "Esse registro de espera não existe mais.", en "That waitlist entry no longer exists.") — e acrescentar `'waitlist_entry_not_found'` a `CatalogErrorKey` e a `KNOWN`.

- [ ] **Step 3: Detalhe da turma**

`[classGroupId]/page.tsx`:
- Ramo do docente (`isRestrictedToOwnClassGroups`) continua usando `getClassGroupFor(staff, id)` do mock, inalterado.
- Demais papéis: `if (!canBrowseCatalog(staff.role)) notFound()`; `const group = await getCatalogClassGroup(classGroupId); if (!group) notFound()`; `const [waitlist, courses] = await Promise.all([listCatalogWaitlist(group.id), listCatalogCourses()])`.
- Cabeçalho real: curso, `language · academicPeriodName`, `StatusBadge` do status (+ `retired`/`course_off_catalog`), campos `field_code`, `field_teacher`, `field_schedule` (`slotsLabel`), `field_start`/`field_end` (`formatDate` ou `no_dates`), `field_window` (abre/fecha com `formatDateTime` ou `window_open_ended`), vagas com `Meter` (`seatPressureTone`).
- `<ClassGroupActions group={group} courses={courses ?? []} canManage={canCreateClassGroup(staff.role) && group.active} />`.
- `<WaitlistCard group={group} entries={waitlist ?? []} canManage={canCreateClassGroup(staff.role)} canEnroll={canCreateEnrollment(staff.role)} />` — renderizar só se `group.seatsTaken >= group.capacity || (waitlist?.length ?? 0) > 0`.
- Seção de certificados/roster: continua com o mock atual, **só** se houver dado mock para o id (para id real não há; então a seção some) — mais simples: remover `ClassGroupCertificates` da rota real e deixar uma nota `mock_section_note`? **Decisão:** a seção de certificados lê do mock por `getClassGroupFor`; para um id real ela não existe — então não renderizar nada de certificados no ramo real e não mostrar nota. O prazo de certificado (`addBusinessDays`) só aparece quando `group.status` é `finished` e `endsOn` existe (cálculo continua no servidor, como hoje).

- [ ] **Step 4: `ClassGroupActions`**

Client component:
- Se `canManage` e `NEXT[group.status]` (mesmo mapa do domínio, copiado em `lib/backoffice/class-group-status.ts` como `NEXT_CLASS_GROUP_STATUS: Record<ClassGroupStatus, ClassGroupStatus | null>`): botão `class_group_actions.advance_<next>`; ao clicar, confirmação inline com `confirm_<next>` e botões confirmar/cancelar; confirmar → `catalogWrite(`/class-groups/${group.id}/status`, 'POST', { to: next })` → toast `status_changed` + `router.refresh()`; erro → `catalog_errors.*`.
- Em `draft` sem datas: `class_groups.missing_to_publish` e botão de avançar desabilitado.
- Nota `forward_only` em texto pequeno.
- Botão `edit` abre `ClassGroupForm mode="edit" initial={group}` numa `Sheet` lateral; `onDone` → toast `saved` + `router.refresh()`.

- [ ] **Step 5: `WaitlistCard`**

Client component:
- Lista FIFO: posição, nome, documento (`national_id_type` resolvido pelo locale existente `bo.national_id_type.*`), `joined_on`; com `canManage`, botão `remove` abre escolha de motivo (`reason_withdrawn` / `reason_removed_by_staff`) → `catalogWrite(`/waitlist/${entry.id}/leave`, 'POST', { reason })`.
- `add` (só `canManage` e turma lotada; senão `only_when_full`): campo de busca que chama `fetch(`/api/v1/students?q=${encodeURIComponent(q)}`)` com debounce de 300 ms (ver o formato de resposta em `lib/backoffice/students.ts`: `{ items }`), lista resultados, clique → `catalogWrite(`/class-groups/${group.id}/waitlist`, 'POST', { studentId })`.
- Aviso no topo quando `group.capacity - group.seatsTaken > 0 && entries.length > 0`: `seat_free` com a contagem + (se `canEnroll`) link `enroll_first` com o nome do primeiro → `/backoffice/enrollments/new?student=<studentId>&classGroup=<group.id>` (conferir a rota real do formulário de matrícula manual em `enrollments/`; usar o `Link` de `@/i18n/navigation`).
- Toda escrita → toast + `router.refresh()`.

- [ ] **Step 6: Matrícula manual**

Em `enrollments/new-enrollment-form.tsx`:
- O tipo do item do seletor (linha ~65) ganha `slots: { weekday: Weekday; startTime: string; endTime: string }[]`; o rótulo (linhas ~363 e ~373) passa a usar `item.slots.length > 0 ? slotsLabel(item.slots, t) : item.schedule` (precisa de `t` com namespace `bo` — conferir o namespace usado no arquivo e ajustar a chamada de `slotsLabel` para receber um `t` que resolva `weekday.*` e `class_groups.time_range`).
- Pré-seleção: se a página recebe `?student=` e `?classGroup=`, iniciar o formulário com esses valores (ver como a página monta o formulário e se já existe pré-seleção de aluno; seguir o mesmo mecanismo). Se a turma pré-selecionada não estiver na lista aberta (sem vaga ainda), ignorar o parâmetro.

- [ ] **Step 7: Verificar**

Run: `pnpm typecheck:app && pnpm --filter @ooc/app lint` + checagem dos locales.
Manual: turma `draft` → editar e pôr datas → "Abrir matrícula" → confirmar → status muda; tentar reduzir vagas abaixo das ocupadas → mensagem `capacity_below_seats_taken`; lotar uma turma (capacidade = ocupadas), adicionar aluno à espera, aumentar vagas → aviso "Se liberó 1 vacante" + "Matricular a …" → matrícula manual pré-preenchida → depois de matricular, a pessoa sai da fila. Entrar como `academic_supervisor`: lista abre, sem botões de criar/editar; como `billing`: item de menu some, URL dá 404.

- [ ] **Step 8: Commit**

```bash
git add apps/app/src
git commit -m "feat(app): class group detail with lifecycle, edits and the waitlist"
```

---

### Task 16: Docs do PR 2 + verificação final + PR

**Files:**
- Modify: `CLAUDE.md` (raiz, §1)
- Modify: `apps/api/CLAUDE.md` (vagas: rascunho nunca toma vaga; capacidade com UPDATE condicional; espera)
- Modify: `packages/db/CLAUDE.md` (migration 0018)
- Modify: `README.md` ("Estado atual", tabela de integração)
- Modify: `docs/superpowers/specs/2026-10-01-catalog-crud-design.md` (registrar os desvios da seção "Desvios assumidos")

- [ ] **Step 1: Docs**

- `CLAUDE.md` raiz, §1, ao lado de "Data de início e horário são escolhas separadas": um item novo "**Turma nasce rascunho e avança por mão (OOC-35, 01/10/2026).**" dizendo: rascunho fica fora do checkout e da matrícula manual; publicar exige datas; janela de inscrição opcional (vazio = sem limite); status só avança, um passo por vez, sempre por uma pessoa (`draft → enrolling → in_progress → finished → closed`); duplicar período copia curso, horário, código, docente e capacidade, e zera datas, janela e vagas ocupadas, sem matrícula, espera ou hold; lista de espera é manual no backoffice e a matrícula manual fecha a entrada; espera no checkout continua Sessão 22. Também ajustar a lista de quem abre turma se ela citar `academic_supervisor` em algum lugar.
- `apps/api/CLAUDE.md`, seção Vagas: rascunho fica fora do UPDATE atômico (`status <> 'draft'`); redução de capacidade é UPDATE condicional `seats_taken <= capacidade nova`; `sellableClassGroup()` é a definição única de "à venda".
- `packages/db/CLAUDE.md`: menção à `0018` (datas anuláveis só em rascunho via CHECK; índice único parcial da espera).
- `README.md`: Turmas deixa de ser mock (lista, períodos, duplicar, criar/editar, ciclo de vida, espera); continua mock: visão do docente, roster/certificados/notas.
- Spec: acrescentar seção "Ajustes feitos no plano" com os 5 desvios.
- **ROADMAP:** não editar. No resumo final para o usuário, sinalizar: Sessão 35 cumpre o critério; Sessão 22 (espera no checkout) continua aberta; Sessão 36 (docentes) continua sendo pré-requisito da visão do docente.

- [ ] **Step 2: Verificação completa**

Run (tudo verde, sem exceção):
```
pnpm typecheck:domain && pnpm typecheck:db && pnpm typecheck:api && pnpm typecheck:app
pnpm lint
pnpm --filter @ooc/api test
pnpm --filter @ooc/api test:db
pnpm --filter @ooc/db test
pnpm build:app
```

- [ ] **Step 3: Commit e PR**

```bash
git add CLAUDE.md apps/api/CLAUDE.md packages/db/CLAUDE.md README.md docs/superpowers/specs
git commit -m "docs: record draft class groups, period duplication and the manual waitlist"
```

Confirmar com o usuário antes de `git push` / `gh pr create`. Título: `feat: real class group CRUD with drafts, duplication and waitlist (OOC-35)`.
