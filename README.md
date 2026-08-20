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
decididos (`docs/ARCHITECTURE.md` §5). Auth ainda não está implementado —
Postgres local já existe (abaixo), mas o adapter concreto do Better Auth em
si ainda não foi escrito. Domínio e fila já existem, independentes dessa
escolha:

- `apps/landing` — site público (Astro).
- `apps/app` — Next.js App Router: layout, roteamento, i18n trilíngue e as telas
  em **mockup** (sem acesso a dados). Portal do aluno (`/portal`) e backoffice
  (`/backoffice` para login; painel em `/backoffice/home`). No backoffice já
  existem: alunos (`/backoffice/students`, com ficha, histórico e edição),
  turmas (`/backoffice/class-groups`, com lista paginada, ficha da turma,
  emissão de certificados em lote e procedimentos por matrícula — mover,
  congelar, retirar), cursos (`/backoffice/courses`, catálogo com opções por
  curso) e a fila de revisão de comprovantes (`/backoffice/payments/review`,
  com busca, filtro por motivo e paginação). Toda escrita é estado local. Os demais módulos do painel aparecem
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
  schema/migrations com Drizzle Kit (`docs/ARCHITECTURE.md` §5.8). Só a
  migration baseline vazia por enquanto — o modelo acadêmico e de pessoas
  entra nas próximas sessões do `ROADMAP.md`.
- `apps/api` — Fastify expondo `@ooc/domain` via HTTP e rodando os workers de
  fila. Persistência ainda em memória (`InMemoryExampleRepository`) — ainda
  não fala com o Postgres local. Já tem error handler global + logger
  compartilhado (`container.logger`) via `infra/plugins/`.

**A reconstruir** (volta quando o Neon de staging/produção for provisionado,
`ROADMAP.md` Sessão 13): storage, OCR e notificações reais. Adapter real do
Better Auth (`apps/api/src/infra/auth/`) e migrations do modelo de negócio já
podem começar — Postgres local existe. Autorização é feita na camada de
aplicação (`apps/api`), não em RLS — ver `CLAUDE.md` §8.
