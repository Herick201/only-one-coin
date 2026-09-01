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
- [`docs/FRONTEND-CONSOLIDACAO.md`](docs/FRONTEND-CONSOLIDACAO.md) — avaliação em aberto (não decidido): unificar `landing` + `app` num projeto só.

## Stack

Astro (site público) · Next.js App Router (portal + backoffice) · Fastify
(`apps/api`, hospedado no Fly.io) · Postgres gerenciado (Neon) · Better Auth
(embutido em `apps/api`) · Tigris (storage de comprovante, nativo do
Fly.io) · Vercel (landing + app) · Redis (Upstash) + BullMQ · Gemini (OCR) ·
Brevo (e-mail transacional/campanhas) + Zoho Mail (caixa de e-mail de
staff) · Sentry + PostHog.

## Rodar local

```bash
pnpm install
pnpm dev:web
```

Sobe os dois de uma vez: a landing (Astro) em `localhost:4321` e o app
(Next.js — matrícula, portal e backoffice) em `localhost:3000`. As telas do app
são mockadas, então nada disso precisa de banco; `pnpm db:up` + `pnpm dev:api`
só entram quando o trabalho for na API.

Os CTAs da landing (`/enrollment` e `/login`, nos três idiomas) são links
relativos de propósito — para quem lê é tudo o mesmo site. Quem os atravessa
para o app é o Vercel em produção e o dev server no local: copie
`apps/landing/.env.example` para `apps/landing/.env` e o `astro dev` passa a
responder o mesmo 302 do `vercel.json`, com a query string preservada — é o
que faz o link do vendedor (`?course=&group=&src=whatsapp`) chegar inteiro ao
wizard. Sem essa variável a landing sobe igual, só que os CTAs dão 404.

## Estado atual

