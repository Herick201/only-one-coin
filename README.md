# Only One Coin — Plataforma Académica Digital

Plataforma académica para a **Asociación Only One Coin Perú** (RUC 20610561463):
site público, matrícula com leitura de comprovante por IA, portal do aluno,
backoffice administrativo e módulo de e-mail.

## Documentos

- [`CLAUDE.md`](CLAUDE.md) — contexto permanente: stack fechada, convenções, regras proibidas.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — plano de desenvolvimento em sessões pequenas (1 sessão = 1 PR).
- [`docs/PROMPT-arranque-claude-code.md`](docs/PROMPT-arranque-claude-code.md) — prompt de arranque da primeira sessão.

## Stack

Astro (site público) · Next.js App Router (portal + backoffice) · Postgres + RLS
(provedor gerenciado a decidir) · Netlify · pgmq · Gemini (OCR) · Brevo (e-mail) ·
Upstash Redis · Sentry + PostHog.

## Estado atual

**Só frontend.** O repositório foi zerado para o shell de frontend enquanto o
provedor de backend (Postgres gerenciado + auth + storage) está em decisão. O que
está no repo hoje:

- `apps/landing` — site público (Astro).
- `apps/app` — shell do Next.js App Router: layout, roteamento, i18n trilíngue e
  as telas de portal/backoffice em **mockup** (sem acesso a dados).

**A reconstruir** (removido neste reset, volta quando o provedor for escolhido):
banco e migrations, auth real, storage, fila/outbox, OCR e notificações. Postgres
com RLS segue como base de segurança (CLAUDE.md §8) — só o provedor está aberto.
