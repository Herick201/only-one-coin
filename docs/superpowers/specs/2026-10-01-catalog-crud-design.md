# CRUD real de cursos (OOC-36) e turmas (OOC-35) — desenho

Data: 01/10/2026 · Branch: `tech/ooc-35-36-catalog-crud`

## Objetivo

As telas de cursos (`/backoffice/courses`) e turmas (`/backoffice/class-groups`)
leem de `apps/app/src/lib/backoffice/mock-data.ts` e criam registro só em
estado local. Nada em `apps/api` escreve catálogo além de aposentar/reativar
(`POST /catalog/:kind/:id/retire|restore`, decisão 22/09/2026). Este trabalho
põe a escrita de catálogo de pé, de ponta a ponta.

**Critérios de pronto**

- **OOC-36:** criar um curso pelo backoffice o torna imediatamente disponível
  pra abrir turma sobre ele.
- **OOC-35:** duplicar um período cria as turmas novas com datas e vagas
  zeradas, sem carregar matrícula do período antigo.

**Entrega:** um spec, dois PRs. **OOC-36 primeiro** — o critério do OOC-35
(abrir turma sobre curso criado no painel) depende dele.

## Decisões fechadas nesta sessão

| Tema | Decisão |
| --- | --- |
| Turma duplicada | Nasce em status novo **`draft`**, com `starts_on`/`ends_on` **nulos** (colunas viram anuláveis). Fica fora do checkout e da matrícula manual até ser publicada |
| Janela de inscrição | `enrollment_opens_at` / `enrollment_closes_at`, **ambas opcionais**; vazio = sem limite daquele lado. A turma é vendável quando `status = enrolling` e agora está dentro da janela |
| Lista de espera | **Só backoffice, manual.** Staff põe aluno já cadastrado na espera de turma lotada, vê a fila FIFO, retira com motivo. Vagou: o painel avisa e staff abre matrícula manual pro primeiro. Checkout público oferecendo espera continua na Sessão 22 do ROADMAP |
| Campos do curso sem coluna | Persistir os quatro: `summary`, `certificate_rule`, `allows_freeze`, `allows_transfer` |
| Preços | Criar plano e lançar preço: **só `master`/`admin`**. Preço novo é sempre INSERT com `valid_from` = agora **ou data futura**; nunca no passado. `enrollment_supervisor` lê |
| "Encerrar turma" | **Avançar o ciclo de vida manualmente**, um passo por vez: `draft → enrolling → in_progress → finished → closed`. Nada muda sozinho por data. Parar de vender antes da hora = fechar a janela; turma errada = aposentar (já existe) |
| Duplicar — o que é copiado | Curso, `slots`, `schedule`, `code`, `teacher_name` e **capacidade (cupos)**. Zerados: `seats_taken = 0`, datas e janela nulas, status `draft`. Turma aposentada ou de curso aposentado não é copiada. Nenhuma matrícula, entrada de espera ou hold vem junto |
| RBAC — abrir turma | `canCreateClassGroup` **perde `academic_supervisor`**, alinhando a UI ao `CLAUDE.md` raiz e às rotas (`master`, `admin`, `enrollment_supervisor`) |

**Fora deste trabalho:** tabela `teachers` e `teacher_id` (Sessão 36,
Docentes) — o docente da turma continua texto livre em `teacher_name`;
modalidade mensual do inglês (nada no schema a modela hoje — plano é nome +
preço); lista de espera no checkout público (Sessão 22); rate limit (Sessão 25 —
as rotas novas ficam sem política, como as atuais, com o mesmo comentário);
notas, certificados e roster reais (Sessões 37/38).

## 1. Modelo de dados — migration `0017` (aditiva)

**`courses`**

- `summary text not null default ''`
- `certificate_rule text not null default 'automatic'`, CHECK
  `in ('automatic', 'exam_required')`
- `allows_freeze boolean not null default true`
- `allows_transfer boolean not null default false`

