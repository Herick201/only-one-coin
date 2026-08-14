# CLAUDE.md — Only One Coin · Plataforma Académica Digital

Contexto permanente do projeto. Lido em toda sessão. Se algo aqui conflitar com um pedido meu, **avise antes de seguir**.

---

## 1. O projeto

Plataforma académica para a **Asociación Only One Coin Perú** (RUC 20610561463) — instituição peruana que oferece cursos de idiomas e oficinas de baixo custo a alunos de todo o Peru.

Cinco módulos:

1. **Site público** — reescrito em código, substituindo WordPress
2. **Matrícula + leitura de comprovante por IA** — o núcleo
3. **Portal do Aluno**
4. **Backoffice administrativo**
5. **Módulo de e-mail** — transacional + campanhas

### Fluxo de negócio (não inventar variações)

```
Venda por WhatsApp (humano, fora do sistema)
  → aluno paga por Yape/Plin/transferência
  → aluno acessa /matricula e preenche o formulário
  → sobe foto do comprovante
  → IA extrai os dados e valida contra o preço do plano
  → aprovado: recebe credenciais e e-mail de bem-vindas
  → duvidoso: fila de revisão humana no backoffice
```

### Regras de negócio confirmadas

- **Pagamento único.** Não existe parcelamento, mensalidade nem inadimplência.
- **Sem descontos.** Nunca. O preço vigente do plano é o valor esperado, sempre.
- O aluno compra um **paquete** (ex.: conjunto de módulos) ou o **curso completo**. Nunca aula avulsa.
- **Vários idiomas** (~10) e várias turmas por idioma. Nada específico de idioma no código.
- Cada **período de venda** tem seus próprios cursos, horários, datas de início e vagas.
- Idade mínima por curso. **Boa parte do público é menor de idade** → consentimento do apoderado é fluxo central.
- Volume: **5.000 a 7.000 matrículas/mês** em temporada alta (3 meses/ano).

---

## 2. Fora do escopo — não construir, não sugerir

- ❌ Pasarela de pago / cobrança dentro da plataforma
- ❌ Integração com WhatsApp
- ❌ Apps nativos iOS/Android
- ❌ Hospedagem, upload ou streaming de vídeo (só link externo)
- ❌ Links de matrícula tokenizados
- ❌ Descontos, bolsas, promoções
- ❌ Parcelamento, mensalidade, relatório de morosidad
- ❌ Aula virtual / videoconferência própria
- ❌ Faturamento eletrônico / SUNAT

Se algo parecer exigir um desses, **pare e pergunte**.

---

## 3. Stack (fechada)

| Camada | Escolha |
| --- | --- |
| Site público | **Astro** (estático) |
| App (portal + backoffice) | **Next.js App Router** |
| API de domínio + workers | **Fastify** (`apps/api`), processo Node separado |
| Hospedagem | **Netlify** (landing + app) — `apps/api` ainda sem hospedagem decidida (precisa de processo always-on, não cabe em function serverless) |
| Banco / Auth / Storage | **Postgres** — decisão fechada. **Provedor gerenciado a decidir** |
| Fila | **Redis (Upstash) + BullMQ** — workers em `apps/api` |
| OCR / IA | **Gemini 3.1 Flash-Lite** (nível 1) · modelo de outra família (nível 2) |
| E-mail | **Brevo**, atrás de adapter |
| Rate limit + idempotência | **Upstash Redis** (borda) — mesma instância usada pela fila |
| Captcha | **Cloudflare Turnstile** |
| Backup | `pg_dump` → **Cloudflare R2** via Scheduled Function |
| Observabilidade | **Sentry** + **PostHog** (EU Cloud) |
| Realtime | a decidir com o provedor de backend |

Não trocar nada disso sem me perguntar. Já foram avaliadas e descartadas: Vercel, Clerk, Pinecone, Resend, Cloudflare CDN. O provedor de backend gerenciado que havia sido escolhido foi **removido** e está de novo em aberto (ver "Decisão em aberto" abaixo).

