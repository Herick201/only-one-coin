# Checkout de matrícula — o funil público

Como uma pessoa sai de "quero aprender inglês" e chega a uma matrícula
registrada, com o comprovante já na escada de OCR. Detalha o que o
`CLAUDE.md` §1 (fluxo de negócio) e §5 (vagas, pagamento, origem) fecham em
regra; aqui está a tela.

Cobre as Sessões 20–25 do `docs/ROADMAP.md`.

---

## 1. A decisão: um wizard, dois modos de entrada

O funil de hoje tem **dois públicos** que chegam em estados muito diferentes:

- quem fechou a venda no WhatsApp — **já escolheu curso e turma, já pagou**, e
  só precisa registrar quem é e mandar o comprovante;
- quem chegou sozinho pela landing — **não escolheu nada e não pagou**.

A tentação é fazer duas telas. Não fazemos: seria **um formulário de matrícula
em dois lugares**, com duas validações, dois arquivos de locale e duas chances
de divergir no primeiro campo novo. Em vez disso é **o mesmo wizard, com o
passo 1 pré-preenchido** quando o link já traz curso e turma.

| Entrada | Passo 1 | Passos 2–4 |
| --- | --- | --- |
| Landing (`/enrollment`) | escolhe idioma → curso → turma | iguais |
| Link do vendedor (`/enrollment?course=…&group=…&src=whatsapp`) | resumo do que já foi escolhido, confirmável e trocável | iguais |

**A métrica por canal não vem de ter duas telas** — vem do campo `source`
(`CLAUDE.md` §5, "Origem da matrícula"). Com uma tela só medimos o mesmo, e
ainda medimos o que duas telas não medem: **em qual passo cada canal desiste**.

> O link com query string é prefill e atribuição, **não** um link tokenizado
> (`CLAUDE.md` §2): não carrega segredo, não autentica ninguém e não carrega
> preço. Quem abrir o link de outra pessoa vê um formulário em branco com um
> curso pré-selecionado, nada mais.

---

## 2. Os quatro passos

### Passo 1 — Curso e turma

Segue a ordem que o funil do WhatsApp já usa (`docs/REGRAS-NEGOCIO.md` §7):
**idioma → curso/nível → modalidade → turma**, e só então horário, data de
início e preço.

- Só aparecem turmas `enrolling` **com vaga**. Turma cheia não vira erro no
  submit: ou não aparece, ou aparece oferecendo **lista de espera**
  (Sessão 22).
- O preço aparece **depois** da turma escolhida, e é o `plan_price` vigente,
  somente leitura. Não há desconto, nunca (`CLAUDE.md` §1) — campo de valor
  editável é campo de onde se subfatura.
- **Um curso por pessoa, por matrícula.** Não existe carrinho nem quantidade
  (`docs/REGRAS-NEGOCIO.md` §5).

### Passo 2 — Quem vai estudar

- Nome completo, tipo e número de documento, e-mail, data de nascimento.
- **E-mail Gmail ativo e com espaço**, porque o acesso à aula chega por
  Classroom (`docs/REGRAS-NEGOCIO.md` §7). O formulário avisa; não bloqueia
  outro provedor sem confirmação do cliente.
- **Nunca pedir telefone** durante o fluxo de venda/pagamento
  (`docs/REGRAS-NEGOCIO.md` §5). Não há campo de telefone no checkout.
- **Idade mínima por curso** (`courses.min_age`). Abaixo da mínima o passo não
  avança — não é aviso, é trava.
- **Menor de idade → bloco do apoderado obrigatório**: nome, documento,
  parentesco, e-mail, e o consentimento com **versão do texto, timestamp e IP**
  (Ley 29733, `CLAUDE.md` §8). Boa parte do público é menor; este é o caminho
  normal, não a exceção.

### Passo 3 — Pagamento e comprovante

Não há pasarela (`CLAUDE.md` §2). A plataforma **mostra onde pagar** e **recebe
a prova**:

- Dados de pagamento da Asociación por meio (Yape, transferência BCP), com o
  **valor exato** a pagar em destaque e botão de copiar.
- A pessoa escolhe o meio e informa o **número de operação**.
- **Comprovante obrigatório.** Sem imagem anexada o passo não avança — é o
  insumo da escada de OCR (`CLAUDE.md` §5), e uma matrícula sem ele é uma linha
  que ninguém consegue liquidar.
