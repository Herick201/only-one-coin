# OOC-21 — Semáforo de validação do comprovante

Desenho aprovado em 03/10/2026. ROADMAP Sessão 27.

## Problema

A OCR nível 1 (OOC-20) lê o comprovante e grava a leitura em
`payment_receipts`, mas **não decide nada**: nenhum pagamento muda de status
pela leitura, e a comparação do valor lido com o preço não existe em lugar
nenhum do código. A tolerância de valor aparece na tela de Comprovantes do
backoffice (`settings/receipts`), mas é mock — o servidor só conhece
`checkout_hold_minutes`.

## Decisões (do dono, 03/10/2026)

1. **Verde liquida, vermelho sugere.** Verde aprova o pagamento sozinho
   (vaga `confirmed`, e-mail `payment_approved`). Vermelho **não rejeita**:
   vai pra fila de Pagos marcado como *rejeição sugerida*, e uma pessoa
   rejeita. Motivo: a OCR lendo 15 onde está impresso 150 devolveria a vaga de
   quem pagou certo — o erro de rejeitar sozinho custa mais que o de esperar
   um revisor. A medição do nível 1 na amostra real (Sessão 26) ainda está
   pendente.
2. **Tolerância só pra cima.** "Sem descontos. Nunca." (`CLAUDE.md` §1):
   aceitar sozinho um comprovante abaixo do preço é desconto. Pagou o exato ou
   até a tolerância a mais → verde; qualquer centavo a menos não é verde.
3. **Segundo limite configurável** separa revisão de rejeição sugerida: abaixo
   de **X% do esperado** é vermelho. Pagou demais além da tolerância é sempre
   amarelo (não existe fluxo de devolução, e quem pagou não pode perder a vaga
   por isso).
4. **Padrões:** tolerância **S/0,00**; X = **50%** (provisório, trocável no
   painel — mesmo status do `CONTRACT_ALERT_DAYS`).
5. **Trava do nº de operação no verde.** O nº de operação lido tem que bater
   com o digitado (normalizado com `normalizeOperationNumber`). Não lido ou
   divergente → revisão. Sem isso, um print de outro pagamento do mesmo preço
   seria aprovado sozinho.
6. **Trava do meio de pagamento no verde** (regra do controlador na revisão
   final, 03/10/2026, a confirmar com o dono): o meio que a IA leu tem que ser
   o `payments.method` declarado. A trava do nº de operação é única **por
   meio**, então um print de Yape (S/150, nº N) reenviado como `bcp` + N
   passaria no submit, seria lido como 150 e N e aprovado sozinho. Vem depois
   do nº de operação (valor → nº → meio). Meio não lido → `payment_method_unread`;
   lido diferente do declarado → `payment_method_mismatch`; ambos revisão.
   `other` compara só o enum, nunca o texto livre.

## 1. A regra — `packages/domain/src/enrollment/ReceiptValidation.ts`

Pura, só inteiros (centavos e percentual inteiro, nunca float).

```ts
type ReceiptVerdict = "approve" | "review" | "reject_suggested";

type ReceiptVerdictReason =
  | "exact"                      // approve
  | "within_tolerance"           // approve — acima, até a tolerância
  | "overpaid"                   // review — acima, além da tolerância
  | "underpaid"                  // review — abaixo, mas ≥ X% do esperado
  | "far_below"                  // reject_suggested — abaixo de X%
  | "amount_unread"              // review — valor nulo ou leitura falhou
  | "operation_number_unread"    // review — valor ok, nº não lido
  | "operation_number_mismatch"  // review — valor ok, nº diverge
  | "payment_method_unread"      // review — valor e nº ok, meio não lido
  | "payment_method_mismatch";   // review — valor e nº ok, meio lido ≠ declarado
```

- `classifyReceiptAmount({ expectedCents, readCents, toleranceCents,
  rejectBelowPercent })` → `{ verdict, reason }`. Vermelho quando
  `readCents * 100 < expectedCents * rejectBelowPercent` (comparação estrita:
  exatamente X% é amarelo).
