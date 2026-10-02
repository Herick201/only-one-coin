# Avaliação da OCR — taxa de acerto em comprovantes reais

Critério de pronto da Sessão 26 do `ROADMAP.md` (OOC-20): **20 comprovantes
reais extraídos e conferidos à mão, com taxa de acerto documentada.** Este
arquivo guarda o protocolo e o resultado de cada medição. Toda troca de
prompt (`packages/ocr/src/receiptPrompt.ts`) ou de modelo
(`GEMINI_RECEIPT_MODEL`) mede de novo e acrescenta uma linha no histórico.

## Protocolo

1. **Juntar a amostra fora do repositório.** Comprovante real é dado pessoal
   (`CLAUDE.md` §6) — nunca entra no Git. O script recusa uma pasta dentro do
   repo. Variar de propósito: Yape, Plin, BCP, Interbank e pelo menos um
   "outro" (BBVA, Scotiabank…); print de tela e foto de celular; alguma
   imagem torta, cortada ou borrada. A amostra que só tem print limpo de
   Yape mede o caso fácil.
2. **Rotular à mão** num `labels.csv` na mesma pasta, lendo cada imagem:

   ```csv
   file,amount,operation_number,payment_method,payer_name,paid_at
   yape-01.jpg,120.00,08312457,yape,,2026-09-14 21:05
   bbva-02.png,25.00,000123456,other:BBVA,Maria Quispe,2026-09-15
   ```

   Célula vazia = "não aparece no comprovante" — o certo é o modelo devolver
   nada. `payment_method` é `yape`/`plin`/`bcp`/`interbank` ou
   `other:<nome impresso>`. `paid_at` é horário de Lima, hora opcional.
   `payer_name` é quem **enviou** o dinheiro, não o destinatário.
3. **Rodar** com as variáveis de OCR no `apps/api/.env` — `RECEIPT_OCR_PROVIDER`
   (`gemini` ou `openrouter`) e a chave desse provedor; sem banco, sem bucket.
   Pra comparar os dois caminhos, roda duas vezes trocando o provedor:

   ```bash
   pnpm --filter @ooc/api ocr:eval -- /caminho/da/amostra
   ```

   Cada imagem passa pelo mesmo `normalizeReceiptImage` da produção e pela
   mesma chamada do worker.
4. **Conferir** o `ocr-eval-details.csv` (esperado × lido, por campo) — fica
   na pasta da amostra, tem dado pessoal, não sobe. Um "erro" que na verdade
   é rótulo errado se corrige no `labels.csv` e roda de novo.
5. **Registrar** abaixo o `ocr-eval-report.md` gerado — ele só tem taxa e
   confiança, nenhum valor lido de comprovante.

### Como cada campo conta como certo

| Campo | Regra |
| --- | --- |
| `amount_cents` | Igual em centavos |
| `operation_number` | Igual depois de `normalizeOperationNumber` (só letras e dígitos, maiúsculo, zeros à esquerda ficam) — a mesma comparação do antifraude |
| `payment_method` | Igual; para `other`, o nome também (sem diferenciar maiúscula) |
| `payer_name` | Igual sem diferenciar maiúscula, acento e espaços |
| `paid_at` | Mesmo instante (UTC) com hora, ou mesma data quando o rótulo não tem hora |

Em todos: rótulo vazio só é acerto se o modelo também devolveu vazio.

### O que olhar além da taxa

- **Confiança média nos acertos × nos erros**, por campo. A confiança é
  auto-relatada pelo modelo, não calibrada: se os erros vêm com confiança
  tão alta quanto os acertos, ela não serve como gatilho de escalada e o
  nível 2 (Sessão 29) precisa de outro critério (a concordância entre os dois
  modelos, `apps/api/CLAUDE.md`, já é o principal).
- **`amount_cents` e `operation_number` são os campos críticos** — são os que
  a validação e o antifraude vão usar. Titular e data são evidência pro
  revisor.

## Histórico de medições

| Data | Provedor · modelo (pedido · servido) | Amostra | Valor | Nº operação | Meio | Titular | Data | 5/5 campos | Quem conferiu |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | — | — | — | — | — |

**Pendente:** nenhuma medição em comprovante real ainda. O pipeline está
pronto e testado (unitário e integração), mas a amostra real não estava
disponível na sessão que construiu o nível 1 (02/10/2026). A Sessão 26 só
fecha com a primeira linha desta tabela.

O que já foi verificado, e **não conta como medição**: uma chamada real pela
OpenRouter (`google/gemini-3.1-flash-lite via Google`, roteamento ZDR) sobre
um comprovante de Yape **sintético** — gerado na hora, dados inventados —
leu os cinco campos certos, inclusive "09:05 p. m." → 21:05 de Lima, sem
confundir código de segurança nem celular com o nº de operação. Prova que o
pedido é aceito e a conversão funciona ponta a ponta; não diz nada sobre
foto torta, comprovante de banco ou print cortado.