**Decisão em aberto — provedor de backend.** Postgres é decisão **fechada**. O que ainda **não** está escolhido é o **provedor gerenciado** de Postgres, auth e storage. Não escolher, não instalar SDK, não escrever código acoplado a um provedor. Se algo travar por isso, **pare e pergunte**.

**Decisão fechada — modelo de autorização.** Autorização vive na **camada de aplicação** (`apps/api`, ver §8), não em RLS — motivo e comparação de caminhos em `docs/ARCHITECTURE.md` §2. RLS pode voltar depois como camada extra de defesa, mas nunca como o mecanismo de aceite documentado.

### Monorepo

```
apps/
  landing/           Astro — site público
  app/               Next.js — portal + backoffice
  api/               Fastify — expõe @ooc/domain via HTTP + workers de fila (BullMQ/Redis)
packages/
  domain/            domínio DDD puro (entidades, usecases, portas de repositório) — sem framework, sem infra
  queue/             contrato de fila compartilhado (jobs, producers) — usado por quem publica e por quem consome
  db/                migrations + seed (CLI do provedor a decidir)
  notifications/     adapter de e-mail + outbox
  ocr/               pipeline de extração
  i18n/              locales (es-PE.json)
  shared/            tipos e utilitários
```

---

## 4. Idioma

**Código em inglês. Interface trilíngue. Conversa comigo em português.**

### Trilíngue obrigatório

**Tudo que o usuário vê tem três idiomas: `es-PE` (padrão) · `pt-BR` · `en`.** Espanhol do Peru é o idioma padrão e o fallback quando faltar tradução. Cada idioma é um arquivo de locale com a **mesma estrutura de chaves** — nunca uma chave que exista só num idioma.

| Camada | Idioma |
| --- | --- |
| Tabelas, colunas, enums, funções, variáveis, tipos | Inglês |
| Branches, commits, comentários de código | Inglês |
| Chaves de i18n | Inglês (`payment.status.under_review`) |
| **Todo texto visível ao usuário** | **Trilíngue**: `es-PE.json` (padrão) · `pt-BR.json` · `en.json` |
| Templates de e-mail, PDFs, manual | **Trilíngue**, `es-PE` padrão |
| Documentação interna e nossas conversas | Português |

Seletor de idioma visível na interface. Roteamento: `es-PE` sem prefixo, `/en` e `/pt` prefixados.

### Regra dura de i18n

**Zero string de UI dentro de `.ts` / `.tsx` / `.astro`.** Todo texto visível sai do arquivo de locale, nos três idiomas. Inclui mensagem de erro de API e corpo de e-mail. Lint quebra o build.

Motivo: a Asociación dá oficinas de quechua. Um quarto idioma (ex.: quechua) é só mais um arquivo de locale com a mesma estrutura — nunca uma caçada por strings soltas.

### Glossário (termos peruanos → código)

| Domínio | Código |
| --- | --- |
| Alumno | `student` |
| Apoderado | `guardian` |
| Docente | `teacher` |
| Aula / turma | `class_group` (nunca `class` — reservada em JS) |
| Curso | `course` |
| Paquete / plan | `plan` |
| Matrícula | `enrollment` |
| Comprobante | `receipt` |
| Constancia | `enrollment_certificate` |
| Certificado (conclusão) | `certificate` |
| Ciclo / período | `academic_period` |
| DNI | `national_id` + `national_id_type` |
| Sol / PEN | `PEN` (ISO 4217) |
| Yape, Plin, BCP, Interbank | `yape`, `plin`, `bcp`, `interbank` — minúsculo, não traduzir |

---

## 5. Regras de arquitetura

### Pagamento

- `payments` é **agnóstico de origem**. Máquina de estados: `pending → under_review → approved | rejected`.
- Dados de extração ficam em `payment_receipts`, não em `payments`.
- **`amount_cents INTEGER`.** Nunca float, nunca `numeric` de ponto flutuante.
- **Idempotency key em todo pagamento.** Duplo POST de celular ruim é certeza.
- Preço é **versionado, nunca editado**. A matrícula congela o `plan_price_id` vigente. Corrigir a tabela de preços não pode revalidar histórico.
- Tolerância de validação **configurável no backoffice**, não constante no código.

