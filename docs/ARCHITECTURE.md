# Arquitetura

Detalhe de apoio ao que está fechado no `CLAUDE.md`. Este documento não substitui o `CLAUDE.md` — quando os dois divergirem, `CLAUDE.md` vence.

A seção de autorização/RBAC tem origem no documento de arquitetura pré-implementação (apresentação ao cliente, ago/2026). O comparativo de hospedagem/custo que baseou a escolha de Postgres, hospedagem de `apps/api`, storage de comprovante e caixa de e-mail está na seção 5.

---

## 1. Estrutura do monorepo

pnpm workspaces com dois grupos, no mesmo padrão do diagrama do `CLAUDE.md` §3: `apps/*` é o que roda como processo/deploy próprio; `packages/*` é código compartilhado, sem processo próprio — ninguém faz `pnpm dev` dentro de um `package`.

| Pacote | Papel | Depende de | Status |
| --- | --- | --- | --- |
| `apps/landing` (`@ooc/landing`) | Site público, Astro estático | Nenhum pacote interno | Implementado |
| `apps/app` (`@ooc/app`) | Next.js App Router — portal do aluno + backoffice | Nenhum pacote interno hoje | Mockup, sem acesso a dado real |
| `apps/api` (`@ooc/api`) | Fastify — expõe `@ooc/domain` via HTTP, roda os workers de `@ooc/queue` | `@ooc/domain`, `@ooc/queue` | Scaffold rodando local, persistência em memória |
| `packages/domain` (`@ooc/domain`) | DDD puro — entidades, usecases, portas de repositório | Nenhum (núcleo — não depende de nada do monorepo) | Scaffold com contexto de exemplo |
| `packages/queue` (`@ooc/queue`) | Contrato de fila compartilhado (schemas zod, producers) | Nenhum pacote interno (só `bullmq`/`ioredis`/`zod`) | Scaffold com job de exemplo |
| `packages/db`, `notifications`, `ocr`, `i18n`, `shared` | Reservados no diagrama do `CLAUDE.md` §3 | — | Ainda não criados |

**Regra de dependência:** `apps/*` depende de `packages/*`, nunca o contrário. Dentro de `packages/*`, `@ooc/domain` é o núcleo — todo o resto pode depender dele, ele não depende de nenhum outro pacote do monorepo (nem de `@ooc/queue`, nem de infra). Hoje só `apps/api` importa `@ooc/domain` e `@ooc/queue`; `apps/app` é candidato futuro a importar `@ooc/queue` como produtor de job (ver `CLAUDE.md` §5), mas ainda não faz isso.

**Único ponto de acesso ao banco:** só `apps/api` (e seus workers) têm credencial de Postgres — reforça a decisão de autorização na aplicação da seção 2 abaixo. `apps/app` nunca fala direto com o banco.

---

## 2. Caminho A vs. Caminho B — por que autorização na aplicação

Duas filosofias válidas de mercado para onde a regra "quem pode ver o quê" é aplicada:

| | Caminho A — regra no banco (RLS) | Caminho B — regra na aplicação |
| --- | --- | --- |
| Onde vive a regra | Policy declarativa por tabela, no Postgres | Middleware/usecase, no código do backend |
| Vantagem | Defesa mais próxima do dado | Modelo mental mais familiar; banco nunca fica exposto direto à internet |
| Risco principal | Policy mal escrita vaza dado **silenciosamente**, sem erro visível | Falha de autorização é bug de API comum — risco e ferramental conhecidos |
| Exige da equipe | Domínio real de RLS + suíte de teste específica pra isso | Disciplina normal de teste de autorização por rota |

**Decisão fechada: Caminho B.** Dois motivos, não um só:

1. Enquanto o backend era Supabase, o banco ficava exposto direto ao cliente via PostgREST — RLS era a única barreira possível. Sem Supabase, todo acesso passa por `apps/api` (Fastify); o banco nunca é tocado pelo browser. A barreira de RLS deixa de ser a única linha de defesa disponível — a aplicação já é essa linha.
2. RLS exige disciplina de teste que a equipe não tem consolidada hoje. A opção mais segura é sempre a que a equipe consegue operar corretamente, não a teoricamente mais forte.

