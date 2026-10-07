# Verificação do e-mail do aluno no checkout

Desenho aprovado em 07/10/2026.

## Problema

O checkout público (`/enrollment`) só confere se o e-mail do aluno *parece* um
Gmail (`isGmail`, `packages/domain/src/student/fields.ts`). Nada garante que a
conta existe nem que é de quem está preenchendo. E-mail errado ali custa caro:

- o aluno não recebe `enrollment_received`, `payment_approved`/`rejected`,
  `portal_credentials` nem os lembretes do mensual;
- o convite do Google Classroom vai para a conta errada — o aluno pagou e não
  entra na aula (é por isso que o e-mail tem que ser Gmail pessoal, CLAUDE.md §1);
- com "um documento, uma ficha" (CLAUDE.md §1), o checkout atualiza o e-mail da
  ficha existente — um typo numa re-matrícula sobrescreve um e-mail bom
  (`DrizzlePublicEnrollmentRepository.ts`, update de contato).

Os erros são reais: o import da base antiga
(`apps/api/src/scripts/legacy-import/parse-row.ts`) já conserta endereços como
`nome123gmail.com`, e `docs/REGRAS-NEGOCIO.md` §7 cita o Gmail sem espaço.

## Decisões (do dono, 07/10/2026)

1. **Código de 6 dígitos em toda matrícula pelo checkout.** O passo do aluno só
   avança com o código enviado ao Gmail informado — sempre, não só quando o
   e-mail difere do da ficha (isso faria a rota revelar se o e-mail bate com a
   ficha de um documento).
2. **Só o e-mail do aluno passa pelo código.** O do apoderado (qualquer
   provedor) fica com as checagens de typo. Fica registrado que o consentimento
   não prova o acesso ao e-mail do apoderado.
3. **Re-matrícula com e-mail diferente não precisa de regra própria.** Com o
   código em toda matrícula, o checkout só sobrescreve o e-mail da ficha com um
   endereço que quem preencheu provou acessar.
4. **Backoffice sem código.** Cadastro e matrícula manual (é a equipe
   digitando) recebem só as checagens de typo; a regra do nome de usuário do
   Gmail só se aplica ali quando o endereço já é `@gmail.com` — exigir Gmail no
   painel continua esperando a OOC-65.
5. **Bounce do Brevo fica na Sessão 46 do ROADMAP.** Com o código, o e-mail do
   aluno nasce provado; o bounce vira rede para caixa cheia ou conta apagada
   depois, não para typo. ROADMAP não muda.
6. **O estado do código vive no Postgres, preso à reserva de vaga**
   (descartados: Redis — duas escritas não atômicas com o outbox e checkout fora
   do ar junto com o Redis, ou e-mail sem prova se falhar aberto; token HMAC —
   ainda exige estado para contar tentativas e soma um segredo).

## 1. Checagens de typo

Em `packages/domain/src/student/fields.ts`, ao lado de `isGmail`, para o front e
a API usarem a mesma regra.

**Nome de usuário do Gmail — recusa.** Só quando o domínio é `gmail.com`:

- de 6 a 30 caracteres;
- só letras, números e ponto — `+` (alias) também é recusado: entrega na mesma
  caixa, mas o Classroom precisa da conta;
- sem ponto no começo, no fim, nem dois seguidos.

Erro `email_gmail_username_invalid`, nos três locales. A regra entra no
próprio `EmailField`, então vale para **todo e-mail novo que já é
`@gmail.com`**: aluno e apoderado, no checkout e no cadastro do backoffice
(front e API). Endereço de outro provedor não é tocado — exigir Gmail no
backoffice continua sendo a OOC-65. Um Gmail com nome de usuário impossível não
recebe e-mail de ninguém, seja aluno ou apoderado.

Risco aceito: se existir conta Gmail antiga fora dessa regra, a recusa barra um
aluno real. Afrouxa-se se aparecer caso.

