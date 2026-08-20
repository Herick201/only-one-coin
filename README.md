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
(`apps/api`, hospedado no Fly.io) · Postgres gerenciado (Neon) · Tigris
(storage de comprovante, nativo do Fly.io) · Netlify (landing + app) · Redis
(Upstash) + BullMQ · Gemini (OCR) · Brevo (e-mail transacional/campanhas) +
Zoho Mail (caixa de e-mail de staff) · Sentry + PostHog.

## Estado atual

Postgres (Neon), hospedagem de `apps/api` (Fly.io), storage de comprovante
(Tigris) e caixa de e-mail (Zoho Mail) já estão decididos
(`docs/ARCHITECTURE.md` §5) mas ainda não implementados — sem banco real,
sem auth real. Só auth segue sem provedor escolhido. Domínio e fila já
existem, independentes dessa escolha:

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
  e conceito; `/backoffice/payments/review`, a fila de revisão humana com a
  ficha de decisão do comprovante — extração campo a campo com confiança,
  segunda leitura quando os modelos divergem, aprovar/recusar com motivo; e
  `/backoffice/payments/settings`, os parâmetros de validação — tolerância de
  valor, confiança mínima e validade da reserva). Toda escrita é estado local. Os demais módulos do painel aparecem
  listados como "pronto/em breve".
  UI em shadcn/ui sobre Tailwind v4; os tokens de marca vivem em `globals.css`
  (paleta da landing, tipografia Inter). A landing segue com Fredoka/Poppins —
  público diferente.
- `packages/domain` — domínio DDD puro (entidades, usecases, portas de
  repositório), sem framework nem provedor de banco.
- `packages/queue` — contrato de fila compartilhado (BullMQ/Redis).
- `apps/api` — Fastify expondo `@ooc/domain` via HTTP e rodando os workers de
  fila. Persistência ainda em memória (`InMemoryExampleRepository`) até o
  banco Neon ser provisionado.

**A reconstruir** (volta quando banco/storage forem provisionados e auth for
escolhido): banco e migrations, auth real, storage, OCR e notificações
reais. Autorização é feita na camada de aplicação (`apps/api`), não em RLS —
ver `CLAUDE.md` §8.