Isso não proíbe usar RLS depois como camada **extra** de defesa em profundidade — só que ela nunca é o mecanismo de aceite documentado. O mecanismo de aceite é sempre o teste de autorização da aplicação (`CLAUDE.md` §8, item 5 do portão de CI).

---

## 3. RBAC — papéis, escopo e fase

| Papel | Onde acessa | Fase | Pode | Nunca pode |
| --- | --- | --- | --- | --- |
| `admin` | Backoffice | MVP | Gestão completa, cria/promove outros papéis, configura regras | — (toda ação é auditada, sem exceção) |
| `coordinator` | Backoffice | MVP | Gerencia turmas, períodos, matrículas, relatórios acadêmicos | Não cria nem promove usuários |
| `treasury` | Backoffice | MVP | Revisão financeira, conciliação de pagamentos, aprovação individual | Sem acesso a dado acadêmico não financeiro |
| `student` | Portal do aluno | MVP | Vê os próprios dados, status de matrícula, materiais, certificados | Nunca acessa dado de outro aluno, nem manipulando URL |
| `guardian` | Portal do aluno | MVP | Dá consentimento, acompanha dados do(s) menor(es) sob sua responsabilidade | Vinculado explicitamente ao(s) estudante(s); não é papel genérico |
| `mass_approver` | Backoffice | **Fase 2** | Aprovação em lote de casos já validados com alta confiança pela IA | No MVP, aprovação é sempre individual por `treasury`/`coordinator`. Aprovação em lote sempre gera auditoria individual por caso, nunca um log agregado |
| `teacher` (docente) | Backoffice (visão restrita) | **Fase 2** | Vê e edita **apenas as próprias turmas** (frequência, notas) | Não vê aluno/turma de outro docente — checagem no usecase, não escondida na tela |

`mass_approver` e `teacher` não bloqueiam o lançamento: aprovação em lote é otimização de operação em escala, e gestão de frequência/notas pode ficar fora do primeiro lançamento se o produto inicial for só matrícula + acesso liberado. `guardian` fica no MVP porque consentimento do responsável é exigência legal desde o dia um (público menor de idade), não conveniência.

Todo papel implementado sem exceção segue a regra dura de anti-escalada de privilégio do `CLAUDE.md` §8 ("Gestão de cargos") — não repetida aqui.

---

## 4. Segurança — checklist mínimo do MVP

A maior parte já está coberta pelos mecanismos do `CLAUDE.md` §6/§8 (tabela "Erros proibidos" + seção "Segurança"). Itens do documento de origem que valem destacar por não terem mecanismo 1:1 ainda escrito:

- Anti-enumeração de conta (login/recuperação de senha respondem igual pra conta existente e inexistente) — já coberto, `CLAUDE.md` §8.
- Reautenticação por senha (não MFA completo) para ação sensível (promoção de papel, aprovação financeira) — já é o mecanismo descrito em `CLAUDE.md` §8 pra promoção de staff.
- Storage de comprovante privado, signed URL curto, acesso registrado — já coberto.

### Pendente de confirmação — não decidido ainda

O documento de origem propõe rebaixar dois itens hoje fechados no `CLAUDE.md` para Fase 2, achando que a versão MVP mais barata já cobre o risco:

- **MFA completo** (`admin`, `treasury`) — hoje `CLAUDE.md` §8 lista como obrigatório e fechado. Proposta: reautenticação por senha cobre o MVP, MFA completo (app autenticador) entra depois, quando houver tempo de engenharia pra operar sem gerar fricção de suporte (recuperação de acesso perdido, etc.).
- **Captcha** (Cloudflare Turnstile) — hoje `CLAUDE.md` §3 lista como stack fechada. Proposta: começar só com rate limit por IP, evoluir pra captcha se houver abuso real observado em produção.

**Isso não está decidido.** `CLAUDE.md` continua valendo como está até essa confirmação acontecer — ver seção 9 do `CLAUDE.md` ("avise antes de executar" quando um pedido contradiz o que está fechado).

---

## 5. Infraestrutura — hospedagem e provedores (fechado 17/08/2026)

