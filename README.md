# Only One Coin — Plataforma Académica Digital

Plataforma académica para a **Asociación Only One Coin Perú** (RUC 20610561463):
site público, matrícula com leitura de comprovante por IA, portal do aluno,
backoffice administrativo e módulo de e-mail.

## Documentos

- [`CLAUDE.md`](CLAUDE.md) — contexto permanente: stack fechada, convenções, regras proibidas.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — estrutura do monorepo, modelo de autorização (Caminho A vs. B), RBAC, custo mensal estimado e o shell/layout responsivo de `apps/app`.
- [`docs/MATRICULA-CHECKOUT.md`](docs/MATRICULA-CHECKOUT.md) — o funil público de matrícula: wizard de 4 passos com dois modos de entrada (landing e link do vendedor), os dois relógios da vaga e a atribuição de canal.
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

- `apps/landing` — site público (Astro), trilíngue. Camada de SEO montada: título e
  descrição por página nos três idiomas (`src/i18n/ui.ts`), `canonical` + `hreflang`
  + `x-default` + Open Graph no `Base.astro`, `sitemap.xml` e `llms.txt` gerados a
  partir do mesmo registro de rotas (`src/seo/routes.ts`) e da tabela de preços, e
  JSON-LD de `EducationalOrganization`, `Course` e `FAQPage`. `/blog` e `/comunidad`
  seguem `noindex` enquanto forem placeholder.
- `apps/app` — Next.js App Router: layout, roteamento, i18n trilíngue e as telas
  em **mockup** (sem acesso a dados). Portal do aluno (`/portal`), backoffice
  (`/backoffice` para login; painel em `/backoffice/home`) e a **matrícula
  pública** (`/enrollment`). O checkout público é o wizard de 4 passos —
  curso + data de início + horário (escolhas separadas, porque o mesmo curso
  abre em várias datas), dados do aluno nos campos que a Asociación já coleta
  hoje (nome completo num campo só, documento, celular, nascimento e Gmail
  obrigatório) mais o bloco do apoderado com consentimento quando menor,
  pagamento com comprovante obrigatório, e revisão/envio — com **dois
  modos de entrada** na mesma tela: aberto da landing começa no passo 1, e
  aberto pelo link do vendedor (`?course=&group=&src=whatsapp`) chega com o
  passo 1 respondido e cai no passo 2. A vaga é presa no checkout com relógio
  curto (15 min, parâmetro do backoffice) e o rascunho sobrevive a recarregar a
  página — sair pra pagar no app do banco não perde o preenchimento. A origem
  do canal (`whatsapp`/`web`) é resolvida no servidor, na chegada, e carregada
  até o envio. Desenho e regras em `docs/MATRICULA-CHECKOUT.md`. **Ainda não há
  CTA na landing apontando pra ele** — falta a variável de ambiente com a URL
  do app.
  No backoffice já existem: alunos (`/backoffice/students`, com ficha, histórico e edição),
  turmas (`/backoffice/class-groups`, com lista paginada, ficha da turma,
  emissão de certificados em lote e procedimentos por matrícula — mover,
  congelar, retirar), cursos (`/backoffice/courses`, catálogo com opções por
  curso) e pagamentos (`/backoffice/payments`: livro de todos os pagamentos —
  matrícula e trâmite — com métricas do ciclo, busca e filtros por estado, meio
  e conceito, e cada linha abrindo o comprovante e os dados do pagamento num
  modal; `/backoffice/payments/review`, a fila de revisão humana com a
  ficha de decisão do comprovante — extração campo a campo com confiança,
  segunda leitura quando os modelos divergem, aprovar/recusar com motivo),
  matrículas
  (`/backoffice/enrollments`: livro de todas as matrículas — aluno, curso/turma,
  estado da matrícula, da vaga e do pagamento — com métricas do ciclo, busca,
  filtros por estado, vaga, idioma e ciclo, detalhe em modal e abertura manual de
  matrícula sobre aluno já cadastrado (vaga reservada, preço vigente somente
  leitura, pagamento nunca aprovado dali, meio de pagamento com opção "outro"
  que pede o texto que o nomeia); e
  `/backoffice/enrollments/reservations`, as vagas presas a um pagamento em
  aberto, ordenadas pelo prazo em que o cron as devolve, com a linha abrindo
  direto o comprovante que segura a vaga) e docentes
  (`/backoffice/teachers`: plantel em duas abas — **Geral** (ativos) e
  **Inativos** — com busca, filtro por idioma, "sem turma" e "contrato a
  vencer", coluna de contrato com o alerta de vencimento; cadastro de docente —
  identificação com documento, contato, endereço completo, docência e
  contrato — e ficha com dados, contrato arquivado, disponibilidade semanal — a
  grade da semana com as turmas já atribuídas sobrepostas — e as turmas do
  docente. A ficha é onde se tira alguém do quadro e se devolve: a confirmação
  avisa quantas turmas em andamento ainda apontam para ele, e o contrato deixa
  de ser vigiado enquanto estiver inativo). Fecha a lista a configuração
  (`/backoffice/settings`, só `admin`), a tela única dos números que o resto do
  painel roda em cima: as regras acadêmicas e de trâmite (nota mínima, prazo do
  certificado, taxa da constancia, antecedência do aviso de contrato) e os
  parâmetros de validação do comprovante (tolerância de valor, confiança mínima
  e os dois relógios da vaga: os minutos de reserva durante o pagamento e os
  dias de validade da reserva) — estes últimos vieram de `/backoffice/payments/settings`,
  que deixou de existir: um número com duas telas donas é um número que diverge.
  O papel `teacher` já entra numa
  **visão restrita**: menu reduzido,
  home própria (turmas, alunos, notas e certificados pendentes dele), só as
  próprias turmas na lista e na ficha da turma, e alunos/pagamentos bloqueados —
  tudo escopado pelo `teacherId` da sessão, nunca por dado vindo do cliente. A
  sessão do mockup é fixa em `getStaffSession()`; trocar o papel ali é o que
  mostra essa visão, de propósito não há seletor de papel na tela (`CLAUDE.md`
  §8). Cada pessoa do staff, em qualquer papel, gerencia a própria conta em
  `/backoffice/account` (aberta pelo chip do usuário no rodapé do menu): senha
  com as exigências listadas enquanto se digita, verificação em dois passos —
  obrigatória e sem botão de desligar para `admin`, `treasury` e
  `mass_approver` (`CLAUDE.md` §8), opcional para os demais —, códigos de
  recuperação, sessões abertas com o encerramento por linha, e o idioma do
  painel. Nome, e-mail de acesso e cargo ficam de fora de propósito: são
  identidade, e o cargo só muda pelo usecase de promoção. Toda escrita é estado
  local. Os demais módulos do painel aparecem listados como "pronto/em breve".
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
