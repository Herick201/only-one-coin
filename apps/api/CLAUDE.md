# CLAUDE.md — `apps/api`

Carregado junto com o `CLAUDE.md` da raiz quando uma sessão trabalha aqui dentro. Regra que vale para mais de um app/pacote vive na raiz — este arquivo só tem o que é específico do backend (Fastify + workers).

---

## Pagamento

- `payments` é **agnóstico de origem**. Máquina de estados: `pending → under_review → approved | rejected`.
- Dados de extração ficam em `payment_receipts`, não em `payments`.
- **`amount_cents INTEGER`.** Nunca float, nunca `numeric` de ponto flutuante (ver também `packages/db/CLAUDE.md`).
- **Idempotency key em todo pagamento.** Duplo POST de celular ruim é certeza.
- Preço é **versionado, nunca editado**. A matrícula congela o `plan_price_id` vigente. Corrigir a tabela de preços não pode revalidar histórico. Desde a `0017` o banco recusa `UPDATE`/`DELETE` em `plan_prices` (`packages/db/CLAUDE.md`). Preço novo pode ser **agendado** — `valid_from` futuro, nunca passado (tolerância de 60 s, `PRICE_PAST_TOLERANCE_MS`). Só `master`/`admin` criam plano e lançam preço (`POST /catalog/courses/:id/plans`, `POST /catalog/plans/:id/prices`).
- Tolerância de validação **configurável no backoffice**, não constante no código.
- **Rotas de pagamento (OOC-55, `src/http/payment/`, papéis em `paymentRoles.ts`).** `GET /payments` (livro) e `GET /payments/review` (fila; janela `REVIEW_WINDOW_DAYS = 5`, provisória): `master`, `admin`, `analyst`, `billing`, `support`. `GET /payments/:id/receipt`: URL assinada de 5 min da versão processada do comprovante, só `master`/`admin`/`analyst`/`billing`, e **cada abertura vai pro `audit_log`** como `payment.receipt_viewed`. `POST /payments/:id/approve` e `POST /payments/:id/reject` (`{reason, note}`; motivos `amount_mismatch|illegible|duplicate|not_a_receipt|other`): só `master`/`admin`/`billing` — nunca `enrollment_supervisor` (`CLAUDE.md` raiz §1, trava (d)). O app só mostra a imagem se o CSP `img-src` souber a origem do bucket: `RECEIPT_IMAGE_ORIGIN` (opcional, `apps/app/src/middleware.ts`).
- **Liquidar é uma transação só** (`SettlePaymentUseCase` + `DrizzlePaymentSettlementRepository`): `UPDATE payments … WHERE status IN ('pending','under_review')` condicional — 0 linhas = 409 `payment.already_settled`, então dois revisores não liquidam o mesmo pagamento. **Aprovar:** vaga `reserved → confirmed`; vaga já `confirmed` (módulo mensal seguinte) fica intocada; vaga `released` = 409 `payment.seat_released`. **Rejeitar:** vaga `reserved → released` com `seats_taken - 1`; vaga `confirmed` fica intocada. Na mesma transação entram o outbox (`payment_approved`/`payment_rejected` para aluno e, se menor, apoderado, es-PE, dedupe pelo id do pagamento) e o `audit_log` (`payment.approved`/`payment.rejected`, com motivo e nota).
- **Ainda não existe:** credenciais do portal na aprovação, o cron da janela de 5 dias, OCR e pagamento de trâmite (constancia) na fila.

## OCR — nunca síncrono

```
submit → grava student + enrollment + payment (pending) → responde em <300ms
       → enfileira job
       → worker: normaliza imagem → pHash → extrai → valida → outbox
```

A rota de submit **não pode importar o módulo de IA.**

Escada de níveis:

| Nível | Gatilho | Ação |
| --- | --- | --- |
| 0 | antifraude (ver "Antifraude do comprovante") | nº de operação já usado bloqueia o submit; arquivo idêntico ou EXIF de editor → fila humana; pHash parecido só registra |
| 1 | padrão | Gemini 3.1 Flash-Lite |
| 1r | falha técnica (timeout, 429) | retry mesmo modelo, até 3x, backoff |
| 2 | confiança baixa em campo crítico | modelo de **outra família** |
| 3 | divergência ou ilegível | fila humana |