Base: levantamento comparativo de mercado (preços, specs, latência a partir de São Paulo — usada como proxy pra latência ao Peru, região LatAm mais próxima com presença de datacenter) feito em 17/08/2026. Critério dos dois lados da comparação: **custo-benefício** (mais barato que ainda atende o requisito) vs. **mais seguro/robusto** (mais maduro em HA/compliance/isolamento de rede, ainda que mais caro). Escolhemos custo-benefício nos três itens — volume do projeto (5.000/mês normal, até 20.000/mês em pico, só 3 meses/ano, `CLAUDE.md` §1) não justifica pagar pela opção enterprise ainda.

### 5.1 Postgres gerenciado — Neon

| Critério | **Neon (escolhido)** | Alternativa mais robusta — AWS RDS/Aurora |
| --- | --- | --- |
| Preço de entrada | Pay-as-you-go, sem mínimo (~US$0,106/CU-h) | ~US$12/mês (db.t4g.micro) sem HA; Multi-AZ sobe rápido |
| Região | `sa-east-1` (São Paulo) nativa | `sa-east-1` nativa |
| Diferencial | Branching copy-on-write — casa com o fluxo expand/contract de migration que já é regra (`CLAUDE.md` §7) | Multi-AZ com failover automático, IAM, compliance mais maduro |
| Por que não a alternativa agora | — | HA enterprise e maturidade de compliance da AWS são mais do que o volume atual exige; complexidade operacional maior do que o time opera hoje |

Descartados sem chegar a comparar de perto: Aiven, Railway, Render (nenhum tem região LatAm — Aiven em nenhuma nuvem, os outros só US/EU/Singapura); Crunchy Bridge e Timescale (especialistas em Postgres com extensões — PostGIS, pgvector, time-series — que este projeto não usa; entrada de US$30-70/mês sem esse ganho não se paga).

**Trade-off aceito:** sem HA Multi-AZ automática. Revisar se o volume real de pico pressionar disponibilidade — upgrade de provedor é migração de banco, não troca de config.

**Segundo trade-off aceito, confirmado 24/08/2026:** em produção, o orçamento de `<300ms` no submit (`CLAUDE.md` §5) exige compute **sempre ligado**, sem autosuspend — isso anula a vantagem de custo do modelo serverless do Neon (cobra por hora ligada, pensado pra escalar a zero em uso picado). Comparando specs equivalentes (~1-2vCPU/4GB) always-on:

| Provedor | Preço always-on/mês |
| --- | --- |
| **Neon** (escolhido) | ~US$77-80 (compute US$0,106/CU-h × 730h + storage) |
| DigitalOcean Managed DB (Growth, 2vCPU/4GB) | ~US$61 (já inclui 60GB storage + backup + PITR) |
| AWS RDS db.t4g.medium (2vCPU/4GB) | ~US$47-66 (sa-east-1 soma 20-40% sobre base us-east-1) + storage à parte |

Neon fica ~25% mais caro que a alternativa mais barata (DO) nesse regime de uso. Decisão confirmada: **manter Neon em produção e staging** mesmo com o prêmio — motivo é simplicidade (um provedor só, branching funciona igual nos dois ambientes, zero migração de banco no meio do projeto), não desconhecimento do trade-off. Revisar se o prêmio começar a doer de verdade em volume bem maior que o atual.

### 5.2 Hospedagem de `apps/api` — Fly.io

Requisito não-negociável (`CLAUDE.md` §3): processo **always-on**, porque roda os workers de fila (BullMQ) — descarta qualquer opção serverless-puro (Cloud Run, App Runner) independente de preço ou região.

| Critério | **Fly.io (escolhido)** | Alternativa mais robusta — Northflank (BYOC) |
| --- | --- | --- |
| Preço | ~US$2-6/mês, cobrança por segundo | ~US$5-10/mês por container (~40% mais barato que Railway, mas ainda maior custo de entrada que Fly.io) |
| Região | GRU (São Paulo) nativa | Só via BYOC — conta cloud própria (AWS/GCP/DO) na região |
| Modelo de execução | VM persistente — compatível com worker de fila | Container persistente, mas dentro da sua própria conta cloud |
| Por que não a alternativa agora | — | Exige montar e manter conta cloud própria pro BYOC — mais operação do que o time tem hoje só pra ganhar isolamento de rede que o requisito atual não pede |

