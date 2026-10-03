# Only One Coin — Plataforma Académica Digital

Plataforma académica da **Only One Coin** (razão social `INGLES POR UN SOL S.A.C.`, RUC 20613918028):
site público, matrícula com leitura de comprovante por IA, portal do aluno,
backoffice administrativo e módulo de e-mail.

## Documentos

- [`CLAUDE.md`](CLAUDE.md) — contexto permanente: stack fechada, convenções, regras proibidas. Em camada: o que é específico de cada app/pacote vive em `apps/*/CLAUDE.md` e `packages/*/CLAUDE.md` (mapa completo no topo do arquivo da raiz).
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — estrutura do monorepo, modelo de autorização (Caminho A vs. B), RBAC, custo mensal estimado, o shell/layout responsivo de `apps/app` e as **feature flags** das três superfícies (§8).
- [`docs/MATRICULA-CHECKOUT.md`](docs/MATRICULA-CHECKOUT.md) — o funil público de matrícula: wizard de 4 passos com dois modos de entrada (landing e link do vendedor), os dois relógios da vaga e a atribuição de canal.
- [`docs/OCR-AVALIACAO.md`](docs/OCR-AVALIACAO.md) — como medir a taxa de acerto da OCR em comprovantes reais (`ocr:eval`) e o resultado de cada medição.
- [`docs/DOCUMENTOS-E-CERTIFICADOS.md`](docs/DOCUMENTOS-E-CERTIFICADOS.md) — emissão de constancia e certificado, lote por turma, e-mail pela outbox.
- [`docs/INFRAESTRUTURA.md`](docs/INFRAESTRUTURA.md) — base de conhecimento: levantamento de mercado (preços, specs, latência) que baseou as escolhas de hospedagem.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — plano de desenvolvimento em sessões pequenas (1 sessão = 1 PR).
- [`docs/PROMPT-arranque-claude-code.md`](docs/PROMPT-arranque-claude-code.md) — prompt de arranque da primeira sessão.
- [`docs/FRONTEND-CONSOLIDACAO.md`](docs/FRONTEND-CONSOLIDACAO.md) — avaliação em aberto (não decidido): unificar `landing` + `app` num projeto só.
- [`docs/OPEN-FINANCE-PERU.md`](docs/OPEN-FINANCE-PERU.md) — pesquisa (não decisão): regulação de Open Finance no Peru, provedores de API existentes e custos — e por que a maioria esbarra na regra de "sem pasarela de pago" (`CLAUDE.md` §2).
- [`docs/superpowers/specs/2026-10-01-catalog-crud-design.md`](docs/superpowers/specs/2026-10-01-catalog-crud-design.md) — desenho do CRUD real de cursos e turmas (OOC-36/OOC-35): turma em rascunho, janela de inscrição, duplicar período, lista de espera manual, preço agendado.
- [`docs/superpowers/plans/2026-10-01-catalog-crud.md`](docs/superpowers/plans/2026-10-01-catalog-crud.md) — plano de implementação desse desenho, em dois PRs (OOC-36 primeiro, depois OOC-35).
- [`docs/DNS-MIGRATION-CLOUDFLARE.md`](docs/DNS-MIGRATION-CLOUDFLARE.md) — plano (em andamento): corte de nameservers para o Cloudflare sem downtime, preservando o e-mail no Google Workspace.

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
(Next.js — matrícula, portal e backoffice) em `localhost:3000`. Boa parte do
backoffice ainda é mockada e não precisa de banco — mas várias telas já falam
com `apps/api` de verdade (alunos, equipe, funcionalidades, matrícula manual e
o livro de matrículas; ver "Estado atual" abaixo) e ficam com erro de rede sem
ela. Para essas telas, ou qualquer coisa do lado do servidor: `pnpm db:up` +
`pnpm dev:api`. O `db:up` sobe o `compose.yml` inteiro: Postgres, Redis (filas
do BullMQ) e um S3 compatível (LocalStack, no lugar do Tigris — o bucket
`ooc-dev-receipts` do upload de comprovante é criado sozinho na subida, já com
a regra de CORS pra `localhost:3000`). O `apps/api/.env.example` já aponta pros
três.

Para trabalhar com uma lista de verdade — paginação, busca, filtro de menores
— há um seed de gente inventada:

```bash
# contra Postgres local
pnpm db:up && pnpm db:migrate
pnpm seed:students                   # 300 alunos; --count=N para outro tamanho

# contra um banco gerenciado (Neon), que exige nomear o destino
pnpm seed:students -- --confirm-host=ep-xxx.sa-east-1.aws.neon.tech
pnpm seed:students -- --confirm-host=ep-xxx... --undo   # desfaz
```

Banco local escreve sem cerimônia. **Qualquer outro host exige
`--confirm-host=<hostname>` batendo com a `DATABASE_URL`** — digitar o destino
é a trava: impede que o seed caia no que a `.env` estiver apontando naquele
dia. Build de produção (`NODE_ENV=production`) é recusado sem flag nenhuma.

Rodar de novo não duplica ninguém: as pessoas são determinísticas e o documento
já cadastrado é pulado. **`--undo`** aposenta o que o seed criou com
`deleted_at` — nunca DELETE, que não tem grant em `students` (§6) — e deixa em
paz quem já tiver matrícula. É o que substitui o `pnpm db:reset` quando o banco
não está na sua máquina. `pnpm seed:enrollments` (mesma convenção de
`--confirm-host`/`--count`, sem `--undo` — o pagamento não tem `deleted_at` e
não pode ser apagado, então a matrícula semeada não tem como voltar inteira)
popula o livro de matrículas por cima dos alunos já semeados.

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
projetos Vercel separados (`docs/ARCHITECTURE.md` §5.9). **Deploy é automático
a cada push em `main`** para os três: `.github/workflows/deploy-vercel.yml`
publica `apps/landing`/`apps/app` (`vercel deploy --prod` por projeto) e
`.github/workflows/deploy-api.yml` publica `apps/api` no Fly.io, sempre backup
do Neon → migration → deploy, nessa ordem. Os cinco secrets do pipeline
(`FLY_API_TOKEN`, `DATABASE_URL`, `TIGRIS_ACCESS_KEY_ID`,
`TIGRIS_SECRET_ACCESS_KEY`, `VERCEL_TOKEN`) estão configurados no GitHub e os
dois workflows rodam verdes a cada merge. O que falta é só a integração
nativa `vercel git connect` (passo de OAuth só do dashboard,
`docs/ARCHITECTURE.md` §5.9) e o domínio próprio — nenhum dos dois bloqueia
publicar hoje, porque o GitHub Actions já cobre o auto-deploy. O adapter de
auth já está implementado (`docs/ARCHITECTURE.md` §5.6): sign-up/sign-in/sessão
testados ponta a ponta, `role` protegido, erros do provedor traduzidos pro
envelope do projeto (§5.7), docs interativas mescladas no Swagger. **A
autenticação real do backoffice já está de pé** — login, logout, convite de
staff e recuperação de senha do painel (link por e-mail desde OOC-30) falam com o Better Auth de verdade
(`/api/auth/sign-in/email` etc.); só falta o MFA (nenhum plugin `twoFactor`
configurado ainda, então `admin`/`billing` entram sem o segundo fator por
enquanto). **O login do aluno (`/login`) continua mockado**: qualquer
submissão válida redireciona pro portal sem checar credencial — esse é o
único pedaço da Sessão 31 do `ROADMAP.md` ainda não iniciado, e as duas peças
que a bloqueavam (autorização deny-by-default da Sessão 8, `audit_log` da
Sessão 7) já existem. Domínio e fila já existem, independentes dessa escolha:

- `apps/landing` — site público (Astro), trilíngue. Camada de SEO montada: título e
  descrição por página nos três idiomas (`src/i18n/ui.ts`), `canonical` + `hreflang`
  + `x-default` + Open Graph no `Base.astro`, `sitemap.xml` e `llms.txt` gerados a
  partir do mesmo registro de rotas (`src/seo/routes.ts`) e da tabela de preços, e
  JSON-LD de `EducationalOrganization`, `Course` e `FAQPage`. `/blog` e `/comunidad`
  seguem `noindex` enquanto forem placeholder.
