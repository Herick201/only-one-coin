# OOC-55 — Matrícula em revisão sai das listas e é resolvida em Pagos

Desenho aprovado em 01/10/2026.

## Problema

Matrícula cujo pagamento ainda não foi confirmado aparece em **Matrículas** e
**Alunos** como se fosse aluno. O lugar de decidir se aquele dinheiro entrou é
**Pagos** — e Pagos hoje é mock: não lê o banco e não existe rota que aprove ou
rejeite pagamento. Nada leva a vaga de `reserved` a `confirmed`.

## Decisões (do dono, 01/10/2026)

1. Escopo ponta a ponta: esconder + Pagos real + aprovar/rejeitar.
2. **Matrículas mostra só o que entrou** — vaga `confirmed`. Pendente, em
   revisão e rejeitada vivem só em Pagos.
3. **Alunos esconde só quem está em revisão** — quem tem matrícula reservada e
   nenhuma confirmada. Fica quem tem matrícula ativa, quem foi cadastrado à mão
   sem matrícula e quem só teve rejeitada (inativo). A busca do seletor da
   matrícula manual (`?q=`) continua achando todo mundo, para nunca duplicar
   ficha.
4. **Quem aprova não muda:** `master`, `admin`, `billing`.
   `enrollment_supervisor` continua sem Pagos (trava (d) da matrícula manual:
   quem abre a matrícula não liquida o dinheiro dela).
5. Aprovar vale para pagamento `pending` também — sem OCR, todo pagamento do
   checkout fica `pending` mesmo com comprovante. Sem comprovante, a tela avisa
   em destaque; não bloqueia.
6. A aba **Reservas** sai de Matrículas; o prazo de 5 dias vira coluna da fila
   de Pagos.

## 1. Visibilidade

### Matrículas — `GET /enrollments` (`ListEnrollmentsQuery`)

- Condição base: `enrollments.seat_status = 'confirmed'` (além de `deleted_at
  is null`). O critério é a **vaga**, não o último pagamento: no inglês
  mensual, o aluno ativo com o módulo seguinte em aberto continua aluno.
- Filtros `status` e `seat` saem da rota e da tela (viraram constantes).
- Métricas: `total` e `active` contam só confirmadas; `reserved`,
  `expiringSoon` e `released` saem do cabeçalho de Matrículas (vão para Pagos).
- Depois de abrir matrícula manual, a tela avisa "enviada para Pagos para
  confirmação" em vez de esperar a linha aparecer.

### Alunos — `GET /students` sem `q` (`ListStudentsQuery`)

- `HAVING NOT (confirmadas = 0 AND reservadas > 0)` na navegação do diretório;
  o `total` usa o mesmo critério.
- Com `q` (seletor), nada muda.
- O chip "em revisão" sai do filtro do diretório.
- A ficha do aluno (`/students/:id`) continua mostrando todas as matrículas.

## 2. API de Pagos — `apps/api/src/http/payment/`

| Rota | Papéis | O que faz |
| --- | --- | --- |
| `GET /payments` | master, admin, analyst, billing, support | Livro de pagamentos: filtros (status, meio, busca), paginação por offset e métricas, tudo no Postgres |
| `GET /payments/review` | master, admin, analyst, billing, support | `pending` + `under_review`, mais antigo primeiro; prazo de 5 dias, se há comprovante processado, sinais da triagem |
| `GET /payments/:id/receipt` | master, admin, analyst, billing | URL assinada (GET, 5 min) da versão processada; acesso vai para o `audit_log` |
| `POST /payments/:id/approve` | master, admin, billing | Aprova |
| `POST /payments/:id/reject` | master, admin, billing | Rejeita com `{ reason, note }` |

### Aprovar / rejeitar — `SettlePaymentUseCase` (`packages/domain`)

Uma transação curta no repositório:

1. `UPDATE payments SET status = $to WHERE id = $1 AND status IN ('pending',
   'under_review') RETURNING …` — zero linhas: `PaymentAlreadySettledError`
   (409). Dois cliques ou duas pessoas: só uma vence.
2. Aprovar: `UPDATE enrollments SET seat_status = 'confirmed' WHERE id = … AND
   seat_status = 'reserved'`. Zero linhas (vaga já devolvida):
   `EnrollmentSeatNotReservedError` (409), rollback.
3. Rejeitar: `seat_status = 'released'` (mesma condição) **e** `UPDATE
   class_groups SET seats_taken = seats_taken - 1`.
4. `payment_approved` / `payment_rejected` no outbox — aluno sempre, apoderado
   quando menor (`enrollmentRecipients`), `es-PE` (a matrícula não guarda o
   idioma de quem a fez).
5. `audit_log`: `payment.approved` / `payment.rejected`, com motivo e nota.

Motivos de rejeição: `amount_mismatch`, `illegible`, `duplicate`,
`not_a_receipt`, `other` (os que a tela já oferece).

## 3. Telas

- `payments/page.tsx` e `payments/review/page.tsx` leem a API
  (`lib/backoffice/payments.ts`), filtros na URL como Matrículas.
- O diálogo de revisão deixa de mostrar campos de OCR que não existem (nível,
  modelo, confiança por campo). Mostra: imagem real (ou "sem comprovante"), o
  que a pessoa declarou (meio, nº de operação), o preço congelado do plano, os
  sinais de antifraude em texto, o prazo, aprovar e rejeitar com motivo.
- Textos nos três locales. `listPayments` / `listReviewQueue` /
  `listReceiptExtractions` do mock saem quando não tiverem mais leitor.

## 4. Fora desta entrega

- Credenciais do portal na aprovação — não existe conta de aluno nem quem
  dispare `portal_credentials`.
- Cron da janela de 5 dias.
- OCR (Sessões 26/29).
- Pagamento de procedimentos (constancia).

## 5. Testes

- Integração (`*.integration.test.ts`): Matrículas e Alunos escondem o que está
  em revisão; livro e fila de Pagos; aprovação concorrente (só uma vence);
  rejeição devolve a vaga; aprovar sobre vaga liberada recusa.
- Unidade: `SettlePaymentUseCase`.
- Autorização: o teste por rota existente cobre as rotas novas.

## 6. Documentação

- `CLAUDE.md` raiz §1: regra nova (matrícula só aparece em Matrículas/Alunos
  depois de confirmada; o que está aberto é resolvido em Pagos).
- `apps/api/CLAUDE.md`, "Pagamento": aprovar/rejeitar.
- `README.md`, Estado atual.
- `docs/ROADMAP.md` Sessão 32 (Bandeja de comprovantes) — só sinalizar ao dono.
