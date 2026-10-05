# Autenticação real do aluno

Desenho aprovado em 05/10/2026. ROADMAP Sessão 31 (o pedaço do aluno — o login
de staff já é real).

## Problema

O login do aluno (`apps/app/src/app/[locale]/login`) é um stub: a server action
valida o formato e redireciona qualquer submit ao portal mockado. Não existe
conta de aluno — `students` não tem `user_id`, nada cria conta na aprovação e o
template `portal_credentials` está definido mas nunca é emitido. O portal
inteiro lê `lib/portal/mock-data.ts` e não tem guarda.

E há uma porta aberta: o Better Auth está com `emailAndPassword.enabled` e sem
`disableSignUp`, então `POST /api/auth/sign-up/email` cria hoje uma conta
`student` para qualquer um. Inofensivo enquanto nenhuma rota aceita `student`;
vira auto-cadastro no instante em que o login do aluno for real.

## Decisões (do dono, 05/10/2026)

1. **Reabre a OOC-55.** "Credenciais do portal na aprovação" sai do *Fora*: a
   **primeira** aprovação de pagamento do aluno cria a conta e envia
   `portal_credentials` com um link de definir senha. A senha nunca vai por
   e-mail — o outbox guarda `vars` em texto.
2. **Portal: identidade real, resto mock.** O aluno logado vê o próprio nome e
   e-mail no cabeçalho e no perfil; cursos, pagamentos, trâmites e documentos
   seguem mock com o aviso atual. Ligar os dados reais é outra sessão.
3. **Política de senha do aluno: mínimo 10, ao menos uma letra e um dígito**
   (staff segue 12, e tem MFA; aluno não tem).
4. **E-mail em conflito não cria conta e não trava a aprovação.** Quando o
   e-mail do aluno já é de outra conta (outra pessoa — irmãos com o mesmo Gmail,
   ou staff), a aprovação segue (vaga confirmada, `payment_approved`), a conta
   não é criada, o caso vai pro `audit_log` e Pagos mostra o aviso.
5. **Botão "Enviar acesso ao portal" no backoffice** cobre quem foi aprovado
   antes desta mudança e o conflito de e-mail depois de corrigido. Sem script
   de backfill em massa.
6. **Abordagem do login: rota própria que resolve o identificador e delega ao
   Better Auth** (descartadas: plugin `username`, que duplicaria o documento em
   `user.username`; e sessão emitida à mão, que reimplementaria a assinatura do
   cookie).

## 1. Modelo de dados — migration `0022` (aditiva)

- **`students.user_id`** `text` nulo, FK → `"user"(id)` `on delete restrict`,
  com índice. **Não é único:** fichas duplicadas da mesma pessoa (mesmo
  documento normalizado) apontam pra mesma conta. Quando o índice único de
  documento existir (consolidação das duplicatas, `CLAUDE.md` §1), isso se
  resolve sozinho.
- **`students_portal_national_id_idx`**: índice de expressão sobre o documento
  normalizado em SQL (só fichas com conta), que serve a busca do login por
  documento sem depender de a ficha ter sido gravada normalizada.
- **`portal_access_tokens`**: `id uuid`, `user_id text` (FK → `"user"`),
  `token_hash text` único, `purpose text` (`activation` | `reset`, CHECK),
  `expires_at timestamptz`, `used_at timestamptz` nulo, `created_at timestamptz`.
  - Token de 32 bytes aleatórios (base64url) vai só no link; o banco guarda o
    **SHA-256**. Diverge de `staff_invites` (texto puro, link copiado à mão por
    quem convida): aqui são milhares de contas e o token entrega a conta.
  - Validade: `activation` **7 dias**, `reset` **60 minutos**.
  - Emitir um token novo marca como usados os pendentes do mesmo usuário e
    propósito — só o link mais recente vale.
- Papéis: `student` já está no CHECK de `user.role` (`0009`). Nada muda.

## 2. Criação da conta — `IPortalAccountProvisioner`