### OCR — nunca síncrono

```
submit → grava student + enrollment + payment (pending) → responde em <300ms
       → enfileira job
       → worker: normaliza imagem → pHash → extrai → valida → outbox
```

A rota de submit **não pode importar o módulo de IA.**

Escada de níveis:

| Nível | Gatilho | Ação |
| --- | --- | --- |
| 0 | pHash já visto | bloqueia |
| 1 | padrão | Gemini 3.1 Flash-Lite |
| 1r | falha técnica (timeout, 429) | retry mesmo modelo, até 3x, backoff |
| 2 | confiança baixa em campo crítico | modelo de **outra família** |
| 3 | divergência ou ilegível | fila humana |

- **Nunca mais de uma escalada.** Divergiu, é humano.
- **Concordância é o critério**, não o modelo mais caro. Os dois batem em `operation_number` e `amount` → aprova. Divergem → humano.
- Gravar `tier`, `model_name`, `model_version` e confiança por campo em toda extração.
- Pré-processar sempre: downscale ~1000px, escala de cinza, strip EXIF, converter HEIC.

### Upload

**Signed URL direto ao Storage.** A imagem nunca passa pela função — é o que derruba tudo sob volume.

### Vagas — condição de corrida

Nunca validar vaga na aplicação. Instrução atômica única:

```sql
UPDATE class_groups
   SET seats_taken = seats_taken + 1
 WHERE id = $1 AND seats_taken < capacity
RETURNING seats_taken;
```

Zero linhas = cheia. Mais `CHECK (seats_taken <= capacity)` como rede.

Estados de vaga: `reserved` (submit) → `confirmed` (pagamento aprovado) → `released` (rejeitado ou expirado). Cron libera reserva parada há mais de 5 dias.

### Notificações

Tudo passa pela tabela `outbox`. O sistema não conhece o Brevo:

```ts
interface NotificationProvider {
  sendEmail(to, templateKey, vars): Promise<{ providerId: string }>
}
```

Templates versionados no repositório, não desenhados só no painel do Brevo.

### Domínio e fila (`packages/domain`, `packages/queue`, `apps/api`)

Regra de fronteira, vale pra qualquer contexto novo (não só `example`): `packages/domain` é DDD puro (portas e adaptadores) — nunca importa Fastify, provedor de banco ou Redis, só define a **interface** de repositório. A implementação concreta mora na infra de quem consome (`apps/api/src/infra/`). Detalhe de padrão (`BaseModel`/`BaseUseCase`, `RouteBuilder`, `container.ts`, entrypoints) está em `packages/domain/README.md` e `apps/api/README.md` — não duplicado aqui. Estrutura e dependência entre os pacotes: `docs/ARCHITECTURE.md` §1.

---

## 6. Erros proibidos

Cada um tem um mecanismo. O mecanismo é obrigatório, não a boa intenção.

| Erro | Mecanismo |
| --- | --- |
| `.env` no Git | `.gitignore` + gitleaks no CI + só `.env.example` versionado |
| **Credencial de banco no bundle do cliente** | check de CI varrendo o build do Next.js. Catastrófico — só `apps/api`/workers têm connection string do Postgres |
| **E-mail real disparado de staging** | provider recusa destinatário fora da allowlist quando `NODE_ENV !== production` |
| Rota sem checagem de papel | middleware deny-by-default em `apps/api`; rota sem papel declarado falha no CI |
| SQL rodado à mão no painel de produção | só migration versionada |
| Sem rate limiting | middleware deny-by-default; rota sem política declarada falha no CI |
| Commit direto na `main` | branch protection: PR + CI verde |
| Stack trace ao usuário | error boundary → mensagem genérica + `error_id`. Detalhe só no Sentry |
| `localhost` fixo no código | tudo via env validada com zod no boot + regra de lint |
| `async` sem tratamento | `no-floating-promises`, `require-await`, handler de `unhandledRejection`, DLQ na fila |
| Float para dinheiro | `amount_cents INTEGER` |
| Data sem timezone | `timestamptz` sempre, UTC no banco, `America/Lima` só na renderização |
| Delete físico | sem grant de DELETE em student, payment, audit. Só `deleted_at` |
| PII em log | redaction de nome, DNI, e-mail, payload de comprovante. Scrubbing no Sentry |
| Dado real de produção em staging | seed anonimizado, nunca dump |
| Backup nunca restaurado | restauração testada em staging por trimestre |

