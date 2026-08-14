# Only One Coin — Plataforma Académica Digital

Plataforma académica para a **Asociación Only One Coin Perú** (RUC 20610561463):
site público, matrícula com leitura de comprovante por IA, portal do aluno,
backoffice administrativo e módulo de e-mail.

## Documentos

- [`CLAUDE.md`](CLAUDE.md) — contexto permanente: stack fechada, convenções, regras proibidas.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — estrutura do monorepo, modelo de autorização (Caminho A vs. B) e RBAC.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — plano de desenvolvimento em sessões pequenas (1 sessão = 1 PR).
- [`docs/PROMPT-arranque-claude-code.md`](docs/PROMPT-arranque-claude-code.md) — prompt de arranque da primeira sessão.

## Stack

Astro (site público) · Next.js App Router (portal + backoffice) · Fastify
(`apps/api`) · Postgres (provedor gerenciado a decidir) · Netlify · Redis
(Upstash) + BullMQ · Gemini (OCR) · Brevo (e-mail) · Sentry + PostHog.

## Estado atual

O provedor de backend (Postgres gerenciado + auth + storage) ainda está em
decisão — sem banco real, sem auth real. Mas domínio e fila já existem,
independentes dessa escolha:

- `apps/landing` — site público (Astro).
- `apps/app` — shell do Next.js App Router: layout, roteamento, i18n trilíngue e
  as telas de portal/backoffice em **mockup** (sem acesso a dados).
- `packages/domain` — domínio DDD puro (entidades, usecases, portas de
  repositório), sem framework nem provedor de banco.
- `packages/queue` — contrato de fila compartilhado (BullMQ/Redis).
- `apps/api` — Fastify expondo `@ooc/domain` via HTTP e rodando os workers de
  fila. Persistência ainda em memória (`InMemoryExampleRepository`) até o
  provedor de banco ser escolhido.

**A reconstruir** (volta quando o provedor for escolhido): banco e
migrations, auth real, storage, OCR e notificações reais. Autorização é
feita na camada de aplicação (`apps/api`), não em RLS — ver `CLAUDE.md` §8.