Porta de domínio, implementação Drizzle em `apps/api/src/infra`, que roda sobre
uma transação recebida. Entrada: o `studentId`. Resultado (união discriminada):

| Caso | O que faz | Resultado |
| --- | --- | --- |
| Ficha já tem `user_id` | nada | `already_linked` |
| Outra ficha com o mesmo documento normalizado já tem conta | liga esta ficha àquela conta, sem e-mail | `linked_existing` |
| E-mail (normalizado) já é de outra conta em `"user"` | nada; audit `portal_access.email_conflict` | `email_conflict` |
| Senão | grava `"user"` (`role = 'student'`, `emailVerified = false`, nome da ficha), **sem** linha em `account`; liga `students.user_id`; token `activation`; outbox `portal_credentials` | `created` |

Sem linha em `account` não há senha: o `signInEmail` do Better Auth recusa com
o mesmo `INVALID_EMAIL_OR_PASSWORD` de credencial errada (já calcula o hash pra
gastar o mesmo tempo — `sign-in.mjs:320-337` na 1.7.1).

`portal_credentials` vai **só pro aluno**, nunca pro apoderado
(`enrollmentEmails.ts`, regra já escrita). Vars: `recipientName`, `loginEmail`,
`accessUrl` = `${PORTAL_PUBLIC_URL}{/pt|/en}/access/<token>`. Locale `es-PE`,
como o resto da liquidação. Dedupe `portal_credentials:<userId>:<tokenId>`.
O link carrega o token cru, então a linha do outbox não pode guardá-lo pra
sempre: ao chegar num estado final (`sent`, `blocked`, `failed` definitivo) o
mesmo UPDATE tira `accessUrl`/`resetUrl` de `vars`; tentativa que ainda vai
ser repetida mantém o link.

### Na aprovação

`SettlePaymentUseCase` chama o provisionador quando a decisão é `approve`,
**dentro da mesma transação** de `DrizzlePaymentSettlementRepository.settle`:
se a liquidação desfaz, conta, token e e-mail desfazem junto. O resultado sobe
como `portalAccess` em `SettlePaymentOutput`; Pagos mostra aviso quando é
`email_conflict`. A aprovação nunca falha por causa da conta.

Idempotência: o mensual aprova vários módulos — só o primeiro cria; os demais
caem em `already_linked`.

### Botão "Enviar acesso ao portal"

`POST /api/v1/students/:id/portal-access` — `master`, `admin`,
`enrollment_supervisor`. Exige ao menos uma vaga `confirmed` do aluno (senão
422 `portal_access.no_confirmed_enrollment`). Roda o provisionador fora da
liquidação e, quando a conta já existe:

- conta sem senha → reemite token `activation` + `portal_credentials`;
- conta com senha → token `reset` + `portal_password_reset`.

Audit `portal_access.issued` (com o caso). A ficha do aluno mostra o estado:
*sem conta* · *aguardando ativação* · *ativo*.

### Fechar o auto-cadastro

- `emailAndPassword.disableSignUp: true` no Better Auth. Atenção: isso bloqueia
  também `auth.api.signUpEmail` chamado do servidor (`sign-up.mjs:145`).
- Por isso `BetterAuthStaffAccountProvisioner` e `scripts/seed-admin.ts` passam
  a gravar `"user"` + `account` (`providerId = 'credential'`, `issuer`,
  `hashPassword` de `better-auth/crypto`) direto, num helper compartilhado com o
  provisionador do aluno.
- Teste exige que `POST /api/auth/sign-up/email` recuse.

## 3. Login — `POST /api/v1/portal/sign-in`

`.public()`. Corpo:
`{ method: "email" | "national_id", identifier, nationalIdType?, password }`.

1. **Formato** validado com zod (`EmailField`; `NationalIdTypeSchema` +
   `refineNationalId` na porta do documento). Formato inválido responde **o
   mesmo 401** de credencial errada — nunca um 400 que diga o campo.