### Portão de CI (bloqueia merge)

1. gitleaks
2. varredura do build do Next.js por credencial de banco
3. `tsc --noEmit`
4. ESLint (`no-floating-promises`, `no-literal-string`)
5. teste de autorização — toda rota de `apps/api` declara papel exigido; teste tenta acessar com papel errado e exige falha
6. migrations em banco limpo
7. validação de env com zod

---

## 7. Ambientes

| Ambiente | Onde |
| --- | --- |
| Local | Postgres local (provedor a decidir) |
| Staging | `staging.aula.onlyonecoin.edu.pe` · Postgres gerenciado próprio (provedor a decidir) |
| Produção | `aula.onlyonecoin.edu.pe` · Postgres gerenciado próprio (provedor a decidir) |

- Netlify: `main` → produção, `staging` → branch deploy, PR → deploy preview
- Variáveis de ambiente **por contexto** do Netlify
- **Migrations sempre aditivas.** Renomear/apagar em duas etapas (expand/contract), separadas por semanas
- Migration em produção **sempre depois de backup**
- Staging nunca recebe dado real

---

## 8. Segurança

- Autorização **deny-by-default na camada de aplicação** (`apps/api`, Caminho B — ver §3): toda rota/usecase declara explicitamente o(s) papel(is) permitido(s); rota sem declaração falha o CI. Teste automatizado cobre toda rota sensível, tentando acessar com papel errado e exigindo falha.
- Só `apps/api` (e workers) têm credencial de acesso ao Postgres. O Next.js (`apps/app`) nunca fala direto com o banco — tudo passa pela API.
- Bucket de comprovantes privado, signed URL de 5 min, caminho escopado por aluno, acesso registrado
- Docente vê só as próprias turmas — checagem explícita no usecase (`teacher_id` do usuário autenticado comparado ao dado), nunca um filtro montado a partir de input do cliente
- Nenhum id vindo do cliente é confiado (anti-IDOR)
- MFA obrigatório: `admin`, `treasury`, `mass_approver`
- Anti-enumeração: login e recuperação de senha respondem igual para conta existente e inexistente
- Upload validado por **magic bytes**, re-encode da imagem, teto de tamanho
- Headers: CSP, HSTS, X-Frame-Options, Referrer-Policy
- `audit_log` append-only: sem grant de UPDATE nem DELETE, nem para admin
- Ley 29733: consentimento com timestamp, versão do texto e IP; política de retenção; exclusão a pedido

Papéis: `admin`, `coordinator`, `teacher`, `treasury`, `mass_approver`. Aluno e apoderado: `student`, `guardian`.

### Pontos de entrada separados (portal ≠ backoffice)

Um **único backend de auth** (um só provedor de auth, um só registro de usuários) — a separação de acesso é a checagem de **`role`** em `apps/api`, nunca a tela. Mas **duas telas de login distintas**, pelo mesmo app Next.js (não são dois deploys):