**Sugestão de domínio — não recusa, só front.** Lista fechada de typo → domínio
certo (`gmial.com`, `gmail.co`, `gmai.com`, `gmal.com`, `gmail.con`,
`gnail.com`, `gmail.cm` → `gmail.com`; idem para `hotmail`, `outlook`, `yahoo`,
que só fazem sentido para o apoderado). O campo mostra "você quis dizer
…@gmail.com?" com um botão que aplica a correção. A API não recusa por typo de
domínio: a lista nunca é completa, e para o aluno qualquer domínio não Gmail já
é recusado de todo jeito.

**"Confirmar e-mail" — só para o apoderado**, que não recebe código. Conferido
no front. O aluno não tem o campo: o código já prova o endereço.

## 2. Dados

Migration `0023`, tabela `email_verifications`:

| coluna | |
| --- | --- |
| `id` | uuidv7 |
| `seat_hold_id` | FK `seat_holds`, `onDelete: restrict` |
| `email` | normalizado (`normalizeEmail`) |
| `code_hash` | `sha256(id + ":" + code)` — o código em texto nunca é gravado |
| `attempts` | int, CHECK entre 0 e 5 |
| `expires_at` | relógio do banco, criação + 10 min |
| `verified_at` | quando o código conferiu |
| `consumed_at` | quando a matrícula usou a prova, na transação dela — qual matrícula é `seat_holds.enrollment_id` |
| `created_at`, `updated_at` | |

Sem `deleted_at`: a vida da linha é contada pelos timestamps, como em
`seat_holds`. Índice em `(seat_hold_id, created_at)` para a espera e a contagem
de envios.

O hash não resiste a força bruta offline (10⁶ códigos) se a base vazar; a
proteção é o prazo curto mais o limite de tentativas. O hash só tira o código de
dumps e logs.

**A prova morre com a reserva.** Reserva vencida e outra reivindicada pede
código novo — raro, a reserva dura `holdMinutes`.

## 3. API

### `POST /api/v1/enrollments/email-verifications`

`.public()`, corpo `{holdId, email, recipientName, locale, captchaToken}` —
`recipientName` é o nome que o aluno já digitou, para a saudação do e-mail.

1. Turnstile, fechando como na matrícula: `captcha.failed` (422),
   `captcha.unavailable` (503).
2. Reserva `active` e não vencida (relógio do banco), senão 422
   `enrollment.seat_hold_expired`.
3. E-mail passa nas regras do aluno (formato, Gmail, nome de usuário), senão
   400 com o erro de campo.
4. Espera de 60 s desde o último envio da reserva, senão 429
   `email_verification.cooldown`.
5. No máximo 5 envios por reserva, senão 429 `email_verification.too_many_sends`.
6. Na mesma transação: invalida os códigos pendentes da reserva, grava a linha
   nova e a linha do outbox. Responde 202 `{resendAfterSeconds}` — é com esse
   número que a tela conta o "reenviar"; o envelope de erro só tem `reason`, então
   nenhum erro carrega segundos ou tentativas restantes.

Rate limit (plugin OOC-24): `emailVerificationSend:ip` 20 a cada 10 min, mais
por reserva (`perSeatHold`). Sem risco de enumeração: a rota não consulta
`students` e só envia para o endereço que recebeu, então responde erros
explícitos.

### `POST /api/v1/enrollments/email-verifications/confirm`

`.public()`, corpo `{holdId, email, code}`. Sem Turnstile — o limite de
tentativas basta; rate limit por IP como as outras rotas do checkout.

Pega o código pendente mais recente da reserva para aquele e-mail e compara em
tempo constante.

| Caso | Resposta |
| --- | --- |
| Confere | 200, marca `verified_at` |
| Não confere | 422 `email_verification.code_invalid`; incrementa `attempts` (na quinta, `attempts_exhausted`) |
| Vencido | 422 `email_verification.code_expired` |
| Quinta tentativa errada já feita | 422 `email_verification.attempts_exhausted` |
| Nada enviado para esse e-mail nessa reserva | 422 `email_verification.not_found` |