2. **Resolução no servidor** (`IStudentCredentialLookup`):
   - e-mail → `normalizeEmail` → `"user"` com `role = 'student'` e não banido;
   - documento → `students` com `user_id` preenchido e `deleted_at is null` (a
     busca exige ficha viva ligada à conta) → `"user"` (mesmos filtros). A
     comparação normaliza em SQL, então fichas gravadas antes da OOC-64 também
     entram.
   - Não achou → e-mail sentinela que nunca existe (`no-account@invalid.local`).
3. **Delegação:** `auth.api.signInEmail({ body: { email, password }, returnHeaders: true })`;
   repassa o `Set-Cookie`. Staff que tente pela porta do portal cai no sentinela.
4. **Resposta:** `204` no sucesso; `401 auth.invalid_credentials` em qualquer
   falha (formato, inexistente, sem senha, senha errada, staff, banido). O
   e-mail resolvido nunca volta ao cliente.

**Rate limit** (números provisórios, mesmo status dos de OOC-24):

- `portalSignIn:ip` — 30 / 10 min. Folgado: laboratório de colégio e cabina.
- `portalSignIn:id` — 10 / 15 min, `by: "key"`, chave = SHA-256 de
  `método + tipo + identificador normalizado`. Conta tentativa, não só falha.
- O catch-all do Better Auth ganha, em `sign-in/email`, a regra por e-mail
  equivalente — protege o staff e fecha o desvio do aluno direto por lá.

## 4. Recuperação de senha

- **`POST /api/v1/portal/password-resets/request`** — `.public()`, Turnstile.
  Corpo `{ method, identifier, nationalIdType?, captchaToken }`. **Sempre 202,
  corpo vazio** — conta existente ou não, captcha falho ou não. Achou aluno com
  conta → token `reset` + outbox `portal_password_reset` (template novo, vars
  `recipientName`, `resetUrl`), pro e-mail da conta, nunca pro apoderado.
  Cooldown de 60 s por conta. Rate limit 10 / 10 min por IP e 3 / hora por
  identificador. Audit `portal.password_reset_requested`.
  - Conta sem senha (ativação pendente) recebe um token `activation` novo e o
    `portal_credentials` — quem perdeu o primeiro e-mail recupera por aqui.
- **`GET /api/v1/portal/access-tokens/:token`** — `.public()`, responde
  `{ state: "valid" | "expired_or_used", purpose }`. Sem e-mail, sem nome.
- **`POST /api/v1/portal/access-tokens/:token/complete`** — `.public()`, corpo
  `{ password }` validado pela `StudentPasswordPolicy`. Grava a senha (cria a
  linha `account` na ativação, atualiza na recuperação), marca o token usado,
  **revoga todas as sessões** do usuário, audit `portal.password_set`. Token
  inválido/expirado/usado → 410 `portal_access.link_invalid`.
- Rate limit dos dois de token: 30 / 10 min por IP (como `staffLink`).

## 5. Política de senha

`StudentPasswordPolicy` em `packages/domain/src/identity/`: 10 a 128
caracteres, ao menos uma letra e um dígito. Usada no `complete` e no formulário
(mesmo módulo, importável pelo app). De quebra, as rotas de conclusão de
convite e de recuperação do staff, que hoje aceitam `min(8)`, passam a usar a
`StaffPasswordPolicy` (12) que já existe.

## 6. Sessão do aluno no resto da API

`GET /api/v1/portal/me` — `.roles("student")`, a primeira rota com papel de
aluno. Devolve `{ firstName, lastName, email }` da ficha ligada à conta (a mais
recente não aposentada, quando há duplicatas); conta `student` sem ficha → 403. O `/me` do staff segue recusando aluno.

## 7. Front (`apps/app`)

- **`/login`:** o form chama `/api/v1/portal/sign-in` pelo proxy same-origin
  (mesmo padrão do login de staff — `Set-Cookie` e IP do cliente chegam
  certos). Sai a server action mock e o `mock_notice`. A porta do documento
  ganha o seletor de tipo (DNI / CE / Pasaporte). Falha = mensagem genérica com
  `errorId`. "Esqueci minha senha" vira link.