- `apps/app` — Next.js App Router: layout, roteamento, i18n trilíngue e as telas
  em parte já ligadas a `apps/api`, em parte ainda **mockup** — quadro
  completo em "Estado de integração por tela" mais abaixo, com o **livro de
  matrículas** (`GET /enrollments` — lista, métricas do ciclo e a linha de
  abertura manual, todos relidos do servidor) entre as exceções reais desde a
  última sessão. As telas são **desenhadas para o celular**,
  não só encolhidas nele (`docs/ARCHITECTURE.md` §7.1): menu do portal numa
  barra de abas no rodapé, tabela densa do painel virando lista com o nome da
  coluna como etiqueta, modal virando folha de baixo, safe area do notch e da
  barra de gestos, e campo de 16px para o Safari do iPhone não dar zoom ao
  focar. Portal do aluno (`/portal`), backoffice
  (`/backoffice` para login; painel em `/backoffice/home`) e a **matrícula
  pública** (`/enrollment`). O portal cobre as decisões de 02/09/2026: avisos
  no início, módulos por curso com o **cadeado de acesso à aula** (a opção de
  entrar na aula, não integração com Classroom), **Pagos** (mensualidade do
  inglês com upload de comprovante — mesma escada de OCR — e histórico
  completo), **Trámites** pagos (constancia S/25, exame de certificación,
  rezagados e congelamento, todos como solicitação com pagamento associado),
  **Continuar estudando** (próximo nível/re-matrícula sem voltar pelo site
  público, escolhendo só data de início + horário) e as regras do certificado
  (nota ≥ 14, DA, exame do inglés básico) na tela de documentos. O checkout público é o wizard de 4 passos —
  curso + data de início + horário (escolhas separadas, porque o mesmo curso
  abre em várias datas), dados do aluno nos campos que a Asociación já coleta
  hoje (nome completo num campo só, documento, celular, nascimento e Gmail
  obrigatório) mais o bloco do apoderado com consentimento quando menor,
  pagamento com comprovante obrigatório, e revisão/envio — com **dois
  modos de entrada** na mesma tela: aberto da landing começa no passo 1, e
  aberto pelo link do vendedor (`?course=&group=&src=whatsapp`) chega com o
  passo 1 respondido e cai no passo 2. A vaga é presa **no servidor** ao sair do
  passo 1 (`seat_holds`, relógio curto de 15 min editável em
  `/backoffice/settings/receipts`) e volta sozinha pra turma quando o hold vence
  sem envio; o rascunho sobrevive a recarregar a página — sair pra pagar no app
  do banco não perde o preenchimento. A origem do canal (`whatsapp`/`web`) é
  capturada na chegada, gravada no hold e copiada pelo servidor para a
  matrícula no envio; a matrícula manual grava `whatsapp`. Desenho e regras em `docs/MATRICULA-CHECKOUT.md`. A landing já
  aponta pra ele: os CTAs são relativos (`/enrollment` no herói e nos cursos,
  `/login` no botão do header — quem chega da landing não tem sessão, então a
  porta do aluno é a tela de login, nunca o dashboard) e quem atravessa para o
  domínio do app é o Vercel em produção (`vercel.json`, 302 com a query
  string preservada) e o dev server no local (ver **Rodar local**).
  No backoffice já existem: alunos (`/backoffice/students`, com ficha, histórico e edição),
  turmas (`/backoffice/class-groups`, real desde o OOC-35: períodos, rascunho,
  duplicação de período, ciclo de vida, tirar do catálogo e voltar, e lista de espera;
  lista paginada e ficha da turma.
  Emissão de certificados em lote e procedimentos por matrícula — mover,
  congelar, retirar — continuam mock e só aparecem na visão do docente, até as
  Sessões 37/38), cursos (`/backoffice/courses`, catálogo com opções por
  curso) e pagamentos (`/backoffice/payments`: livro dos pagamentos reais das
  matrículas, com métricas do ciclo, busca, filtros por estado e meio e
  ordenação por data; cada linha abre os dados do pagamento num modal — meio,
  número de operação, valor registrado contra o preço congelado do plano, quem
  decidiu e quando — e, se ainda está em aberto, o atalho para o caso na fila;
  `/backoffice/payments/review`, a fila de revisão humana: os pagamentos em
  aberto, o mais antigo primeiro, com prazo de revisão, estado do comprovante e
  sinais de fraude em texto; o caso abre num modal com a imagem real do
  comprovante por URL assinada de 5 minutos (ou o aviso de que não há imagem
  utilizável — sem comprovante, arquivo recusado ou ainda subindo; avisa, não
  bloqueia), o meio e o número de operação declarados, o preço congelado do
  plano e aprovar/recusar com motivo — ambos leem e gravam via `apps/api`),
  matrículas (`/backoffice/enrollments`: só quem entrou — vaga confirmada; o
  que ainda espera dinheiro vive em Pagos, e a aba Reservas deixou de existir —
  com aluno, curso/turma, estado da matrícula, da vaga e do pagamento, métricas
  do ciclo, busca, filtros por idioma e ciclo, detalhe em modal e abertura
  manual de matrícula sobre aluno já cadastrado (vaga reservada, preço vigente
  somente leitura, pagamento nunca aprovado dali — a matrícula vai para Pagos —,
  meio de pagamento com opção "outro" que pede o texto que o nomeia)) e docentes
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
  fora porque são liquidados em Pagos. A seção é de `admin`, `analyst`,
  `enrollment_supervisor` e `academic_supervisor`, como o livro de matrículas). Fecha a lista a configuração
  (`/backoffice/settings`, só `admin`), a tela única dos números que o resto do
  painel roda em cima: as regras acadêmicas e de trâmite (nota mínima, prazo do
  certificado, taxa da constancia, antecedência do aviso de contrato) e os
  parâmetros de validação do comprovante (tolerância de valor, confiança mínima
  e os dois relógios da vaga: os minutos de reserva durante o pagamento e os
  dias de validade da reserva) — estes últimos vieram de `/backoffice/payments/settings`,
  que deixou de existir: um número com duas telas donas é um número que diverge.
  O papel `teacher` já entra numa
  **visão restrita**: menu reduzido com o contador de notas abertas,
  home própria (turmas, alunos, notas e certificados pendentes dele, com a fila
  de notas antes da de certificados — certificado não sai sobre nota aberta), e
  alunos/pagamentos bloqueados — tudo escopado pelo `teacherId` da sessão,
  nunca por dado vindo do cliente. Para o docente, `/backoffice/class-groups` é
  uma **tela de trabalho própria**: cada turma dele é uma aba no estilo
  navegador (com o contador de notas abertas na aba), e sob a aba aberta a
  gestão da turma **aluno por aluno** — a lista de um lado e, do outro, o aluno
  selecionado com **nota do exame final, nota final do módulo** (0–20, aprova a
  partir da nota mínima configurada), a marca de quem não rendeu o exame (DA,
  `docs/REGRAS-NEGOCIO.md` §3) e **anotações datadas do docente** sobre o
  aluno. Estado local como todo o resto, e a escrita só existe para o docente
  da turma: admin e coordenação seguem lendo (se a coordenação pode corrigir
  nota é questão em aberto, não construída). A emissão de certificados continua
  na página da turma, linkada do cabeçalho da aba. Como `/me` ainda responde
  `teacherId: null` (não há tabela de docentes), uma conta com cargo `teacher`
  é apontada pela ponte de demonstração em `getStaffSession()` para a ficha
  `tea_01` do mock — a ponte morre com a camada de mock. De propósito não há
  seletor de papel na tela (`CLAUDE.md` §8). Cada pessoa do staff, em qualquer
  papel, gerencia a própria conta em `/backoffice/account` (aberta pelo
  dropdown do usuário no rodapé do menu, que junta perfil, a ficha do docente e
  a saída): senha
  com as exigências listadas enquanto se digita (troca real desde OOC-31), verificação em dois passos —
  obrigatória e sem botão de desligar para `admin` e `billing`
  (`CLAUDE.md` §8), opcional para os demais —, códigos de
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
  As três superfícies são geridas por **feature flag** (`CLAUDE.md` §5,
  `docs/ARCHITECTURE.md` §8): ligada, a seção aparece em produção; desligada,
  ela some do menu, a URL dá 404 e continua inteira para nós — local, preview e,
  em produção, atrás do destravamento interno (`/api/preview?token=…`, com tarja
  em toda tela enquanto está aberto). O catálogo de flags é um registro em
  código (`src/lib/feature-flags/registry.ts`); o **interruptor** é a tela
  **Funcionalidades** (`/backoffice/features`, só para contas do domínio dos
  donos), que grava em `feature_flag_overrides` pela API e registra cada troca
  no `audit_log`. A variável de ambiente (`OOC_FLAG_<CHAVE>=on|off`) continua
  existindo e ganha do painel — é o caminho de volta quando o painel é o que
  quebrou. Hoje **todas as flags estão ligadas** — o registro chegou para gerir
  o que se expõe, não para aposentar tela.