### `POST /api/v1/enrollments/public`

O `SubmitPublicEnrollmentUseCase` passa a exigir, dentro da transação, uma
verificação com o mesmo `holdId`, o e-mail do aluno normalizado igual,
`verified_at` preenchido e ainda não consumida — e a consome junto com a
reserva. Sem ela: 422 `email_verification.required`. O replay idempotente não
muda: devolve a resposta guardada antes do usecase.

## 4. E-mail

Template novo `email_verification_code`, `vars: {code}`, trilíngue em
`packages/notifications/src/locales/*` (assunto, preheader, parágrafos; sem
botão). `dedupeKey` `email_verification_code:<verification id>:student`. Sai pelo
outbox como qualquer outro; o worker apaga `code` do `vars` na transição final,
como já faz com `accessUrl`/`resetUrl`.

O caminho até a caixa é o ciclo do relay (até ~5 s) mais o Brevo — a tela diz
que pode levar até 1 minuto.

**Staging:** a `AllowlistGuard` bloqueia o código para endereço fora da
`EMAIL_ALLOWLIST`, então teste do checkout em staging usa um Gmail da allowlist.
Não existe atalho de código fixo fora de produção: seria um caminho que pula a
prova.

## 5. Tela

No passo do aluno (`apps/app/src/components/enrollment/step-student.tsx`):

- E-mail do aluno válido pela §1 → bloco "Verificar e-mail" com o widget
  Turnstile e o botão **Enviar código** (o widget passa a existir também aqui,
  além da revisão; tokens são de uso único).
- Depois do envio: campo de 6 dígitos (`inputMode="numeric"`,
  `autocomplete="one-time-code"`), **Reenviar** com contagem de 60 s, **Trocar
  e-mail** (zera o bloco), dica de que pode levar até 1 minuto e cair no spam.
- Código certo → selo "verificado".
- **Continuar** exige o e-mail verificado, além do `ready` de hoje.
- A prova `{holdId, email}` entra no rascunho (`sessionStorage`); recarregar não
  pede código de novo, editar o e-mail apaga a prova.
- Matrícula voltando 422 `email_verification.required` → volta ao passo do aluno
  com a mensagem.

Todas as chaves nos três locales do app (`step.student.verify_*`, erros
`email_verification.*`, as duas regras da §1). Nenhum código de domínio na tela.

## 6. Testes

- **Domínio:** regra do nome de usuário do Gmail; tabela de sugestão de domínio;
  usecases de envio, confirmação e consumo com repositórios em memória (prazo,
  tentativas, espera, invalidação do código anterior, e-mail trocado, reserva
  vencida).
- **API:** as rotas novas entram nas checagens de CI que já existem (papel
  declarado, rate limit obrigatório no boot); testes de rota para Turnstile e
  erros; `*.integration.test.ts` do repositório contra o Postgres migrado —
  gravação atômica com o outbox, consumo na transação da matrícula, prova já
  consumida não reutilizável.
- **Worker:** `code` sai do `vars` na transição final.
- **App:** validação e sugestão do checkout.

## 7. Docs no mesmo PR

- `apps/api/CLAUDE.md`: Notificações (template novo, `code` apagado do outbox) e
  seção curta da verificação do checkout.
- `CLAUDE.md` §1: o item "e-mail do aluno tem que ser Gmail pessoal" passa a
  dizer que o checkout prova o Gmail com código.
- `docs/MATRICULA-CHECKOUT.md`: o passo novo.
- `README.md`, Estado atual.

## Fora

- Webhook de bounce do Brevo e telas de entregas reais — Sessão 46.
- Código para o e-mail do apoderado.
- "Conta tomada por documento" (spec 2026-10-05, Em aberto): o código prova que
  quem preenche acessa o e-mail novo, não que é dono do DNI.
- Exigir Gmail no backoffice — OOC-65.
- Serviço externo de validação de e-mail (mudança de stack, mais um terceiro com
  dado pessoal, e o Gmail não confirma caixa de forma confiável).
