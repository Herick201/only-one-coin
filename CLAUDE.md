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
- Volume: **5.000/mês** em escala normal (9 meses/ano) · **até 20.000/mês** em escala pico / temporada alta (3 meses/ano).
- **Constancia de matrícula é procedimento pago** (S/25) — não é um botão grátis. Entra como **solicitação com pagamento associado**: mesmo fluxo de comprovante + OCR da matrícula, e só vira documento com o pagamento aprovado. Vale para os demais procedimentos da tabela (`docs/REGRAS-NEGOCIO.md` §5).
- **Certificado de finalização é grátis**, em até **25 dias úteis** do término. Exige nota **≥ 14**; DA (não rendeu exame final) não recebe. Inglés Básico exige também o **exame de certificação** solicitado à parte.
- **Emissão de certificado é em lote por turma, com gate humano.** O sistema deixa a lista pronta; a coordenação confirma. Nunca disparo automático por data — quem concluiu é decisão da coordenação. Detalhe em `docs/DOCUMENTOS-E-CERTIFICADOS.md`.
- Comprovante: retido por **5 anos**. Só a **versão processada/reduzida** (pós downscale/grayscale da OCR, `CLAUDE.md` §5) é retida — não o upload original bruto.

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
| Hospedagem | **Netlify** (landing + app) · **Fly.io** (`apps/api`, região GRU/São Paulo — VM always-on, roda os workers de fila) |
| Banco | **Postgres** gerenciado — **Neon** (`sa-east-1`/São Paulo) |
| Storage (comprovante + backup) | **Tigris** (nativo do Fly.io — `fly storage create`, S3-compatible, egress zero) — mesmo bucket-provider pros dois usos, sem conta separada |
| Auth | **Better Auth** — biblioteca embutida no processo de `apps/api` (Fastify), nunca instanciada em `apps/app` |
| Fila | **Redis (Upstash) + BullMQ** — workers em `apps/api` |
| OCR / IA | **Gemini 3.1 Flash-Lite** (nível 1) · modelo de outra família (nível 2) |
| E-mail (transacional/campanhas) | **Brevo**, atrás de adapter |
| E-mail (caixa/mailbox de staff) | **Zoho Mail Lite** — Brevo não hospeda caixa (sem IMAP próprio); usar só se alguém precisar **receber e ler** e-mail em `contato@`/`matricula@` |
| Rate limit + idempotência | **Upstash Redis** (borda) — mesma instância usada pela fila |
| Captcha | **Cloudflare Turnstile** |
| Backup | `pg_dump` → **Tigris** via Scheduled Function (mesmo storage do comprovante) |
| Observabilidade | **Sentry** + **PostHog** (EU Cloud) |
| Realtime | a decidir — item de infra que segue em aberto por conta própria |

Não trocar nada disso sem me perguntar. Já foram avaliadas e descartadas: Vercel, Clerk, Pinecone, Resend, Cloudflare CDN. O provedor de backend gerenciado que havia sido escolhido foi **removido**; Postgres, hospedagem de `apps/api`, storage de comprovante, caixa de e-mail e auth já foram refechados (acima, sessão 17/08/2026 para os quatro primeiros, `docs/ARCHITECTURE.md` §5; auth fechado depois — ver abaixo e `docs/ARCHITECTURE.md` §5.6).

**Decisão fechada — auth.** O provedor removido cobria Postgres, auth e storage juntos; os três já foram resolvidos (Neon, Better Auth e Tigris, acima). Better Auth é uma **biblioteca embutida no processo do backend**, não um serviço hospedado externo — roda dentro do próprio `apps/api`, aceita conexão Postgres existente, e o campo `role` fica travado contra escrita client-side (`additionalFields.role`, `input:false`). Padrão de integração completo (porta em `packages/domain`, adapter em `apps/api/src/infra`, `apps/app` nunca instanciando o provedor) em `docs/ARCHITECTURE.md` §5.6.

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
  db/                schema + migrations (Drizzle Kit) + seed — mesma DATABASE_URL local/Neon
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