### Estado de integração por tela (`apps/app`)

Nem toda tela do backoffice fala com `apps/api` ainda — a tabela abaixo é o
retrato de hoje, tela a tela, para não depender de abrir o código para saber
o que é real:

| Tela | Estado |
| --- | --- |
| Alunos (`/backoffice/students`) | **Real**: listagem (sem quem só tem matrícula reservada), ficha e criação chamam a API. Edição é stub de frontend (fica em estado local; a escrita real ainda não existe) |
| Matrículas (`/backoffice/enrollments`) | **Real**: só vagas confirmadas (quem pagou e foi aprovado), busca/filtros e abertura manual, que avisa que a matrícula foi enviada a Pagos (`GET`/`POST /api/v1/enrollments`). A aba Reservas foi removida |
| Pagamentos e fila de revisão (`/backoffice/payments`, `/payments/review`) | **Real** (OOC-55): livro e fila leem `GET /api/v1/payments` e `/payments/review`; o comprovante abre por URL assinada (`audit_log`); aprovar (vaga `reserved → confirmed`) e rejeitar com motivo (vaga devolvida à turma) gravam e disparam o e-mail. O diálogo de revisão mostra a **leitura da IA** do comprovante (OOC-20): os cinco campos com a confiança de cada um, ou que a leitura falhou ou ainda não aconteceu — e o **veredito do semáforo** (OOC-21), em texto. Fora: credenciais do portal na aprovação, cron da janela de 5 dias, trâmites (constancia), ação em lote, ordenação por confiança e atalhos de teclado. O painel inicial (Home) continua mock |
| Cursos (`/backoffice/courses`) | **Real**: lista (aposentados inclusos, sinalizados), criar curso, opções (resumo, regra de certificado, congelamento, transferência), sair do catálogo/voltar com aviso de matrícula viva, e planos com preço agendado (`/api/v1/catalog`, com `audit_log`). A coluna `courses.local_only` deixou de existir |
| Turmas (`/backoffice/class-groups`) | **Real**: lista por período, períodos (criar, duplicar), criar/editar turma, rascunho e ciclo de vida (`draft → enrolling → in_progress → finished → closed`), ficha da turma e lista de espera manual (`/api/v1/catalog`, com `audit_log`). Continua mock: visão do docente (precisa de `teachers`, Sessão 36), roster, notas e certificados |
| Docentes (`/backoffice/teachers`) | Mock — não existe tabela `teachers` ainda (decisão deliberada, `docs/ROADMAP.md` Sessão 36) |
| Equipe (`/backoffice/team`) | **Real**: listagem, criação, convite, redefinição de senha e a bitácora de troca de cargo (lida do `audit_log`) |
| Funcionalidades (`/backoffice/features`) | **Real** |
| E-mails (`/backoffice/emails*`) | Mock |
| Relatórios (`/backoffice/reports`) | Mock — a agregação roda no navegador porque o dataset é mockado; contra a API real vira query no servidor |
| Configuração (`/backoffice/settings`) | Parcial: **Real** só a reserva durante o pagamento (`GET /settings`, `PUT /settings/checkout-hold`, com `audit_log`) — o resto são constantes fixas, alteradas só na tela |
| Conta (`/backoffice/account`) | **Real**: troca da própria senha (`POST /api/v1/me/password`, OOC-31) — pede a senha atual, aplica as mesmas exigências da tela, encerra as demais sessões abertas e grava no `audit_log`; a data da última troca vem de `GET /api/v1/me/password`. O idioma do painel fica no navegador |
| Login do backoffice, convite e redefinição de senha | **Real** — fala direto com o Better Auth (`/api/auth/sign-in/email`). "Esqueci minha senha" manda o link por e-mail (`POST /staff/password-resets/request`, OOC-30); o link gerado pelo admin na tela de Equipe continua existindo. MFA ainda não (nenhum plugin `twoFactor` configurado) |
| Login do aluno (`/login`) | Mock — qualquer submissão válida redireciona pro portal, sem checar credencial |
| Portal do aluno (`/portal/*`, todas as telas) | Mock — nenhuma chamada à API ainda |