- **Portal do aluno** — `/` ou `/portal`, linkado da landing, indexável, sem MFA. **Sem auto-cadastro**: o aluno recebe credenciais por e-mail após aprovação, não se registra.
- **Backoffice** — path discreto (`/backoffice`), **nunca linkado na landing nem indexável**, MFA no fluxo. É defesa em profundidade, não a defesa.
- **Docente** entra pelo backoffice, mas vê só as próprias turmas — checagem no usecase, não filtro solto.
- **Redirect por `role` sempre server-side.** O cliente nunca escolhe "sou aluno/sou admin"; o `role` vem do banco, lido por `apps/api`.

### Gestão de cargos — anti-escalada de privilégio

O `role` **nunca** mora em lugar que o próprio usuário escreve. Regras duras:

- `role` vive em tabela protegida (ex.: `user_roles`). `apps/api` **não expõe rota genérica de `UPDATE`** nela — a única forma de mudar `role` é um usecase dedicado de promoção (não um `PATCH` de usuário comum), nem para o próprio dono, nem para admin comum fora desse fluxo.
- **Nunca** guardar `role` em algo editável pelo usuário (ex.: `user_metadata` de provedores de auth que expõem isso). Se o provedor de auth suportar custom claim, ele é preenchido **server-side**, a partir da tabela protegida.
- `apps/api` lê o `role` a partir do registro do usuário autenticado no banco a cada requisição sensível — **nunca** de header/JWT montado pelo cliente.
- Toda mudança de cargo → `audit_log` append-only.

**Modelo de criação de staff (fechado):**

1. **Bootstrap:** o primeiro `admin` nasce por **migration versionada**.
2. **Depois:** **só `admin`** cria/promove staff, pela UI, via usecase dedicado (`packages/domain`) que exige **re-autenticação fresca** do admin. Nenhum outro papel promove ninguém. (Sob RLS/Supabase isso seria uma função `SECURITY DEFINER` no banco — agora é um usecase em `apps/api`, mesma regra, camada diferente.)

---

## 9. Como trabalhar comigo

- **Não invente regra de negócio.** Se eu der um exemplo, é exemplo — não generalize para regra. Em dúvida, pergunte.
- **Pergunte antes de assumir** volume, preço, nome de curso, quantidade de turmas.
- Mudança de banco = migration versionada. Nunca `psql` direto em ambiente remoto.
- Commits pequenos e em inglês, no formato convencional (`feat:`, `fix:`, `chore:`).
- Antes de escrever código novo, diga em uma linha o que vai fazer e onde.
- Se um pedido meu contradisser este arquivo, **avise antes de executar**.
- Prefira explicitar o trade-off a escolher em silêncio.

---

## 10. Documentação viva

**Nenhuma decisão de arquitetura termina no código.** Toda sessão que fecha, muda ou reverte uma decisão — de stack, de modelo de autorização, de RBAC, de fluxo de negócio — só está pronta quando a documentação reflete isso. "Depois eu atualizo" não é aceitável: a doc desatualizada é o que faz a próxima sessão (minha ou sua) tomar decisão em cima de premissa errada.

- **`CLAUDE.md`** é a fonte da verdade — qualquer decisão fechada (stack, arquitetura, regra de negócio confirmada) vive aqui, sempre que a mudança tocar algo que já está neste arquivo.
- **`docs/ARCHITECTURE.md`** guarda o detalhe que não cabe no `CLAUDE.md` sem inchar (ex.: tabela completa de RBAC, comparação de caminhos de decisão, checklist de segurança) — `CLAUDE.md` referencia, não duplica.
- **`README.md`** reflete o **estado real do repo** — o que existe hoje, não o plano. Se `Estado atual` descreve algo que não é mais verdade, é bug de documentação, trato como trato bug de código.
- **`docs/ROADMAP.md`** é atrelado ao contrato — sinalizar quando ficar desatualizado, **nunca editar sem confirmação minha**.
- Doc nova (ex.: `docs/ARCHITECTURE.md`) é linkada na seção "Documentos" do `README.md` no mesmo commit que a cria — doc órfã não existe pra quem não sabe procurar.

Antes de considerar uma sessão pronta: **alguma doc ficou desatualizada com o que acabei de fazer?** Se sim, atualiza antes de terminar, não depois.