"Ativo" continua sendo `deleted_at is null`.

**`class_groups`**

- `starts_on`, `ends_on`: `drop not null`.
- CHECK de status passa a aceitar `draft`.
- CHECK novo: `status = 'draft' or (starts_on is not null and ends_on is not null)`.
- `enrollment_opens_at timestamptz null`, `enrollment_closes_at timestamptz null`,
  CHECK `enrollment_opens_at is null or enrollment_closes_at is null or enrollment_opens_at < enrollment_closes_at`.
- `source_class_group_id uuid null references class_groups(id) on delete restrict`
  — rastro de "duplicada de"; é também o que barra duplicar duas vezes.

**`waitlist_entries`**

- `left_at timestamptz null`, `left_reason text null`, CHECK
  `left_reason in ('enrolled', 'withdrawn', 'removed_by_staff')` e CHECK de
  coerência (`left_at` e `left_reason` juntos ou nenhum).
- O índice único `(class_group_id, student_id)` vira **parcial**
  (`where left_at is null`): quem saiu pode voltar à fila depois. Sem delete,
  sem `deleted_at`.

**`plan_prices`** — schema igual. A trava da `0011` (sem grant de UPDATE/DELETE
pro `ooc_app` + trigger que recusa também pro dono) **passa a cobrir
`plan_prices`**: "preço versionado, nunca editado" deixa de ser só convenção.
`packages/db/tests/privileges.test.ts` ganha o caso.

**Leituras que mudam de comportamento**

- `GET /catalog` (checkout público) e `GET /class-groups` (seletor da matrícula
  manual) exigem `status = 'enrolling'` **e** agora dentro da janela (quando
  houver) **e** período não aposentado. `draft` não aparece em nenhum dos dois.
  O contrato de resposta não muda.

## 2. Domínio e API

### Domínio — `packages/domain/src/catalog/`

| Entidade | Invariantes |
| --- | --- |
| `Course` | `minAge > 0`, `modules > 0`, `totalHours >= 0`, `certificateRule ∈ {automatic, exam_required}` |
| `Plan` / `PlanPrice` | `amountCents > 0` inteiro; `validFrom` não pode estar no passado (tolerância de poucos segundos pro "agora"); histórico nunca reescrito |
| `AcademicPeriod` | `startsOn < endsOn` |
| `ClassGroup` | Máquina de estados, só para a frente e um passo por vez; sair de `draft` exige datas + capacidade; `capacity >= seatsTaken`; `courseId` só muda em `draft`; `startsOn < endsOn` quando ambas existem |
| `WaitlistEntry` | Só entra em turma lotada (`seatsTaken >= capacity`); aluno cadastrado e sem matrícula viva na turma; sem entrada ativa duplicada |

Usecases (toda escrita grava no `audit_log`; ações `catalog.<entidade>.<verbo>`):

- **Curso:** `CreateCourse`, `UpdateCourse`. Desativar/reativar = `RetireCatalogEntry`/`RestoreCatalogEntry` existentes.
- **Plano e preço:** `CreatePlan` (plano + preço inicial, mesma transação), `RenamePlan`, `SchedulePlanPrice` (INSERT).
- **Período:** `CreateAcademicPeriod`, `UpdateAcademicPeriod`,
  `DuplicateClassGroups(sourcePeriodId → targetPeriodId)` — uma transação;
  **409** se o destino já tiver turma cuja `source_class_group_id` aponte pra
  uma turma da origem; devolve `{ copied, skippedRetired }`.
- **Turma:** `CreateClassGroup` (nasce `draft` ou já `enrolling` se completa),
  `UpdateClassGroup`, `AdvanceClassGroupStatus`. Reduzir capacidade é UPDATE
  condicional `where seats_taken <= $capacity` — não disputa com o hold do
  checkout; zero linhas = 422.