- `packages/domain` — domínio DDD puro (entidades, usecases, portas de
  repositório), sem framework nem provedor de banco. Já inclui a porta de
  identidade/auth (`identity/`, ver `packages/domain/README.md`) e um
  vocabulário de erro HTTP reutilizável (`shared/base/errors/`).
- `packages/queue` — contrato de fila compartilhado (BullMQ/Redis).
- `packages/ocr` — o adapter OpenRouter atrás da porta `IReceiptExtractor`
  (`packages/domain`), o mesmo pra todo nível da OCR (só muda o modelo): prompt, JSON schema da resposta e a conversão pro
  domínio (valor impresso → centavos sem float, data de Lima → UTC). Só
  `apps/api` importa, e só o `index.ts` dos workers — nunca o container que as
  rotas carregam.
- `packages/db` — Postgres local via `compose.yml` (`postgres:18-alpine`) +
  schema/migrations com Drizzle Kit (`docs/ARCHITECTURE.md` §5.8). Dezessete
  migrations além da baseline: schema do Better Auth
  (`0001_better_auth_core.sql`), o modelo acadêmico e de pessoas inteiro —
  `academic_periods`, `courses`, `plans`, `plan_prices`, `class_groups`,
  `students`, `guardians`, `consents`, `enrollments`, `payments`,
  `payment_receipts`, `waitlist_entries` (`0003`) —, `pg_trgm` para busca
  (`0002`), ajustes de turma/curso (`0004`), origem da matrícula (`0005`),
  índice de busca de aluno (`0006`), `audit_log` e `staff_invites` (`0007`),
  reset de senha de staff (`0008`), o quadro de papéis atual nos `CHECK` de
  `user`/`staff_invites` (`0009`), `feature_flag_overrides` (`0010`) e a trava
  de privilégio no próprio banco (`0011`) — papel de aplicação `ooc_app` sem
  `DELETE` em `students`/`payments`/`payment_receipts`/`consents`/`audit_log`
  e sem `UPDATE` em `audit_log`, mais triggers que recusam a mesma coisa para
  o dono das tabelas (`CLAUDE.md` §6/§8), cobertas por
  `packages/db/tests/privileges.test.ts`; e `deleted_at` no catálogo,
  na matrícula e no apoderado (`0012`), completando o par da trava —
  `students` já tinha, e `consents`/`audit_log` ficam de fora
  por serem append-only (`plan_prices` também, mas ele entra na trava de
  privilégio pela `0017`); a `outbox` de notificações (`0013`), uma linha
  por e-mail a enviar; `seat_holds` e `platform_settings` (`0014`), o hold
  curto do checkout e os parâmetros que o backoffice ajusta; e
  `receipt_uploads` (`0015`), a custódia do arquivo do comprovante entre o
  upload direto ao bucket e a matrícula que ainda não existe naquele momento
  (OOC-19); `0016` (antifraude do comprovante); e `0017`, o catálogo de
  cursos (`summary`, regra de certificado, congelamento e transferência em
  `courses`) mais a trava de `plan_prices` — sem `UPDATE`/`DELETE`, com
  trigger `plan_prices_append_only` (OOC-36); `0019` liga cada leitura de
  OCR em `payment_receipts` ao upload que ela leu (uma linha por upload e
  nível) e troca o índice único global de `operation_number` por um comum
  (OOC-20). Ainda
  não existem: `teachers`, `campaigns`, `attendance`, `grades`,
  `materials`, `certificates` — essas entram nas próximas sessões do
  `ROADMAP.md`.
