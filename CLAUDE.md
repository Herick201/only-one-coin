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
| Hospedagem | **Netlify** (dois sites, uma conta) |
| Banco / Auth / Storage | **Supabase** (Postgres + RLS) |
| Fila | **pgmq** + Netlify Background Function (15 min) |
| OCR / IA | **Gemini 3.1 Flash-Lite** (nível 1) · modelo de outra família (nível 2) |
| E-mail | **Brevo**, atrás de adapter |
| Rate limit + idempotência | **Upstash Redis** (borda) |
| Captcha | **Cloudflare Turnstile** |
| Backup | `pg_dump` → **Cloudflare R2** via Scheduled Function |
| Observabilidade | **Sentry** + **PostHog** (EU Cloud) |
| Realtime | Supabase Realtime |

Não trocar nada disso sem me perguntar. Já foram avaliadas e descartadas: Vercel, Clerk, Pinecone, Resend, Cloudflare CDN, fila no Redis.

### Monorepo

```
apps/
  landing/           Astro — site público
  app/               Next.js — portal + backoffice
packages/
  db/                migrations (Supabase CLI) + seed
  notifications/     adapter de e-mail + outbox
  ocr/               pipeline de extração
  i18n/              locales (es-PE.json)
  shared/            tipos e utilitários
```

---

## 4. Idioma

**Código em inglês. Interface em espanhol do Peru. Conversa comigo em português.**

| Camada | Idioma |
| --- | --- |
| Tabelas, colunas, enums, funções, variáveis, tipos | Inglês |
| Branches, commits, comentários de código | Inglês |
| Chaves de i18n | Inglês (`payment.status.under_review`) |
| **Todo texto visível ao usuário** | **Espanhol (PE)**, em `es-PE.json` |
| Templates de e-mail, PDFs, manual | Espanhol (PE) |
| Documentação interna e nossas conversas | Português |

### Regra dura de i18n

**Zero string em espanhol dentro de `.ts` / `.tsx`.** Inclui mensagem de erro de API e corpo de e-mail. Lint quebra o build.

Motivo: a Asociación dá oficinas de quechua. Se quiserem interface bilíngue, é um arquivo novo, não uma caçada.

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

---

## 6. Erros proibidos

Cada um tem um mecanismo. O mecanismo é obrigatório, não a boa intenção.

| Erro | Mecanismo |
| --- | --- |
| `.env` no Git | `.gitignore` + gitleaks no CI + só `.env.example` versionado |
| **`service_role` no bundle do cliente** | check de CI varrendo o build. Catastrófico |
| **E-mail real disparado de staging** | provider recusa destinatário fora da allowlist quando `NODE_ENV !== production` |
| Tabela sem RLS | teste que enumera tabelas e falha se faltar policy |
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
2. varredura do build por `service_role`
3. `tsc --noEmit`
4. ESLint (`no-floating-promises`, `no-literal-string`)
5. teste de RLS — toda tabela com policy
6. migrations em banco limpo
7. validação de env com zod

---

## 7. Ambientes

| Ambiente | Onde |
| --- | --- |
| Local | Supabase via Docker |
| Staging | `staging.aula.onlyonecoin.edu.pe` · projeto Supabase próprio |
| Produção | `aula.onlyonecoin.edu.pe` · projeto Supabase próprio |

- Netlify: `main` → produção, `staging` → branch deploy, PR → deploy preview
- Variáveis de ambiente **por contexto** do Netlify
- **Migrations sempre aditivas.** Renomear/apagar em duas etapas (expand/contract), separadas por semanas
- Migration em produção **sempre depois de backup**
- Staging nunca recebe dado real

---

## 8. Segurança

- RLS em **todas** as tabelas, deny by default, com teste automatizado
- `service_role` só em rota de servidor e worker
- Bucket de comprovantes privado, signed URL de 5 min, caminho escopado por aluno, acesso registrado
- Docente vê só as próprias turmas — **via RLS**, não filtro de aplicação
- Nenhum id vindo do cliente é confiado (anti-IDOR)
- MFA obrigatório: `admin`, `treasury`, `mass_approver`
- Anti-enumeração: login e recuperação de senha respondem igual para conta existente e inexistente
- Upload validado por **magic bytes**, re-encode da imagem, teto de tamanho
- Headers: CSP, HSTS, X-Frame-Options, Referrer-Policy
- `audit_log` append-only: sem grant de UPDATE nem DELETE, nem para admin
- Ley 29733: consentimento com timestamp, versão do texto e IP; política de retenção; exclusão a pedido

Papéis: `admin`, `coordinator`, `teacher`, `treasury`, `mass_approver`.

---

## 9. Como trabalhar comigo

- **Não invente regra de negócio.** Se eu der um exemplo, é exemplo — não generalize para regra. Em dúvida, pergunte.
- **Pergunte antes de assumir** volume, preço, nome de curso, quantidade de turmas.
- Mudança de banco = migration versionada. Nunca `psql` direto em ambiente remoto.
- Commits pequenos e em inglês, no formato convencional (`feat:`, `fix:`, `chore:`).
- Antes de escrever código novo, diga em uma linha o que vai fazer e onde.
- Se um pedido meu contradisser este arquivo, **avise antes de executar**.
- Prefira explicitar o trade-off a escolher em silêncio.
