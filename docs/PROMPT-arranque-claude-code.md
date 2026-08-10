# Prompt de arranque — Claude Code

Cole o texto abaixo na primeira conversa, depois de colocar o `CLAUDE.md` na raiz do repositório vazio.

---

Leia o `CLAUDE.md` na raiz antes de qualquer coisa. Ele tem o contexto, a stack fechada, as convenções e as regras proibidas deste projeto. Não vamos escrever código de feature hoje.

**Objetivo desta sessão: a espinha dorsal.** Infraestrutura, ambientes, modelo de dados e portões de qualidade funcionando em staging, antes de existir qualquer tela. Trabalhando sozinho num sistema que vai processar 7.000 matrículas por mês com dinheiro e dados de menores, montar isso depois é dez vezes mais caro.

## Antes de escrever nada

1. Leia o `CLAUDE.md` inteiro.
2. Verifique o que já existe no diretório e o que está instalado (`node`, `pnpm`, `supabase`, `docker`, `git`).
3. **Me faça as perguntas que faltam** — não assuma nada sobre nomes, volumes, credenciais ou contas já criadas. Se eu não tiver respondido algo, pergunte em vez de inventar.
4. Me mostre o plano em passos numerados e **espere meu OK** antes de executar.

## Escopo desta sessão

### 1. Monorepo

pnpm workspaces, TypeScript strict, na estrutura definida na seção 3 do `CLAUDE.md`. Só o scaffold — `apps/landing` (Astro) e `apps/app` (Next.js App Router) subindo em branco.

### 2. Configuração e ambiente

- Validação de env com **zod, no boot**. Falta variável, o app não sobe.
- `.env.example` versionado, `.env` no `.gitignore`.
- Zero URL literal no código.

### 3. Banco — migrations versionadas

Supabase local via Docker. Primeira migration com o modelo completo, em inglês, `timestamptz` em tudo, `amount_cents INTEGER` para dinheiro.

Tabelas mínimas:

```
academic_periods
courses                 (min_age, language, status)
plans                   (course_id)
plan_prices             (plan_id, amount_cents, valid_from, valid_to)   ← versionado
class_groups            (academic_period_id, course_id, plan_id, teacher_id,
                         schedule, start_date, end_date, capacity, seats_taken,
                         enrollment_opens_at, enrollment_closes_at, status)
students                (auth_user_id, national_id_type, national_id, deleted_at)
guardians               (student_id)
consents                (student_id, guardian_id, text_version, accepted_at, ip_address)
enrollments             (student_id, class_group_id, plan_price_id, seat_status, status)
payments                (enrollment_id, amount_cents, status, capture_method,
                         idempotency_key, reviewed_by, reviewed_at)
payment_receipts        (payment_id, storage_path, image_phash, extraction jsonb,
                         field_confidence jsonb, tier, model_name, model_version, attempts)
waitlist_entries        (class_group_id, student_id)
teachers
attendance
grades
materials               (class_group_id, kind, url)   ← só link, nunca arquivo de vídeo
certificates            (enrollment_id, kind, verification_code)
outbox                  (channel, template_key, recipient, payload jsonb,
                         status, attempts, provider_message_id, scheduled_for, error)
campaigns               (segment, subject, content_hash, status, created_by,
                         approved_by, approved_at, test_sent_at, recipient_count)
audit_log               (append-only)
user_roles              (admin | coordinator | teacher | treasury | mass_approver)
```

Obrigatório nesta migration:

- `CHECK (seats_taken <= capacity)` em `class_groups`
- Índice único em `payment_receipts` por número de operação extraído e por `image_phash`
- Índice único na idempotency key de `payments`
- `pg_trgm` para busca de aluno por nome, DNI e telefone
- **Sem grant de DELETE** em `students`, `payments`, `audit_log`
- `audit_log` sem grant de UPDATE nem DELETE, nem para admin

### 4. RLS

- **Deny by default em toda tabela.** Nenhuma tabela sem policy.
- Policies por papel conforme a seção 8 do `CLAUDE.md`. Docente vê só as próprias turmas, aluno só os próprios dados.
- **Suíte de testes de RLS** que: (a) enumera todas as tabelas e falha se alguma estiver sem policy; (b) tenta ler dado de outro papel e exige que falhe.

### 5. Fila e outbox

- `pgmq` configurado.
- Netlify Background Function como worker, com **retry, backoff exponencial e dead-letter queue**. Só o esqueleto — sem chamada de IA ainda.
- Tabela `outbox` com o adapter de notificação. Um `providers/brevo.ts` que pode ser stub por agora.
- **A guarda de e-mail já nesta sessão:** fora de produção, o provider recusa qualquer destinatário fora de uma allowlist.

### 6. i18n

- `packages/i18n` com `es-PE.json`.
- Regra de lint `no-literal-string` ativa nos diretórios de UI, quebrando o build.

### 7. Seed

Script que gera dado **fictício** — nunca dado real. Uns 500 alunos, 3 períodos, ~40 turmas em vários idiomas, 200 comprovantes de teste. Idempotente e com comando de reset.

### 8. CI — os 7 portões

GitHub Actions bloqueando merge, conforme a seção 6 do `CLAUDE.md`:

1. gitleaks
2. varredura do build por `service_role`
3. `tsc --noEmit`
4. ESLint (`no-floating-promises`, `require-await`, `no-literal-string`)
5. teste de RLS
6. migrations em banco limpo
7. validação de env com zod

### 9. Ambientes

- `netlify.toml` com contextos: `main` → produção, `staging` → branch deploy, PR → preview
- Variáveis de ambiente por contexto, documentadas
- Branch protection na `main`: PR obrigatório, CI verde, sem force-push
- Um `docs/ENVIRONMENTS.md` curto com o fluxo do dia a dia e o comando de deploy de migration

## Como conduzir

- Vá por etapas, na ordem acima. **Pare ao fim de cada uma** e me mostre o que fez antes de seguir.
- Commits pequenos, em inglês, formato convencional.
- Se algo do `CLAUDE.md` estiver ambíguo ou parecer errado, diga em vez de contornar.
- Nada de feature, tela ou chamada de IA nesta sessão. Se sentir vontade, é sinal de que estamos saindo do escopo.

Comece lendo o `CLAUDE.md`, verificando o ambiente e me apresentando o plano com as perguntas que tiver.