- `decideReceiptVerdict({ expectedCents, declaredOperationNumber, reading,
  declaredMethod, readMethod, settings })` compõe: leitura falhou ou valor nulo → `amount_unread`; senão
  classifica o valor; **só se o valor deu verde**, confere o nº de operação e, só se ele bateu, o
  meio de pagamento (`declaredMethod` × `readMethod`).
  Vermelho e amarelo de valor não olham o nº (o motivo do valor é o que o
  revisor precisa ver primeiro).
- O valor esperado é `payments.amount_cents` — o preço congelado na matrícula
  (`plan_price_id`). Nunca o preço vigente de hoje: corrigir a tabela de
  preços não revalida histórico (`apps/api/CLAUDE.md`, Pagamento).

### Casos do critério de pronto (tolerância S/0,00, X = 50%, esperado S/150,00)

| Lido | Veredito | Motivo |
| --- | --- | --- |
| S/150,00 | approve | `exact` |
| S/149,90 (centavos a menos) | review | `underpaid` |
| S/150,10 (centavos a mais) | review | `overpaid` |
| S/150,10 com tolerância S/0,50 | approve | `within_tolerance` |
| S/40,00 (muito abaixo) | reject_suggested | `far_below` |
| S/75,00 (exatamente 50%) | review | `underpaid` |

## 2. Configuração — `platform_settings`

Migration `0020_receipt_validation.sql` (aditiva):

- `platform_settings.receipt_amount_tolerance_cents integer not null default 0`,
  CHECK `between 0 and 5000` (o teto de S/50 já é o `max` da tela).
- `platform_settings.receipt_reject_below_percent integer not null default 50`,
  CHECK `between 1 and 99`.
- `receipt_uploads.validation_verdict text` (CHECK nos três valores),
  `validation_detail jsonb`, `validated_at timestamptz`, e índice parcial para
  a busca do relay.

Domínio: `PlatformSettings` ganha os dois campos com schema zod espelhando os
CHECKs; `IPlatformSettingsRepository` ganha **um setter por campo** (mesma
regra do repositório: mudar um nunca carrega cópia velha do outro). Dois
usecases — `UpdateReceiptAmountToleranceUseCase`,
`UpdateReceiptRejectBelowPercentUseCase` — no molde de
`UpdateCheckoutHoldMinutesUseCase` (valida, no-op se igual, `audit_log` com
`from`/`to`). Rotas `PUT /settings/receipt-amount-tolerance` (`{cents}`) e
`PUT /settings/receipt-reject-below` (`{percent}`), mesmos papéis e mesma
política de rate limit da rota do hold.

Valem **para a próxima validação**, nunca refazem veredito já gravado.

## 3. Pipeline — worker `receipt-validate`

```
normalize → (screen ‖ extract) → validate
```

- **Fila nova** `receipt-validate` em `packages/queue` (payload só
  `{ receiptUploadId }`, `jobId` derivado da linha).
- **Oferecido pelo `receipt-upload-relay`** quando o comprovante tem
  `screened_at is not null` **e** uma linha nível 1 em `payment_receipts`
  (lida ou falha) **e** `validated_at is null`. Esperar a triagem é o ponto:
  ela roda em paralelo com a leitura, e sem isso o verde aprovaria um arquivo
  que a triagem mandaria pra fila.
- **Só o upload mais recente do pagamento** é validado (o mesmo que a fila
  de revisão mostra). Upload mais antigo recebe o veredito gravado mas nunca
  liquida.