Descartados: AWS App Runner (descontinuado pra novo cliente a partir de abr/2026); Heroku, Railway, Render, DigitalOcean App Platform (nenhum tem região LatAm — ~110-140ms de Lima/SP em vez de ~1-5ms); Google Cloud Run (serverless — viola o requisito de always-on, mesmo tendo região `southamerica-east1` e sendo o mais barato do levantamento).

### 5.3 Caixa de e-mail (staff) — Zoho Mail Lite

Distinto do Brevo (`CLAUDE.md` §3, envio transacional/campanhas): **Brevo não hospeda caixa de e-mail** — sem servidor IMAP próprio, não dá pra alguém **receber e ler** e-mail nele. Se `contato@` ou `matricula@onlyonecoin.edu.pe` precisar de alguém respondendo manualmente, é infra separada.

| Critério | **Zoho Mail Lite (escolhido)** | Alternativa mais robusta — Google Workspace |
| --- | --- | --- |
| Preço | US$1/usuário/mês | US$8,40/usuário/mês (Business Starter) |
| Armazenamento | 5-10 GB | 30 GB pooled |
| Por que não a alternativa agora | — | Custo ~8x maior se justifica pelo admin console/MFA/DLP mais maduro do Google — não é a prioridade agora pro volume de staff do projeto |

### 5.4 Storage (comprovante de pagamento + backup) — Tigris (Fly.io)

Requisito de origem (`CLAUDE.md` §5, "Upload"): signed URL direto ao storage, upload nunca passa pela função. Egress é o custo que mais importa aqui — o backoffice reabre o comprovante toda vez que revisa um caso na fila humana (`CLAUDE.md` §5), então esse custo cresceria junto com o volume de matrícula (5.000/mês normal, até 20.000/mês em pico) se algum provedor cobrasse por download.

| Critério | **Tigris — Fly.io (escolhido)** | Alternativa considerada — Cloudflare R2 |
| --- | --- | --- |
| Preço storage | US$0,02/GB-mês | US$0,015/GB-mês (mais barato por GB) |
| Egress | US$0 sempre | US$0 sempre |
| Free tier | 5GB + 10k Class A + 100k Class B/mês | 10GB + 1M Class A + 10M Class B/mês (maior) |
| Integração | Nativo do Fly.io (`fly storage create`) — mesma conta e fatura do compute que já hospeda `apps/api` (§5.2) | Cloudflare via API própria, conta separada da Fly |
| Por que essa e não a alternativa | Prioridade dada foi consolidar com o provedor que já roda `apps/api` — signed URL, upload, worker de processamento e backup ficam na mesma conta/fatura que o compute que os usa | R2 é marginalmente mais barato por GB e tem free tier maior, mas fica numa conta Cloudflare desacoplada do compute |

Empate técnico em egress (o fator que mais pesava no critério "barato com o tempo") — decisão girou em cima de integração operacional, não preço.

**Backup também migrou pra cá:** `pg_dump` → Tigris (era Cloudflare R2 — `CLAUDE.md` §3) substituído no mesmo commit que fechou esta decisão. Um bucket-provider só pros dois usos (comprovante + backup de banco), zero conta Cloudflare no projeto pra esse fim.

**O que fica retido, e por quanto tempo** (`CLAUDE.md` §1): só a **versão processada/reduzida** do comprovante (pós downscale ~1000px/grayscale da OCR, `CLAUDE.md` §5) é persistida — não o upload bruto do celular. Retenção de **5 anos**; depois disso, política de exclusão a implementar (Ley 29733, `CLAUDE.md` §8). Essa escolha (reduzida, não bruta) é o que mantém o volume de storage pequeno mesmo em 5 anos de acúmulo.

**Acúmulo em 5 anos** (imagem reduzida ~200KB, volume `CLAUDE.md` §1 — 5.000/mês normal × 9 meses + 20.000/mês pico × 3 meses ≈ 105.000 matrículas/ano ≈ 20,3GB novos/ano):

| Ano | Acumulado (retenção rolante de 5 anos) | Custo Tigris no mês (storage) |
| --- | --- | --- |
| 1 | ~20GB | ~US$0,40/mês |
| 3 | ~61GB | ~US$1,22/mês |
| 5+ (regime permanente) | ~101GB (teto — dado mais velho que 5 anos sai) | ~US$2,00/mês |