- Upload por **signed URL direto ao Storage** (Sessão 23) — a imagem nunca
  passa pela função. Validação por magic bytes, teto de tamanho, e normalização
  no worker (downscale, cinza, strip EXIF, HEIC → JPEG).

### Passo 4 — Revisão e envio

- Tudo o que foi preenchido, em uma tela, com link para voltar a cada passo.
- Envio → resposta em **< 300ms** (Sessão 24): grava aluno + matrícula +
  pagamento `pending`, enfileira o job de OCR e responde. A rota de submit
  **não importa o módulo de IA**.
- Tela de sucesso diz o que acontece agora: comprovante em análise, credenciais
  por e-mail quando aprovado, prazo.

---

## 3. A vaga: dois relógios

A regra está fechada no `CLAUDE.md` §5; aqui está por que ela existe.

```
passo 1 concluído ──► vaga reserved ──┬── comprovante em ≤ 10 min ──► segue reserved (janela de 5 dias)
   (turma escolhida)                  │                                        │
                                      │                                        ├── pagamento aprovado ──► confirmed
                                      └── 10 min sem comprovante ──► released  └── recusado / 5 dias ──► released
```

**Hold de checkout — 10 minutos.** Prende a vaga assim que a turma é escolhida,
antes do pagamento. Existe porque o pagamento é fora da plataforma: a pessoa sai
do navegador, abre o app do banco, paga, tira o print e volta. Sem o hold ela
pode voltar para uma turma cheia — e **não existe fluxo de devolução** no
negócio. O hold transforma um problema de dinheiro num problema de tempo.

**Janela de revisão — 5 dias.** Já existia. Começa quando o comprovante entra e
termina quando o pagamento é aprovado ou recusado.

Consequências de desenho:

- O relógio é **do servidor**, não do navegador. O cliente mostra a contagem; o
  servidor decide se expirou. Um contador de tela é conforto, não autoridade.
- **Expirou não é erro fatal.** A tela diz que a vaga voltou, oferece a mesma
  turma se ainda houver lugar, e preserva tudo o que já foi preenchido.
- **Recarregar a página não perde nada** (Sessão 20). O estado do wizard
  persiste no navegador; o hold persiste no servidor.
- Os dois prazos são **parâmetros no backoffice**
  (`/backoffice/payments/settings`), como a tolerância de valor.

> ⚠️ **A confirmar com o cliente:** 10 minutos é apertado para transferência
> BCP (Yape leva ~1 min; uma transferência entre bancos, mais). O valor é
> configurável exatamente por isso — a primeira leitura da taxa de expiração em
> produção deve decidir se sobe.

---

## 4. Origem do canal

Todo acesso ao checkout carrega uma origem, resolvida **uma vez, no primeiro
acesso**, e carregada até o submit:

| Origem | Como chega |
| --- | --- |
| `whatsapp` | link mandado pelo vendedor, `?src=whatsapp` |
| `web` | qualquer outra entrada — inclusive `src` desconhecido ou ausente |

Vai para a **matrícula**, não para o aluno: a mesma pessoa pode voltar por outro
canal no ciclo seguinte, e um campo no aluno apagaria o histórico. Os `utm_*`
seguem junto, em campo separado, para relatório de peça.

Isso é o que responde, dentro do backoffice e sem depender de analytics de
borda, **quanto do ciclo veio do zap e quanto veio do site** — e é o argumento
que fez o wizard único ganhar de duas telas.

---

## 5. O que este documento **não** decide

- **PayPal.** `docs/REGRAS-NEGOCIO.md` §4 registra PayPal como meio ativo para
  alunos no exterior, com tabela de câmbio própria. O tipo `PaymentMethod` do
  código não tem `paypal`, e a tabela de conversão é regra de preço, não de
  meio. **Confirmar com o cliente** se o checkout público atende estrangeiro
  antes de estender o tipo.
- **Procedimentos administrativos.** Hoje quem paga taxa (constancia, repetir
  módulo, mudança de horário) passa pelo **mesmo formulário** do aluno novo
  (`docs/REGRAS-NEGOCIO.md` §5). Se a nova plataforma unifica os dois num fluxo
  de "solicitação com pagamento associado" ou os separa é divergência aberta —
  não resolver sozinho.
- **Lista de espera.** Sessão 22 do roadmap. O passo 1 já prevê a oferta; o
  domínio (`waitlist_entries`) existe na migration da Sessão 6.