Postgres (Neon), hospedagem de `apps/api` (Fly.io), storage de comprovante
(Tigris), caixa de e-mail (Zoho Mail) e auth (Better Auth) já estão
decididos (`docs/ARCHITECTURE.md` §5). `apps/api` está no ar em
`only-one-coin-api.fly.dev`; `apps/landing` e `apps/app` estão no ar em
projetos Vercel separados (`docs/ARCHITECTURE.md` §5.9) — falta só ligar o
deploy automático por push (pendente de autenticação no dashboard) e o
domínio próprio. O adapter de auth já está
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
  até o envio. Desenho e regras em `docs/MATRICULA-CHECKOUT.md`. A landing já
  aponta pra ele: os CTAs são relativos (`/enrollment` no herói e nos cursos,
  `/login` no botão do header — quem chega da landing não tem sessão, então a
  porta do aluno é a tela de login, nunca o dashboard) e quem atravessa para o
  domínio do app é o Vercel em produção (`vercel.json`, 302 com a query
  string preservada) e o dev server no local (ver **Rodar local**).
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
  de ser vigiado enquanto estiver inativo), equipe (`/backoffice/team`: as
  contas que abrem o painel, em duas abas — **Com acesso** e **Sem acesso** —
  com busca, filtro por cargo e filtro de segundo fator pendente; cada linha
  mostra o cargo, se o MFA exigido pelo cargo já foi configurado e o último
  ingresso, e a conta de docente aponta pra ficha do plantel. Abrir conta é só
  nome, e-mail e cargo — sem senha na tela, credenciais por e-mail — e a conta
  de docente é aberta sobre alguém que já está no plantel e ainda não tem
  conta. Mudar cargo passa por um diálogo que pede a senha do próprio admin
  (reautenticação fresca, `CLAUDE.md` §8) e escreve na bitácora de cargos que
  fica abaixo da lista; o cargo `teacher` não entra nem sai por ali, porque
  anda junto com a ficha do plantel. Tirar acesso não apaga ninguém — a conta
  vai pra aba **Sem acesso** e volta de lá. A seção inteira é de `admin`; os
  outros papéis veem a tela bloqueada). Também entram o correio (`/backoffice/emails`, em
  cinco telas: **Automáticos**, o conjunto dos e-mails transacionais com
  destinatário, estado e enviados/entregues dos últimos 30 dias, cortado entre
  os que saem para o aluno/apoderado e os **internos** (docente e coordenação:
  acesso ao painel, turma atribuída, contrato a vencer, notas pendentes, turma
  pronta para certificados);
  **Jornada** (`/backoffice/emails/journey`), o fluxo do aluno (os internos ficam
  fora dele de propósito): a espinha são os eventos do domínio (matrícula enviada, comprovante em validação, pagamento decidido,
  acesso liberado, documentos) e os e-mails saem deles como ramos — tracejado e
  com a condição escrita no conector quando o caso pode nunca tomar aquele
  caminho, e cada quadro abre o e-mail; e a página de cada e-mail
  (`/backoffice/emails/[template]`), com a prévia renderizada do template
  versionado do repositório (dados de exemplo, nunca de aluno real), o
  liga/desliga do envio automático e a prova para até 5 endereços. **Não entregues**
  (`/backoffice/emails/deliveries`) é a única tela da seção sobre pessoas: quem
  não recebeu, por quê (caixa cheia, domínio errado, erro do provedor), com a
  linha abrindo a ficha do aluno — e a ação decidida pelo motivo, porque
  endereço escrito errado não se resolve reenviando. **Novo envio**
  (`/backoffice/emails/new`) é o comunicado escrito à mão, numa trilha de
  passos guiados, um por vez — segmento, qual (só quando o segmento pede um
  valor), conteúdo, teste e revisão: o segmento é escolhido
  entre o que existe e calculado no envio (nunca guardado no provedor), o
  conteúdo é texto escrito ali ou um HTML carregado (pré-visualizado em iframe
  sandboxed), o teste perde a validade assim que o conteúdo muda, e o envio para
  toda a base fica parado à espera da segunda aprovação. Não existe
  botão de enviar por aluno: e-mail transacional é consequência do que aconteceu
  no domínio). Também entram relatórios
  (`/backoffice/reports`: matrículas, receita e ocupação do ciclo, cortadas por
  curso, idioma ou docente, com filtro de período, série de matrículas por mês e
  exportação em CSV, em duas guias sobre o mesmo filtro de período e corte.
  **Gráficos** traz os quatro números do ciclo, matrículas por mês (barras),
  receita por mês (linha), participação nas matrículas (donut), a tendência por
  ciclo (uma linha por curso, sempre sobre todos os ciclos) e os quatro rankings
  por curso — matrículas, congelamentos, notas baixas e retiradas, lidos das
  listas de turma, onde procedimento e nota fechada moram. Todo gráfico responde
  com o número no hover, no foco e no toque; no donut a resposta aparece no
  miolo, no lugar do total. **Tabela** é o detalhe linha a linha e o CSV. É
  leitura pura — nada se decide dali —
  e cada coluna diz de onde vem: matrícula e dinheiro saem do livro de
  matrículas, a ocupação sai das vagas das turmas, e os trâmites pagos ficam de
  fora porque são liquidados em Pagos. A seção é de `admin` e `coordinator`,
  como o livro de matrículas). Fecha a lista a configuração
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
  (paleta da landing, tipografia Inter). A tela de login do aluno aceita duas
  portas para a mesma conta — o e-mail que recebeu as credenciais ou o
  documento com que se matriculou (DNI, CE ou passaporte); o método viaja como
  união fechada até o servidor, nunca como string solta. **Exceção: as telas que o visitante
  alcança direto da landing** — hoje a de login do aluno (`/login`) — vestem o
  sistema visual do site: Fredoka no display, Poppins no corpo (tokens
  `font-display`/`font-body`, carregados por `next/font` no layout), painel de
  marca azul com blobs e grade de pontos, campos sobre lavado claro e o botão
  pill que vai de azul a amarelo no hover, como o `.btn-primary` de lá. Trocar
  de tipografia no meio de um clique é o que faz a pessoa duvidar se ainda está
  no lugar certo para digitar a senha. O resto do painel (portal e backoffice)
  segue em Inter — é ferramenta de trabalho, não peça de marca.
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