Descartados sem chegar a comparar de perto: AWS S3/`sa-east-1` e Google Cloud Storage/`southamerica-east1` (cobram egress ~US$0,11-0,12/GB — o backoffice reabrindo comprovante em volume tornaria isso caro com o tempo); Backblaze B2 e Wasabi (sem região LatAm, egress grátis só por acordo de parceria condicional); DigitalOcean Spaces (sem região LatAm — mais perto é Toronto).

### 5.5 Ainda em aberto — auth

Postgres, hospedagem de `apps/api`, storage e caixa de e-mail estão fechados. **Auth** (login de `student`/`guardian`/staff) continua sem provedor — ver `CLAUDE.md` §3, "Decisão em aberto — auth".

---

## 6. Custo mensal estimado

Preços detalhados e fontes: `docs/INFRAESTRUTURA.md`. Três colunas — **free tier** (MVP/staging), **escala normal** (produção, 5.000 matrículas/mês, 9 meses/ano) e **escala pico** (produção, até 20.000 matrículas/mês, 3 meses/ano — `CLAUDE.md` §1). Estimativa, não orçamento fechado — premissas marcadas onde assumi algo ainda não confirmado.

| Item | Free tier | Escala normal (5k/mês) | Escala pico (até 20k/mês) | Premissa |
| --- | --- | --- | --- | --- |
| **Neon** (Postgres) | US$0 | **~US$79/mês** | **~US$79/mês** | Compute 1 CU always-on (730h × US$0,106) — cobrado por hora ligada, não por matrícula, então **não varia com o volume** (`§5.1` — trade-off do modelo serverless aceito por simplicidade) |
| **Fly.io** (`apps/api`) | Não existe (só trial) | **~US$6/mês** | **~US$10/mês** | Normal: 2 machines mínimas (API+worker). Pico: réplica extra pra throughput de fila (OCR via Gemini tem latência, fila pode acumular) |
| **Tigris** (storage) | US$0 | **~US$0,40-2/mês** (cresce com os anos até o teto de 5 anos de retenção, ver §5.4) | igual — custo é sobre o **acumulado total**, não sobre o volume do mês corrente | Só a versão reduzida (~200KB) é retida, não o upload bruto (`§5.4`) |
| **Brevo** (transacional) | US$0 — até 9.000 e-mails/mês | **US$0** — ~6.000 e-mails/mês (5.000 × ~1,2/matrícula), dentro do free | **~US$29/mês** — ~24.000 e-mails/mês (20.000 × ~1,2) **estoura o free (9k) e o tier de 20k (US$18)**, precisa do tier de 40k | Só transacional por enquanto, sem campanha (confirmado) — ~1,2 e-mail/matrícula (credencial + boas-vindas) é estimativa, ajustar quando o fluxo real de notificação for desenhado |
| **Redis (Upstash)** | US$0 — 500k comandos/mês | **US$0** | **Provavelmente US$0**, mas mais perto do limite (~300-400k comandos/mês estimado) — monitorar; se estourar, pay-as-you-go é US$0,20/100k | Fila (BullMQ) + rate limit compartilham a mesma instância |
| **Zoho Mail** (mailbox) | US$0 — até 5 caixas | US$0-3/mês | igual | Não depende do volume de aluno. Quantidade de caixas não confirmada (usei 3 de exemplo) |
| **Sentry / PostHog / Netlify / Turnstile** | US$0 | **US$0 (provável)** | **US$0 (provável)** | Não escalam linearmente com matrícula nesse volume — free tier de cada um (5k erros, 1M eventos, 100GB banda) tem folga |
| **Total produção** | — | **~US$86-88/mês** | **~US$120-125/mês** | Neon domina os dois cenários (~65-90% do total); Brevo é o item que mais varia entre normal e pico |

**Leitura**: Neon é o único item praticamente **fixo** (não varia com matrícula — é o preço do compute sempre ligado). Brevo é o item mais **sensível ao volume** — passa de grátis pra ~US$29/mês só em pico, porque envio transacional escala 1:1 com matrícula. Tigris cresce devagar e nunca fica caro porque reteve a versão pequena da imagem, não a original.