- **Espera:** `JoinWaitlist`, `LeaveWaitlist` (motivo), `ListWaitlist` (FIFO por `created_at`).
  `CreateManualEnrollment` (existente) passa a fechar, na mesma transação, a
  entrada ativa daquele aluno naquela turma com `enrolled`.

### Rotas — `/api/v1/catalog/...`

| Rota | Papéis |
| --- | --- |
| `GET courses`, `GET courses/:id` (planos + histórico de preço), `GET periods`, `GET class-groups` (filtros período/curso/status/busca), `GET class-groups/:id` | Os que hoje veem a tela em `permissions.ts` (conferido rota a rota na implementação) |
| `GET class-groups/:id/waitlist` | `master`, `admin`, `enrollment_supervisor` — cada linha traz o DNI do aluno, então só quem lê o DNI em `GET /students`; para os demais a ficha da turma simplesmente não mostra o card da fila |
| `POST courses` | `master`, `admin` |
| `PATCH courses/:id` | `master`, `admin`, `enrollment_supervisor` |
| `POST courses/:id/plans`, `PATCH plans/:id`, `POST plans/:id/prices` | `master`, `admin` |
| `POST periods`, `PATCH periods/:id`, `POST periods/:id/duplicate`, `POST class-groups`, `PATCH class-groups/:id`, `POST class-groups/:id/status`, `POST class-groups/:id/waitlist`, `POST waitlist/:entryId/leave` | `master`, `admin`, `enrollment_supervisor` |

`GET /catalog` e `GET /class-groups` existentes não mudam de contrato.

**Erros** (`reason` no vocabulário existente, texto no locale):

- 409 — transição de status inválida, período já duplicado, aluno já na fila.
- 422 — turma incompleta pra publicar, capacidade abaixo das vagas ocupadas,
  preço com data passada, turma não lotada (espera), janela invertida.
- 404 — curso/plano/período/turma/entrada inexistente ou aposentado onde o
  usecase exige vivo.

### Testes

- **Unitários de usecase com fakes** (`apps/api/src/tests`): máquina de
  estados, capacidade, preço, fila, duplicação.
- **Integração contra Postgres migrado** (`*.integration.test.ts`):
  - duplicar → turmas com datas nulas, `seats_taken = 0`, `draft`, nenhuma
    matrícula/espera/hold novo; segundo disparo → 409 (**critério OOC-35**);
  - curso criado → aparece no `GET /catalog/courses` e aceita `POST class-groups` (**critério OOC-36**);
  - checkout e seletor manual ignoram `draft`, turma fora da janela e período aposentado;
  - redução de capacidade abaixo de `seats_taken` não grava.
- **Autorização:** toda rota nova chamada com papel errado exige falha.
- **Privilégio:** UPDATE/DELETE em `plan_prices` recusado.

## 3. Telas, i18n, mocks

**Cursos** — Server Component lendo `apiFetch('/catalog/courses')`;
`EmptyState` de erro de carga como em Alunos. `new-course-form` e
`course-options-sheet` gravam via proxy; sai o banner `courses.local_only`.
Desativar/reativar chama retire/restore e mostra as matrículas vivas como aviso.
**Folha "Planos e preços"** por curso: planos, preço vigente, histórico
("vigente desde") e preço agendado; `master`/`admin` têm "Novo plano" e "Lançar
preço" (valor + data, padrão hoje, recusa passado); sem editar nem apagar preço.

**Turmas** — lê `/catalog/class-groups` e `/catalog/periods`; busca e filtros
vão para a query da API (padrão: período mais recente). Seletor de período com
"Novo período", cujo formulário tem "copiar turmas de…" (segundo passo, mostra
copiadas/puladas). `NewClassGroupForm` real: curso vindo de
`/catalog/courses`, dias + hora → `slots`, código digitado (não mais sorteado),
"Guardar rascunho" e "Abrir inscrições" (ativo só com datas + capacidade); sai
`created_local_only`; saem `teacherId` e `modality` da criação. Linha e detalhe
mostram o próximo passo do status como ação, com confirmação; `draft` mostra o
que falta para publicar.

