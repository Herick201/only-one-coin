# Only One Coin — Plataforma Académica Digital

Plataforma académica para a **Asociación Only One Coin Perú** (RUC 20610561463):
site público, matrícula com leitura de comprovante por IA, portal do aluno,
backoffice administrativo e módulo de e-mail.

## Documentos

- [`CLAUDE.md`](CLAUDE.md) — contexto permanente: stack fechada, convenções, regras proibidas.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — estrutura do monorepo, modelo de autorização (Caminho A vs. B), RBAC e custo mensal estimado.
- [`docs/DOCUMENTOS-E-CERTIFICADOS.md`](docs/DOCUMENTOS-E-CERTIFICADOS.md) — emissão de constancia e certificado, lote por turma, e-mail pela outbox.
- [`docs/INFRAESTRUTURA.md`](docs/INFRAESTRUTURA.md) — base de conhecimento: levantamento de mercado (preços, specs, latência) que baseou as escolhas de hospedagem.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — plano de desenvolvimento em sessões pequenas (1 sessão = 1 PR).
- [`docs/PROMPT-arranque-claude-code.md`](docs/PROMPT-arranque-claude-code.md) — prompt de arranque da primeira sessão.

## Stack

Astro (site público) · Next.js App Router (portal + backoffice) · Fastify
(`apps/api`, hospedado no Fly.io) · Postgres gerenciado (Neon) · Better Auth
(embutido em `apps/api`) · Tigris (storage de comprovante, nativo do
Fly.io) · Netlify (landing + app) · Redis (Upstash) + BullMQ · Gemini (OCR) ·
Brevo (e-mail transacional/campanhas) + Zoho Mail (caixa de e-mail de
staff) · Sentry + PostHog.

## Estado atual

Postgres (Neon), hospedagem de `apps/api` (Fly.io), storage de comprovante
(Tigris), caixa de e-mail (Zoho Mail) e auth (Better Auth) já estão
decididos (`docs/ARCHITECTURE.md` §5). O adapter de auth já está
implementado (`docs/ARCHITECTURE.md` §5.6): sign-up/sign-in/sessão testados
ponta a ponta, `role` protegido, erros do provedor traduzidos pro envelope do
projeto (§5.7), docs interativas mescladas no Swagger. As telas de login
(`apps/app`) continuam mockadas — wiring real, MFA e redirect por `role`
pertencem à Sessão 31 do `ROADMAP.md`, que depende de peças que ainda não
existem (autorização deny-by-default da Sessão 8, `audit_log` da Sessão 7).
Domínio e fila já existem, independentes dessa escolha:

- `apps/landing` — site público (Astro).
- `apps/app` — Next.js App Router: layout, roteamento, i18n trilíngue e as telas
  em **mockup** (sem acesso a dados). Portal do aluno (`/portal`) e backoffice
  (`/backoffice` para login; painel em `/backoffice/home`). No backoffice já
  existem: alunos (`/backoffice/students`, com ficha, histórico e edição),
  turmas (`/backoffice/class-groups`, com lista paginada, ficha da turma,
  emissão de certificados em lote e procedimentos por matrícula — mover,
  congelar, retirar), cursos (`/backoffice/courses`, catálogo com opções por
  curso) e pagamentos (`/backoffice/payments`: livro de todos os pagamentos —
  matrícula e trâmite — com métricas do ciclo, busca e filtros por estado, meio
  e conceito, e cada linha abrindo o comprovante e os dados do pagamento num
  modal; `/backoffice/payments/review`, a fila de revisão humana com a
  ficha de decisão do comprovante — extração campo a campo com confiança,
  segunda leitura quando os modelos divergem, aprovar/recusar com motivo; e
  `/backoffice/payments/settings`, os parâmetros de validação — tolerância de
  valor, confiança mínima e validade da reserva), matrículas
  (`/backoffice/enrollments`: livro de todas as matrículas — aluno, curso/turma,
  estado da matrícula, da vaga e do pagamento — com métricas do ciclo, busca,
  filtros por estado, vaga, idioma e ciclo, detalhe em modal e abertura manual de
  matrícula sobre aluno já cadastrado (vaga reservada, preço vigente somente
  leitura, pagamento nunca aprovado dali); e
  `/backoffice/enrollments/reservations`, as vagas presas a um pagamento em
  aberto, ordenadas pelo prazo em que o cron as devolve) e docentes
  (`/backoffice/teachers`: plantel com busca, filtro por idioma, estado e "sem
  turma", cadastro de docente, e ficha com dados, disponibilidade semanal — a
  grade da semana com as turmas já atribuídas sobrepostas — e as turmas do
  docente). O papel `teacher` já entra numa **visão restrita**: menu reduzido,
  home própria (turmas, alunos, notas e certificados pendentes dele), só as
  próprias turmas na lista e na ficha da turma, e alunos/pagamentos bloqueados —
  tudo escopado pelo `teacherId` da sessão, nunca por dado vindo do cliente. A
  sessão do mockup é fixa em `getStaffSession()`; trocar o papel ali é o que
  mostra essa visão, de propósito não há seletor de papel na tela (`CLAUDE.md`
  §8). Toda escrita é estado local. Os demais módulos do painel aparecem
  listados como "pronto/em breve".
  UI em shadcn/ui sobre Tailwind v4; os tokens de marca vivem em `globals.css`
  (paleta da landing, tipografia Inter). A landing segue com Fredoka/Poppins —
  público diferente.
- `packages/domain` — domínio DDD puro (entidades, usecases, portas de
  repositório), sem framework nem provedor de banco. Já inclui a porta de
  identidade/auth (`identity/`, ver `packages/domain/README.md`) e um
  vocabulário de erro HTTP reutilizável (`shared/base/errors/`).
- `packages/queue` — contrato de fila compartilhado (BullMQ/Redis).
- `packages/db` — Postgres local via `compose.yml` (`postgres:18-alpine`) +
  schema/migrations com Drizzle Kit (`docs/ARCHITECTURE.md` §5.8). Migration
  baseline vazia + schema do Better Auth (`user`/`session`/`account`/
  `verification`, `0001_better_auth_core.sql`). Modelo acadêmico e de pessoas
  entra nas próximas sessões do `ROADMAP.md`.
- `apps/api` — Fastify expondo `@ooc/domain` via HTTP e rodando os workers de
  fila. Better Auth embutido (`infra/auth/`), fala com o Postgres local via
  `pg.Pool`. Persistência de negócio ainda em memória
  (`InMemoryExampleRepository`). Error handler global + logger compartilhado
  (`container.logger`) via `infra/plugins/`, incluindo a tradução dos erros
  do Better Auth pro mesmo envelope.

**A reconstruir** (volta quando o Neon de staging/produção for provisionado,
`ROADMAP.md` Sessão 13): storage, OCR e notificações reais. Migrations do
modelo de negócio já podem começar — Postgres local existe. Autorização é
feita na camada de aplicação (`apps/api`), não em RLS — ver `CLAUDE.md` §8.