- `apps/api` — Fastify expondo `@ooc/domain` via HTTP e rodando os workers de
  fila. Better Auth embutido (`infra/auth/`), fala com o Postgres via
  `pg.Pool`. **Persistência real via Drizzle** — todo repositório em
  `infra/persistence/` e `infra/identity/` é Drizzle (alunos, apoderados,
  matrícula pública e manual, catálogo de turmas, staff, convites,
  redefinição de senha, `audit_log`, feature flags); não existe mais
  implementação em memória. Error handler global + logger compartilhado
  (`container.logger`) via `infra/plugins/`, incluindo a tradução dos erros
  do Better Auth pro mesmo envelope e a autorização deny-by-default (rota sem
  `.roles()`/`.owners()`/`.public()` falha o **boot**, não só o CI —
  `infra/plugins/authorization.ts`). **Upload de comprovante via signed URL
  (OOC-19):** `POST /receipt-uploads` mina um alvo de POST assinado
  (`@aws-sdk/s3-presigned-post`, `infra/storage/`) escopado pelo `seat_hold`
  — o arquivo nunca passa pela função da rota; `POST
  /receipt-uploads/:id/confirm` faz só um HEAD pra saber que o objeto chegou.
  Dali, o `receipt-upload-relay` (BullMQ, mesmo padrão do `outbox-relay`)
  oferece a linha `uploaded` ao worker `receipt-normalize`, que baixa o
  arquivo, valida os magic bytes (`file-type`), converte HEIC
  (`heic-convert`) e normaliza com `sharp` (downscale ~1000px, escala de
  cinza, EXIF removido por padrão) antes de gravar a versão processada e
  apagar a bruta. **Antifraude do comprovante (OOC-22):** o submit (checkout
  e matrícula manual) recusa nº de operação já usado no mesmo meio de
  pagamento (422 `enrollment.operation_number_already_used`); o worker de
  normalização grava sha256, pHash com recortes e EXIF, e o
  `receipt-screen` compara com os comprovantes de outros pagamentos e grava
  os sinais em `receipt_uploads.fraud_signals` — arquivo idêntico ou EXIF de
  editor mandam o pagamento pra `under_review`; pHash parecido só registra
  (regra e medição em `apps/api/CLAUDE.md`, "Antifraude do comprovante"). Os
  sinais aparecem como texto na fila de revisão do backoffice (Pagos).
  **OCR nível 1 (OOC-20):** o mesmo relay oferece o comprovante processado e
  ligado a pagamento ao worker `receipt-extract`, que manda a imagem
  processada ao Gemini 3.1 Flash-Lite via OpenRouter (`packages/ocr`, retenção
  zero exigida) com saída presa a um
  JSON schema e grava em `payment_receipts` os cinco campos (valor, nº de
  operação, meio, titular, data) com confiança por campo, nível, modelo e
  versão servida. Falha técnica é retentada 3x com backoff (nível 1r);
  esgotadas, a linha é gravada com `failure_reason`. **Só lê:**
  quem decide é o semáforo (abaixo); a escalada pro nível 2 é a Sessão 29 (o
  modelo dele já se configura e se mede, mas nada escala). A leitura aparece no diálogo de revisão de Pagos e no
  terminal com `pnpm --filter @ooc/api ocr:show`. Sem
  `OPENROUTER_API_KEY` o worker não sobe e os comprovantes ficam sem leitura. Taxa de acerto medida em [`docs/OCR-AVALIACAO.md`](docs/OCR-AVALIACAO.md).
  **Semáforo do comprovante (OOC-21):** compara o valor lido com o preço
  congelado sob tolerância (só pra cima) e limite de rejeição configuráveis no
  backoffice. **Só valida, nunca aprova:** verde deixa o pagamento pendente
  com a marca de que tudo bate, amarelo e vermelho vão pra revisão — vermelho
  como rejeição sugerida. Quem aprova é sempre uma pessoa em Pagos.

**Autorização e domínio de negócio já não dependem de Neon de staging/produção
provisionado** — rodam sobre o Postgres local. **A reconstruir** quando
staging/produção tiverem seus próprios dados de verdade: OCR e notificações
reais (o comprovante do checkout público já sobe via signed URL, é
normalizado e lido pelo nível 1 da OCR e validado pelo semáforo — acima —, mas a aprovação é sempre de uma pessoa; não há envio de e-mail real —
`send-email.worker.ts` só loga o payload). Autorização é feita na camada de
aplicação (`apps/api`), não em RLS — ver `CLAUDE.md` §8.