**Zero código de domínio na tela.** Enum, flag, id técnico e nome de campo (`amount_mismatch`, `pp_en_a1_v3`, `yape`, `enr_1188`) nunca aparecem para o usuário — sempre resolvidos em texto pelo locale. Se um dado da UI pode ser código, o tipo diz qual é (união discriminada), não uma string solta. Exceção: nome próprio de marca (`Yape`, `Plin`, `BCP`) e dado real do aluno (nome de curso, número de operação).

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

**Exceção documentada à regra acima:** o vocabulário de erro HTTP (`packages/domain/src/shared/base/errors/` — `HttpError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `UnableToProcessEntryError`) carrega uma noção de HTTP (`status`) dentro do pacote de domínio. Decisão consciente pra reaproveitar o mesmo vocabulário entre `apps/api` e qualquer bounded context futuro, em vez de duplicar a classe do lado de fora. Nada além dessas classes pode importar ou expor tipo de framework — o resto do pacote continua puro.

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
| Local | Postgres local |
| Staging | `staging.aula.onlyonecoin.edu.pe` · Postgres gerenciado (Neon, branch de staging) |
| Produção | `aula.onlyonecoin.edu.pe` · Postgres gerenciado (Neon) |

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

Emitem documento (constancia, certificado) e disparam o lote de uma turma: `admin`, `coordinator`, `teacher` — o docente **só nas próprias turmas**, checado no usecase. `treasury` e `mass_approver` não emitem. Toda emissão e todo reenvio de e-mail vão para o `audit_log`.

### Pontos de entrada separados (portal ≠ backoffice)

Um **único backend de auth** (um só provedor de auth, um só registro de usuários) — a separação de acesso é a checagem de **`role`** em `apps/api`, nunca a tela. Mas **duas telas de login distintas**, pelo mesmo app Next.js (não são dois deploys):

- **Portal do aluno** — `/` ou `/portal`, linkado da landing, indexável, sem MFA. **Sem auto-cadastro**: o aluno recebe credenciais por e-mail após aprovação, não se registra.
- **Backoffice** — path discreto (`/backoffice`), **nunca linkado na landing nem indexável**, MFA no fluxo. É defesa em profundidade, não a defesa.
- **Docente** entra pelo backoffice, mas vê só as próprias turmas — checagem no usecase, não filtro solto.
- **Redirect por `role` sempre server-side.** O cliente nunca escolhe "sou aluno/sou admin"; o `role` vem do banco, lido por `apps/api`.

### Gestão de cargos — anti-escalada de privilégio

O `role` **nunca** mora em lugar que o próprio usuário escreve. Regras duras:

- `role` vive em coluna protegida na própria tabela `user` gerenciada pelo Better Auth (`additionalFields.role`, `input:false` — API pública de signup/update não aceita esse campo). `apps/api` **não expõe rota genérica de `UPDATE`** nela — a única forma de mudar `role` é um usecase dedicado de promoção (não um `PATCH` de usuário comum), nem para o próprio dono, nem para admin comum fora desse fluxo.
- **Nunca** guardar `role` em algo editável pelo usuário (ex.: `user_metadata` de provedores de auth que expõem isso). `input:false` garante que o `role` do Better Auth é preenchido **server-side**, nunca a partir do payload de cadastro/perfil do usuário.
- `apps/api` lê o `role` a partir do registro do usuário autenticado no banco a cada requisição sensível — **nunca** de header/JWT montado pelo cliente.
- Toda mudança de cargo → `audit_log` append-only.

**Modelo de criação de staff (fechado):**

1. **Bootstrap:** o primeiro `admin` nasce por **migration versionada**.
2. **Depois:** **só `admin`** cria/promove staff, pela UI, via usecase dedicado (`PromoteUserRoleUseCase`, `packages/domain/src/identity/`) que exige **re-autenticação fresca** do admin. Nenhum outro papel promove ninguém. O plugin `admin` do Better Auth não garante reautenticação fresca sozinho — é o usecase, não o provedor, que impõe essa checagem antes de escrever o `role`.

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