- **Nunca mais de uma escalada.** Divergiu, é humano.
- **Concordância é o critério**, não o modelo mais caro. Os dois batem em `operation_number` e `amount` → aprova. Divergem → humano.
- Gravar `tier`, `model_name`, `model_version` e confiança por campo em toda extração.
- Pré-processar sempre: downscale ~1000px, escala de cinza, strip EXIF, converter HEIC.

## Upload

**Signed URL direto ao Storage (OOC-19, implementado 30/09/2026).** A imagem nunca passa pela função — é o que derruba tudo sob volume.

- `POST /receipt-uploads` (público, escopado por `seatHoldId` — o único id que existe antes do submit) mina um **POST assinado** (`@aws-sdk/s3-presigned-post`, `infra/storage/TigrisReceiptStorage.ts`), não um PUT: só a política de POST do S3 aceita `content-length-range` como condição, que é o único jeito do próprio bucket recusar arquivo grande demais sem a aplicação processar bytes. O caminho do objeto (`receipts/raw/<seatHoldId>/<receiptUploadId>`) é gerado no servidor — nunca um nome que o cliente escolheu.
- **CORS no bucket é obrigatório.** O POST do navegador pro bucket é cross-origin: sem regra, o objeto **chega** mas o navegador esconde a resposta, o checkout lê como falha e descarta um comprovante já gravado (reproduzido com Chromium real, 30/09/2026). A regra libera só `POST` e só as origens de `APP_PUBLIC_URLS` — a mesma lista que o Better Auth confia. Em produção a regra está no bucket `only-one-coin-receipts` desde 30/09/2026 (`student.*` e `backoffice.*`), configurada **pelo painel do Tigris**: a chave do app é só leitura/escrita de objeto, de propósito, e recebe `AccessDenied` pra mudar configuração do bucket. O script `pnpm --filter @ooc/api storage:cors` (idempotente, lê só as variáveis de storage + `APP_PUBLIC_URLS`, roda de fora sem banco) só funciona com uma chave Admin. Local, o init do LocalStack (`compose/localstack/ready.d/`) reaplica a cada subida, porque ele não guarda estado. **O script tem que estar em LF**, e o `.gitattributes` (`*.sh text eol=lf`) garante isso: checkout no Windows com `core.autocrlf=true` grava CRLF, o shebang vira `/bin/sh\r`, o LocalStack loga `Error while running script … No such file or directory`, o bucket não nasce e **todo upload falha no navegador sem nada no terminal da API** (o POST vai direto ao bucket). Sintoma: `curl http://localhost:4566/ooc-dev-receipts` → 404 e o container `s3` fica `unhealthy`. Clone antigo corrige apagando o arquivo e refazendo o checkout dele (`git checkout -- compose/localstack/ready.d/create-receipts-bucket.sh`, que já sai em LF com o `.gitattributes`) e `docker compose restart s3`. **Domínio novo do app entra nos dois lugares**: `APP_PUBLIC_URLS` e a regra de CORS do bucket — e quem faz a segunda é o dono, pelo painel.
- As credenciais usam os nomes que o `fly storage create` grava (`AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) — provisionar o bucket é a configuração inteira. `STORAGE_FORCE_PATH_STYLE` é nossa, `false` por padrão (Tigris); só o local liga.
- `POST /receipt-uploads/:id/confirm` é a única vez que a aplicação toca o storage depois do POST do cliente — e é um **HEAD**, não um GET: confirma que o objeto chegou (`byteSize`/`contentType`) sem ler um byte do arquivo.
- Validação por magic bytes e a normalização em si (`apps/api/src/infra/storage/normalizeReceiptImage.ts`) **não rodam na rota** — rodam no worker `receipt-normalize`, oferecido pelo `receipt-upload-relay` (BullMQ, mesmo desenho do `outbox-relay`: sweep a cada 5s, `jobId` derivado da linha, oferecer de novo é no-op). O worker baixa o objeto bruto, sniffa o tipo real com `file-type` (nunca confia no `Content-Type` que o cliente declarou), converte HEIC/HEIF com `heic-convert` (decoder próprio em WASM — não depende do build de libvips do host ter libheif) e processa com `sharp`: `.rotate()` (auto-orienta pelo EXIF antes de descartar o resto), downscale ~1000px, escala de cinza, reencode JPEG. `sharp` já não grava metadata por padrão — a remoção de EXIF é o comportamento sem precisar de flag.
- Só a **versão processada** é retida (`processed_object_key`) — a bruta é apagada do bucket assim que a processada é gravada, e também é apagada (sem gravar nada) quando a validação recusa o arquivo. `receipt_uploads.status`: `pending → uploaded → processed | rejected`.
- `receipt_uploads` é escopada por `seatHoldId` (nullable `paymentId`, preenchido dentro da mesma transação do submit que consome o hold — `DrizzlePublicEnrollmentRepository.submit`) porque no momento do upload o aluno e a matrícula ainda não existem. O submit recusa (`ReceiptNotReadyError`, 422) um `receiptUploadId` que não pertence ao hold ou que não chegou a `uploaded`/`processed`.
- O mesmo worker tira a impressão digital do comprovante (sha256 do bruto, pHash do processado, EXIF antes de ser removido) — ver "Antifraude do comprovante", abaixo. Ainda não fazem parte: extração por IA e a tela da fila humana — isso é o pipeline de OCR (`CLAUDE.md` §1 da raiz, "Sessão 26", `packages/ocr` ainda não criado).

## Antifraude do comprovante (OOC-22, decisões do dono 30/09/2026)

**O bloqueio duro é o nº de operação, não a imagem.** Um recorte não apaga o número impresso no comprovante; um hash perceptual não enxerga esse número.

- **Nº de operação já usado → o submit é recusado** (`OperationNumberAlreadyUsedError`, 422 `enrollment.operation_number_already_used`), no checkout e na matrícula manual, dentro da transação e antes de qualquer escrita (`infra/persistence/enrollment/operationNumberGuard.ts`). **Único por meio de pagamento**, não global: Plin e bancos imprimem números curtos, e os mesmos seis dígitos num Yape e num BCP são operações diferentes. Comparado normalizado (`normalizeOperationNumber`: só letras e dígitos, maiúsculo; zeros à esquerda ficam). Conta pagamento em qualquer status — o rejeitado também gastou a operação. Não há índice único ainda (linha importada do legado pode repetir — mesmo expand/contract do documento do aluno, `CLAUDE.md` §1): a corrida entre dois submits é fechada por `pg_advisory_xact_lock` na chave `(método, número)`, e o índice por expressão `payments_method_operation_key_idx` serve a busca. **A expressão SQL e a função do domínio mudam juntas.** Hoje o número é o que a pessoa digitou; quando a OCR existir, o número lido do comprovante entra na mesma checagem.
- **pHash registra, nunca bloqueia nem roteia.** Medido com o pipeline real (`src/tests/receipt-fingerprint.test.ts`): todo Yape fica a 0–4 bits de todo outro Yape — outro aluno, até outro preço —, porque o que muda (hora, nº de operação) é texto pequeno demais pra um hash 32×32. Um recorte fora da grade (`CROP_BOXES`: topo/base em passos de 5% até 20%, laterais 0 ou 8%) do mesmo comprovante, ao contrário, se afasta 10–16. A suíte roda com três fontes porque o CI (Ubuntu, sem Arial) renderiza o fixture diferente do Windows — foi assim que a grade antiga, de 10%, passou local e quebrou no CI. Então o índice único de `payment_receipts.image_phash` **virou índice comum** (migration `0016`) — ele recusaria o segundo aluno honesto —, e `similar_image` é evidência gravada pro revisor e pra OCR combinar com o nº de operação, nunca um motivo pra mandar pagamento pra fila: mandaria todo Yape.
- **Triagem (nível 0)** roda no worker `receipt-screen` (`ScreenReceiptUploadUseCase`), oferecido pelo mesmo `receipt-upload-relay` assim que o comprovante está `processed` **e** ligado a um pagamento — as duas coisas acontecem em qualquer ordem. Só comprovante de **outro pagamento** conta como uso: a mesma foto subida de novo depois do hold vencer não é reuso. Grava `fraud_signals` + `screened_at` em `receipt_uploads`, uma vez só. Os sinais que **roteiam** (`pending → under_review`): `identical_file` (sha256 igual), `edited_with_software` (EXIF `Software` de editor de imagem) e `modified_after_capture` (salvo mais de um minuto depois de capturado). Os que só **registram**: `similar_image` e `payer_name_mismatch`. Nenhum sinal rejeita pagamento — quem decide é o revisor.
- **Sem EXIF não é sinal.** Print de tela e foto repassada pelo WhatsApp não têm metadado nenhum; só a presença dele dizendo algo conta. GPS e identificador de aparelho nunca são lidos (`readExifFacts` pega só `Software`, `DateTimeOriginal`, `ModifyDate`).
- **Cruzamento de titular** (`payerNameMatches`): a regra existe e está testada, mas **não roda** — o nome do pagador só existe quando a OCR ler o comprovante, e o formulário não pede. Parente pagando é normal, então o descasamento só informa. Não confundir com o **destinatário** (a conta da Only One Coin), que é validação da OCR, não antifraude.

## Vagas — condição de corrida

Nunca validar vaga na aplicação. Instrução atômica única:

```sql
UPDATE class_groups
   SET seats_taken = seats_taken + 1
 WHERE id = $1 AND seats_taken < capacity AND status <> 'draft'
RETURNING seats_taken;
```

Zero linhas = cheia. Mais `CHECK (seats_taken <= capacity)` como rede (`packages/db/CLAUDE.md`).

Estados de vaga: `reserved` → `confirmed` (pagamento aprovado) → `released` (rejeitado ou expirado).

**Dois relógios, não um.** A vaga é presa antes do pagamento — quem paga já pagou com a vaga na mão — e isso cria duas janelas com prazos muito diferentes:

| Relógio | De → até | Prazo | Quem devolve a vaga |
| --- | --- | --- | --- |
| **Hold de checkout** | vaga presa no checkout → comprovante enviado | **15 min** | o próprio checkout, ao expirar |
| **Janela de revisão** | comprovante enviado → pagamento aprovado ou recusado | **5 dias** | cron de reserva parada |

O hold curto existe porque o pagamento acontece **fora da plataforma** (Yape/transferência, `CLAUDE.md` §2 — não há pasarela): a pessoa sai da página, paga no app do banco e volta. Sem o hold, ela paga e descobre a turma cheia na volta — e não existe fluxo de devolução. Expirado o hold sem comprovante, a vaga volta pra turma e o checkout recomeça do passo da turma.

Enviado o comprovante, a vaga **continua `reserved`** e passa a correr no relógio de 5 dias. Ela só vira `confirmed` quando o pagamento é aprovado (OCR ou revisão humana) — enviar comprovante não confirma matrícula, só garante que a vaga não cai pelo hold curto.

Os dois prazos são **configuráveis no backoffice** (`/backoffice/settings`), nunca constante no código — mesma regra da tolerância de valor.

**Como o hold curto está implementado (29/09/2026):**

- A vaga é presa numa linha de `seat_holds`, não em `enrollments` — no passo da turma ainda não existe aluno. O claim faz o `UPDATE … seats_taken + 1` acima e grava o hold na mesma transação; o **submit consome o hold** (troca a vaga de mãos) e nunca incrementa `seats_taken` de novo.
- **Um relógio só, o do Postgres.** `expires_at` é carimbado com `now()` do banco, e o submit e a varredura comparam com `now()` também. O contador do navegador é conforto; o submit recusa hold vencido (`enrollment.seat_hold_expired`) mesmo que a varredura ainda não tenha passado.
- A varredura (`seat-hold-sweep`, BullMQ job scheduler no mesmo processo) expira e devolve em **uma instrução**, com `FOR UPDATE SKIP LOCKED` — o submit trava o hold com `FOR UPDATE`, então os dois nunca devolvem e consomem a mesma vaga.
- `released` (o checkout trocou de turma) e `expired` (a varredura) são estados separados de propósito: a taxa de expiração é o dado que decide se os minutos mudam de novo.
- Os minutos vivem em `platform_settings` (linha única, CHECK 5–60), mudam por usecase com `audit_log`, e valem para o próximo hold — nunca para um que já está correndo.
- **O relógio longo (5 dias) ainda não tem cron.** A regra acima vale; a implementação é pendência.

**Turma em rascunho e janela de inscrição (OOC-35, 01/10/2026):**

- **Rascunho nunca toma vaga.** Os dois UPDATEs atômicos (claim do checkout e matrícula manual) levam `status <> 'draft'` no `WHERE`.
- **`sellableClassGroup()` é a definição única de "à venda"** (`infra/persistence/catalog/sellableClassGroup.ts`): status `enrolling`, não aposentada, dentro da janela opcional, e com **período e curso não aposentados** (`exists` correlacionado, então vale também dentro do `UPDATE` do claim). Usada pelo catálogo público (`GET /catalog`), pelo seletor da matrícula manual (`GET /class-groups`) e pelo claim do checkout (`DrizzleSeatHoldRepository.claim`). Não reescrever o filtro em outro lugar.
- **Horário da turma: `slots` é a fonte, `class_groups.schedule` é derivado.** `DrizzleClassGroupRepository` regrava o texto a partir de `slots` em todo create/update/cópia (`infra/persistence/catalog/scheduleText.ts`, formato do seed/legado, em espanhol porque é dado, não tela). Turma legada sem `slots` mantém o texto. Nunca escrever `schedule` à mão nem ler `schedule` numa tela — tela formata `slots` pelo locale.
- **A janela vale no claim, não no submit nem no caminho manual.** Hold preso dentro da janela sobrevive ao fechamento dela; a matrícula manual do staff (`createWithPayment`) ignora a janela de propósito — exceção que só vale para chamada direta à API, porque o próprio seletor da matrícula manual (`GET /class-groups`) já lê por `sellableClassGroup()` e não oferece turma fora da janela.
- **Redução de capacidade é UPDATE condicional**, `WHERE seats_taken <= capacidade nova` — nunca ler, comparar e gravar. Usecase de catálogo não escreve `seats_taken`.
- **Lista de espera:** só entra turma cheia; saída grava `left_at` + motivo (`enrolled`, `withdrawn`, `removed_by_staff`). A matrícula manual fecha a entrada ativa com `enrolled` na mesma transação. O checkout público não fecha, então a leitura da fila (`ListWaitlistQuery`) deixa de fora quem já tem vaga viva na turma. Turma `finished`/`closed` não aceita entrada (404, como turma fora de oferta). A leitura traz o DNI, então é dos papéis de escrita do catálogo (`master`, `admin`, `enrollment_supervisor`), não de todos os leitores.

## Origem da matrícula (atribuição de canal)

Toda matrícula grava **de onde veio** — hoje `whatsapp` (link mandado pelo vendedor depois da venda fechada) ou `web` (a pessoa chegou sozinha pela landing). É campo do domínio, não analytics: fica na própria `enrollments`, não só no PostHog, porque a coordenação precisa responder "quantas matrículas o zap trouxe neste ciclo" dentro do backoffice, e porque analytics de borda se perde com bloqueador de anúncio.

- Mora na **matrícula**, não no aluno. A mesma pessoa pode voltar por outro canal no ciclo seguinte; um campo no aluno perderia o histórico.
- Capturado no **primeiro acesso** ao checkout e carregado até o submit — se a pessoa recarregar ou sair pra pagar, a origem não se perde.
- Valor **nunca vem confiado do cliente** como texto livre: é união fechada, e qualquer coisa fora dela cai em `web`.
- Os parâmetros de campanha (`utm_*`) andam junto, mas separados, para relatório — a origem é o dado de negócio, o `utm` é o detalhe da peça. **Ainda não gravados no servidor** (só no rascunho do navegador).
- **Caminho da origem até a linha:** o navegador resolve `src` na chegada e manda com o claim do hold; o servidor guarda no `seat_holds.origin` e o submit copia **do hold** para `enrollments.origin` — o body do submit não tem campo de origem. Matrícula manual grava `whatsapp` (`Enrollment.createManual`).

O link do WhatsApp é URL comum com `?course=&group=&src=whatsapp` — **prefill e atribuição, não token**: sem segredo, sem autenticação e sem preço embutido (o valor vem sempre do `plan_price` vigente, lido no servidor). Isso é o que o mantém compatível com `CLAUDE.md` §2, "sem links de matrícula tokenizados".

## Notificações

Tudo passa pela tabela `outbox`. O sistema não conhece o Brevo:

```ts
interface NotificationProvider {
  sendEmail({ to, templateKey, locale, vars }): Promise<{ providerId: string }>
}
```

- **Quem decide o e-mail é o domínio; quem grava é a transação do negócio.** O usecase monta os `EmailNotification` (`packages/domain/src/notification/`) e o repositório os insere na `outbox` **dentro da mesma transação** da mudança que os causou (`insertOutboxEmails(tx, …)`). Matrícula que dá rollback não deixa e-mail pra trás; e-mail nunca é enviado no caminho síncrono da rota.
- **Uma linha = um e-mail para um destinatário**, com `dedupe_key` único (`<template>:<id>:<student|guardian>`, `ON CONFLICT DO NOTHING`) — emitir de novo é no-op.
- **Destinatários (decisão 27/09/2026):** aluno sempre; apoderado junto **quando o aluno é menor**. Credenciais do portal só pro aluno. As duas matrículas (checkout e manual) mandam "matrícula recebida"; a manual sai em `es-PE`, o checkout no idioma do formulário.
- **Entrega:** `outbox-relay` (BullMQ job scheduler, 5 s) oferece as linhas `pending` à fila `send-email` com `jobId` derivado da linha — oferecer de novo é no-op, job perdido é reoferecido. O worker leva `pending → sent | blocked | failed`; 5xx/429/rede retentam (5 tentativas, backoff exponencial), outro 4xx e template quebrado falham na hora. O payload do job é só o `outboxId` — PII não vai pro Redis.
- **PII:** `recipient`/`vars` nunca vão pro log; `last_error` guarda só código (`brevo_http_400_invalid_parameter`), nunca a mensagem do provedor.
- **Guarda de staging (`CLAUDE.md` §6):** `AllowlistGuard` embrulha qualquer provider e só abre com `NODE_ENV=production`. Fora disso, só `EMAIL_ALLOWLIST` (endereços e/ou `@dominio`); recusado vira `blocked`, sem retry. O `Dockerfile` fixa `NODE_ENV=production` em toda imagem — staging construído dela precisa sobrescrever `NODE_ENV`, ou a guarda fica aberta.
- Sem `BREVO_API_KEY` o provider é o `LogNotificationProvider` (renderiza e loga, não envia) — opcional até em produção, pra deploy nunca cair por segredo de e-mail faltando; o boot avisa com `warn`. Com a chave, `EMAIL_SENDER_ADDRESS` é obrigatório.

Templates versionados no repositório (`packages/notifications/src/locales/{es-PE,pt-BR,en}.json`, mesma estrutura de chaves nas três), enviados como HTML pronto — nunca template desenhado só no painel do Brevo.

## Domínio e fila (fronteira com `packages/domain`, `packages/queue`)

`packages/domain` é DDD puro — nunca importa Fastify, provedor de banco ou Redis. A implementação concreta (repositórios Drizzle, adapters) mora aqui, em `apps/api/src/infra/`. Detalhe completo da regra de fronteira e da exceção do vocabulário de erro HTTP: `packages/domain/CLAUDE.md`. Padrão de código (`BaseModel`/`BaseUseCase`, `RouteBuilder`, `container.ts`, entrypoints): `packages/domain/README.md` e `apps/api/README.md`.

**Biblioteca embutida no processo nunca responde HTTP com o shape dela própria.** Better Auth (e qualquer outra lib embutida que fale HTTP direto) roda dentro de `apps/api`, mas isso não abre exceção ao contrato de erro (`docs/ARCHITECTURE.md` §5.7): a mensagem/código nativo do provedor nunca chega ao cliente como está — sempre traduzido pro envelope `{status, reason, path?, errorId?}` do projeto antes de sair, e o texto original (se não puramente técnico) fica só no log do servidor (`CLAUDE.md` §4, "zero string de UI... inclui mensagem de erro de API"; §6, "stack trace ao usuário proibido"). Implementação: `apps/api/src/http/auth/AuthCatchAllRoute.ts`.

## Feature flags — ponta do backend

O catálogo e o interruptor de feature flags são coisa de `apps/app` (`apps/app/CLAUDE.md`, seção "Feature flags"). Aqui só vive a ponta que a API precisa garantir: `PUT /feature-flags/:key` é `.owners()` (e-mail do domínio dos donos, nunca papel), `GET /feature-flags/state` é público (sem sessão), e toda troca grava no `audit_log`. Deny-by-default (abaixo) continua valendo mesmo pra rota `.owners()`.

## Autorização deny-by-default

Todo usecase/rota declara explicitamente `.roles(...)`, `.owners()` ou `.public()` — rota sem declaração falha o **boot** da aplicação (não só o CI), via `onRoute` hook. `onRequest` resolve a sessão, responde 401 sem sessão válida e 403 fora do papel/domínio exigido. Suíte de teste cobre os três casos (`apps/api/src/infra/plugins/authorization.test.ts`). Ver `CLAUDE.md` §8 para o quadro de papéis e o que cada um pode.

## Gestão de cargos — anti-escalada de privilégio

O `role` **nunca** mora em lugar que o próprio usuário escreve. Regras duras:

- `role` vive em coluna protegida na própria tabela `user` gerenciada pelo Better Auth (`additionalFields.role`, `input:false` — API pública de signup/update não aceita esse campo). `apps/api` **não expõe rota genérica de `UPDATE`** nela — a única forma de mudar `role` é um usecase dedicado de promoção (não um `PATCH` de usuário comum), nem para o próprio dono, nem para admin comum fora desse fluxo.
- **Nunca** guardar `role` em algo editável pelo usuário (ex.: `user_metadata` de provedores de auth que expõem isso). `input:false` garante que o `role` do Better Auth é preenchido **server-side**, nunca a partir do payload de cadastro/perfil do usuário.
- `apps/api` lê o `role` a partir do registro do usuário autenticado no banco a cada requisição sensível — **nunca** de header/JWT montado pelo cliente.
- Toda mudança de cargo → `audit_log` append-only.

**Modelo de criação de staff (fechado):**

1. **Bootstrap:** o primeiro `admin` nasce por **script versionado** (`apps/api/src/scripts/seed-admin.ts`, `pnpm --filter @ooc/api seed:admin`) — não por migration SQL de mão: a senha precisa do hash real do Better Auth, que uma migration não consegue reproduzir sem reimplementar o hasher. O script assina o cadastro pelo próprio `auth.api.signUpEmail` (hash correto) e só então promove `role` pra `admin` direto no banco — o único ponto autorizado a contornar `additionalFields.role.input:false`, porque nunca roda sobre HTTP. Local/dev apenas; nunca apontar pra staging/produção. Credencial de desenvolvimento: `admin@admin.com` / `admin1234` (Better Auth recusa senha com menos de 8 caracteres — não foi afrouxado pro seed).
2. **Depois:** **só `admin`** cria/promove staff, pela UI, via usecase dedicado (`PromoteUserRoleUseCase`, `packages/domain/src/identity/`) que exige **re-autenticação fresca** do admin. Nenhum outro papel promove ninguém. O plugin `admin` do Better Auth não garante reautenticação fresca sozinho — é o usecase, não o provedor, que impõe essa checagem antes de escrever o `role`.

---

Regras de negócio, stack, i18n e o quadro de papéis/RBAC estão no `CLAUDE.md` da raiz — não duplicadas aqui. Estrutura de pastas e estado real do backend: `apps/api/README.md`.