- **`/forgot-password`** (nova): e-mail ou documento + Turnstile (componente do
  checkout). Depois do envio, sempre a mesma tela: "se existir uma conta,
  enviamos um e-mail".
- **`/access/[token]`** (nova): ativação e recuperação. Senha + confirmação,
  regras da política visíveis, fim leva ao `/login`. Link inválido → tela que
  aponta pra "esqueci minha senha".
- **Guarda do portal:** `portal/layout.tsx` troca o `getPortalSession()` do
  mock por `getStudentSession()` → `/api/v1/portal/me`; qualquer não-OK
  redireciona a `/login` (inclui sessão de staff). Nome e e-mail do cabeçalho e
  do perfil vêm daí; o resto do mock fica.
- **Logout real:** `POST /api/auth/sign-out` + apaga o cookie, como o backoffice.
- **Backoffice:** botão e estado do acesso na ficha do aluno; aviso de
  `email_conflict` na aprovação em Pagos; ação nova na matriz de
  `permissions.ts`.

## 8. Config e i18n

- **`PORTAL_PUBLIC_URL`** nova e obrigatória em `apps/api/src/config.ts`.
  `fly secrets set` **antes do merge** (`CLAUDE.md` §7, `check-secrets`).
- Chaves novas nos três locales do app (login, forgot-password, access,
  backoffice) e o template `portal_password_reset` nos três locales de
  `packages/notifications`. O texto do `portal_credentials` passa de "suas
  credenciais" a "defina sua senha".
- Erros novos com chave i18n: `auth.invalid_credentials`,
  `portal_access.link_invalid`, `portal_access.no_confirmed_enrollment`.

## 9. Testes (escritos antes do código)

- **Domínio:** política de senha; provisionador (os quatro casos);
  resolução do login; pedido e conclusão de recuperação (cooldown, token
  expirado/usado, revogação de sessões).
- **Rotas:** autorização com papel errado em toda rota nova; **anti-enumeração**
  — conta existente, inexistente, sem senha, de staff e banida devolvem status e
  corpo idênticos no sign-in e no pedido de recuperação; formato inválido → 401;
  `sign-up/email` recusa.
- **Integração no banco** (`*.integration.test.ts`): liquidação cria a conta na
  mesma transação e desfaz junto; busca por documento normalizado; ficha
  duplicada liga à conta existente; conflito de e-mail.
- **Critério de pronto, ponta a ponta na API:** credencial real → cookie →
  `/portal/me` 200; credencial errada ou fora do formato → nunca há sessão.

## 10. Docs no mesmo PR

- `CLAUDE.md` raiz: OOC-55 perde "credenciais do portal na aprovação" do
  *Fora*; registra a conta do aluno.
- `apps/api/CLAUDE.md`: auth do aluno, provisionamento, `disableSignUp`.
- `apps/app/CLAUDE.md`: entrada do portal real.
- `docs/ARCHITECTURE.md` §5.6 (a linha "telas de login continuam mockadas").
- `README.md` "Estado atual".
- `docs/ROADMAP.md`: só sinalizar, não editar.

## Fora

Dados reais do portal (cursos, pagamentos, trâmites); MFA do staff; conta de
apoderado; índice único de documento e consolidação das duplicatas.

Limitações conhecidas: o contador por identificador do sign-in aceita tipo de
documento em texto livre (limitado pelo teto por IP); o cooldown da recuperação
é checado sem trava, então um duplo envio simultâneo pode emitir dois tokens
(só o último vale).

Em aberto:

- **Corrigir o e-mail em conflito ainda não tem caminho.** Editar o e-mail de
  contato da ficha (o formulário da ficha é mock, sem rota na API) e trocar o
  e-mail de login de uma conta não estão construídos; um `email_conflict` só se
  resolve quando isso existir. A cópia do painel diz que o e-mail precisa ser
  corrigido antes de enviar o acesso, sem prometer edição na ficha.