**Detalhe da turma** — cabeçalho, datas, janela e medidor de vagas reais, com
edição. Cartão **"Lista de espera"** (aparece com turma lotada ou fila não
vazia): FIFO, "Retirar" com motivo, "Agregar à espera" buscando em
`GET /students`; com vaga e fila, aviso "Matricular a [primeiro]" levando à
matrícula manual preenchida. Certificados e roster continuam mock, visualmente
separados.

**Continua mock, de propósito:** visão do docente (`TeacherClassGroups`,
`listClassGroupsFor`) — sem `teacher_id` não há filtro no usecase (§8); e as
outras telas que leem os mesmos mocks (novo e-mail, relatórios, docentes, home do
docente).

**RBAC na UI:** `canCreateClassGroup` sem `academic_supervisor` (via skill
`rbac-role-change`); novo `canManagePrices` (`master`, `admin`).

**i18n:** chaves novas nos três locales com a mesma estrutura — status `draft`,
motivos de saída da fila, regra de certificado, "vigente desde", todo `reason`
de erro novo.

## 4. Documentação no mesmo PR (§10)

- `CLAUDE.md` raiz — turma em rascunho, janela opcional, o que a duplicação copia/zera, lista de espera manual.
- `apps/api/CLAUDE.md` — trava de `plan_prices` no banco; preço futuro agendado.
- `packages/db/CLAUDE.md` — migration `0017`.
- `README.md` "Estado atual" — cursos e turmas deixam de ser mock.
- `docs/ROADMAP.md` — **só sinalizar** (Sessão 35 avança; Sessão 22 continua aberta). Não editar sem confirmação.

## 5. Ajustes feitos no plano

Desvios assumidos na implementação em relação ao desenho acima:

1. **Duas migrations em vez de uma:** `0017` (cursos + trava de `plan_prices`) no PR do OOC-36 e `0018` (turmas + espera) no PR do OOC-35. Cada PR leva o schema que usa.
2. **A edição de curso vira duas rotas:** `PATCH /catalog/courses/:id` (identidade + opções, `master`/`admin`) e `PATCH /catalog/courses/:id/options` (só opções, + `enrollment_supervisor`). É o que faz a regra "renomear curso é de quem cria" valer na API, não só na tela.
3. **Escritas devolvem `{ id }`** (mais o dado específico: status, contagens de duplicação, matrículas vivas); a tela relê com `router.refresh()`.
4. **A tela de turmas filtra período pela API** (`?periodId=`); busca por texto e idioma filtram em memória dentro do período (~40 linhas). A API aceita `courseId`, `status` e `q` também.
5. **Turma criada/editada pelo painel grava `schedule = ''`** e o horário só em `slots` (`{ weekday, startTime, endTime }[]`). `schedule` texto fica como legado de seed; o seletor da matrícula manual formata por `slots`.
6. **A janela de inscrição também vale no claim do checkout** (`sellableClassGroup()`), não no submit e não no caminho manual do staff. Hold preso dentro da janela sobrevive ao fechamento dela.
7. **A ficha da turma não mostra certificados nem procedimentos ao staff.** O §3 previa "certificados e roster continuam mock, visualmente separados" na ficha real; na implementação essa seção ficou **só no ramo do docente** (`TeacherClassGroupDetail`, que ainda lê o mock). O mock não tem dado nenhum para os ids reais do catálogo, então a seção apareceria sempre vazia para o staff — pior que ausente. Emissão de certificado em lote e procedimentos por matrícula (mover, congelar, retirar) voltam à ficha do staff quando tiverem API (Sessões 37/38).
8. **`GET class-groups/:id/waitlist` é de `master`, `admin`, `enrollment_supervisor`**, não de todos os leitores do catálogo: cada linha traz o DNI do aluno, que `GET /students` só mostra a esses três. Os demais papéis de leitura veem a ficha da turma sem o card da fila.