- `ValidateReceiptUseCase` (domínio): lê o sujeito (pagamento, status, valor
  esperado, nº digitado, leitura nível 1, configuração), decide, e chama o
  repositório que **numa transação só**:
  1. grava `validation_verdict`, `validation_detail` (`reason`,
     `expectedCents`, `readCents`, `toleranceCents`, `rejectBelowPercent` —
     os valores daquele momento) e `validated_at`, condicional em
     `validated_at is null` (reentrega é no-op);
  2. **verde e pagamento `pending`** → `UPDATE payments SET status='approved'
     WHERE id=… AND status='pending'`, vaga `reserved → confirmed`
     (`confirmed` intocada), outbox `payment_approved` (mesma montagem do
     `SettlePaymentUseCase`) e `audit_log` `payment.auto_approved` com ator
     `system:receipt-validation` e o veredito no `metadata`. Vaga `released`
     → não aprova, cai no passo 3;
  3. **amarelo, vermelho (ou verde que não pôde aprovar) e pagamento
     `pending`** → `pending → under_review`;
  4. pagamento já `under_review` (a triagem roteou) ou já liquidado → só o
     passo 1. **Verde nunca aprova `under_review`.**
- A liquidação manual (`DrizzlePaymentSettlementRepository`) continua igual;
  a automática reaproveita os mesmos pedaços SQL (vaga, outbox, audit), sem
  passar pelo usecase manual — que exige ator humano e aceita `under_review`.
- Log do worker: ids, veredito, motivo — **nunca valor lido nem esperado**
  (PII, `CLAUDE.md` §6).
- Sem `OPENROUTER_API_KEY` não há leitura, então nada é oferecido — o
  pipeline sem OCR fica como hoje.

## 4. Tela

- **Configuração › Comprovantes:** a linha da tolerância passa a salvar
  (`PUT`), e entra uma linha nova para o percentual de rejeição sugerida
  (`input` 1–99). O toast de "algumas mudanças só na tela" deixa de valer
  para esses dois; o aviso (`receipts_notice`) é revisto. Três idiomas.
- **Pagos › fila de revisão:** `GET /payments/review` traz `verdict` por item
  (`null` sem validação; senão `{ verdict, reason }`). O diálogo de revisão
  mostra uma linha com o veredito em texto do locale — *Rejeição sugerida:
  valor muito abaixo do esperado*, *Revisão: pagou abaixo do preço*, etc. Sem
  código na tela (`CLAUDE.md` §4).
- Livro de Pagos (`GET /payments`): pagamento aprovado automaticamente é só
  um aprovado — sem coluna nova nesta entrega.

## 5. Testes

- **Unitários da regra** (`packages/domain`): os seis casos da tabela acima,
  mais tolerância exatamente no limite (verde), um centavo acima do limite
  (amarelo), valor nulo, leitura falha, nº de operação ausente, divergente, e
  igual só depois de normalizar (`"00-12 34"` × `"001234"`).
- **Usecases de configuração:** fora da faixa → `InvalidPlatformSettingError`;
  igual → sem escrita nem audit; diferente → setter + audit.
- **`ValidateReceiptUseCase`** com fakes: monta o veredito certo e passa ao
  repositório; sujeito ausente → no-op.
- **Integração** (`*.integration.test.ts`, `pnpm test:api:db`): verde em
  `pending` aprova + confirma vaga + outbox + audit; verde em `under_review`
  só grava; amarelo/vermelho em `pending` → `under_review`; reentrega no-op;
  vaga `released` não aprova; upload antigo não liquida; relay só oferece
  depois de triagem + leitura.
- **Rotas:** papel errado → 403 (portão 5 do CI).

## 6. Documentação

- `apps/api/CLAUDE.md`: OCR ("Só lê, não decide" deixa de valer — vira a
  seção do semáforo), Pagamento (a tolerância agora existe), "Onde ver a
  leitura" (a cor agora diz).
- `packages/db/src/schema.ts`: comentário de `platform_settings`.
- `README.md` Estado atual.
- `docs/ROADMAP.md` Sessão 27: **sinalizar**, não editar sem confirmação.

## Fora desta entrega

- Nº de operação **lido** entrando no `operationNumberGuard` e titular lido no
  `payerNameMatches` (continuam esperando).
- Piso de confiança (`escalationConfidence`) e escalada ao nível 2 — Sessão 29.
- Mensual com módulos adiantados (`n × preço`): o valor esperado já é o
  `amount_cents` do pagamento, então funciona quando o portal existir.
- Cron da janela de 5 dias.
