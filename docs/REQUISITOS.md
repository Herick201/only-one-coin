# Sistema de Gestão Acadêmica — Requisitos (rev. 3)

> Instituto/academia de cursos **no Peru**. Este documento organiza o escopo:
> fluxo principal, roadmap por fases (8 fases / 15 semanas) e Requisitos
> Funcionais (RF), cada um com subfuncionalidades.
>
> **Escopo deste doc:** produto e engenharia. **Não** trata de legislação/
> normativa. Toda regra acadêmica ou financeira (limites de falta, número de
> trancamentos, prazos etc.) entra como **política configurável da instituição**,
> nunca como exigência legal.
>
> **Regras de negócio detalhadas** (catálogo, preços, taxas de procedimentos,
> política de certificação, funil atual) ficam em
> [`REGRAS-NEGOCIO.md`](./REGRAS-NEGOCIO.md), levantadas do processo real de
> vendas por WhatsApp — não duplicadas neste documento.

## 0. Contexto e premissas

- **País / locale:** Peru. UI em **es-PE**, moeda **Soles (S/)**.
- **Meios de pagamento (contexto local):** cartão + **Yape** e **Plin** (carteiras
  por número de celular, muito usadas em ticket baixo/médio), **PagoEfectivo**
  (efectivo em agentes) e transferência — expostos via **pasarela** (Culqi,
  Izipay, Niubiz ou Mercado Pago).
- **Tipo de negócio:** instituto de cursos que **emite certificados** (aparece na
  Fase 4). Estrutura assumida: `Curso → Módulos → Turmas` (uma turma é uma
  instância com horário e professor). Confirmado no processo real: o curso mais
  detalhado (Inglês Básico) tem 4 módulos, cada um vendável e cursável
  separadamente — o modelo `Curso → Módulos → Turmas` bate com a operação atual.
- **Catálogo real hoje:** inglês, francês, português, coreano, alemão, chinês
  mandarim e italiano — mais idiomas do que a descrição curta do negócio sugere.
  Regras de preço, procedimentos com taxa, faixas etárias e política de
  certificação levantadas do processo atual (WhatsApp) estão em
  [`REGRAS-NEGOCIO.md`](./REGRAS-NEGOCIO.md) — não duplicadas aqui.
- **Decisões em aberto** (ver §7): diferença exata entre *transferência de curso*,
  *mudança de curso* e *mudança de horário*; e o papel do *responsável*.

---

## 1. Fluxo principal (funil de captação → matrícula)

```
1. Cliente conversa pelo WhatsApp  (atendimento humano ou agente de IA)
2. Sistema/IA envia o formulário de matrícula
3. Cliente preenche o formulário
4. Cliente paga (Yape/Plin/tarjeta) e/ou envia comprovante
5. Cliente recebe e-mail transacional com as informações (confirmação / próximos passos)
```

O passo 4 é o motivo do **motor de leitura de comprovantes** (RF17): no Peru é
comum pagar por Yape/Plin e mandar o print no WhatsApp — o motor faz OCR +
conciliação em vez de conferência manual.

---

## 2. Roadmap por fases (da imagem — 8 fases / 15 semanas)

| Fase | Entregável | Semanas |
|------|-----------|:-------:|
| **0** | Descoberta, inventário de fontes de **migração**, modelo de dados e **protótipo navegável** | 1–2 |
| **1** | **Novo site** institucional publicado | 3–4 |
| **2** | **Matrícula online**, **motor de leitura de comprovantes** e **Etapa 1 da pasarela** | 5–7 |
| **3** | **Backoffice** administrativo e autonomia operacional | 8–10 |
| **4** | **Portal do Aluno** e **certificados** | 11–12 |
| **5** | **Módulo de correio** (e-mail) | 13 |
| **6** | Instalação no **celular** (app/PWA) e **painel de indicadores** | 14 |
| **7** | **Migração de dados**, **teste de intrusão**, capacitação e **go-live** | 15 |

### ⚠️ Ponto de atenção — "e-mail" aparece em dois lugares

Você tinha citado *automatizar o envio do e-mail* como prioridade, e a imagem põe
"Módulo de correo" só na **Fase 5**. São coisas **diferentes**, e vale separar:

- **E-mail transacional do funil** (confirmação de matrícula, comprovante aceito):
  faz parte do fluxo principal → deve nascer junto da **Matrícula online (Fase 2)**.
- **Módulo de correio (Fase 5):** ferramenta de **comunicação em massa** (campanhas,
  comunicados, avisos, réguas) — outro escopo, pode esperar.

Ou seja: o disparo automático que você quer não precisa esperar a Fase 5; ele é
um requisito da Fase 2.

---

## 3. Requisitos Funcionais

Cada RF traz `[Fase]` e subfuncionalidades. Limites e prazos = **parâmetros
configuráveis**, não regra fixa.

### 3.1 Domínio Acadêmico (catálogo e operação)

#### RF01 — Cadastro e Lista de Alunos `[Fase 2/3]`
- Dados pessoais e de contato, documento, foto, campos customizáveis.
- Status (ativo, trancado, transferido, concluído, evadido).
- Histórico de matrículas, turmas e certificados do aluno.
- Listagem com busca/filtros (curso, turma, status) e exportação.

#### RF02 — Cadastro e Lista de Cursos + Módulos `[Fase 2/3]`
- Catálogo: nome, descrição, carga horária, **valor (S/)**, pré-requisitos.
- **Módulos** que compõem o curso (base para "repetir módulo" — RF14).
- Definição do que gera **certificado** (curso completo e/ou por módulo — RF19).

#### RF03 — Cadastro e Lista de Professores `[Fase 3]`
- Cadastro, contato e disponibilidade de horários.
- Alocação a turmas; perfil de acesso próprio (lançar notas/faltas).

#### RF09 — Gerenciamento de Turmas `[Fase 3]`
Uma **turma** = instância de curso/módulo com horário, professor e vagas.
- Criação de turma: período, horário, capacidade/**vagas**, sede, professor.
- Matrícula de alunos na turma (consome vaga; **lista de espera** ao lotar).
- Estados: aberta / em andamento / concluída / cancelada.
- Base para mudança de horário (RF12) e transferência (RF11).

#### RF04 — Lançamento e Lista de Notas (Diário) `[Fase 3/4]`
- Avaliações por turma/módulo (provas, trabalhos, atividades) com pesos.
- Lançamento de notas e cálculo de média/situação (aprovado/reprovado).
- Comentários por aluno; consolidação em boletim.
- Situação final considerando também frequência (RF10) — regra configurável.

#### RF10 — Controle de Faltas (Frequência) `[Fase 3/4]`
- Registro de presença/falta por **sessão/aula** de cada turma.
- **Justificativa de falta** com anexo (aprovação pela secretaria).
- Cálculo de % de faltas por módulo/turma; **alerta** ao aproximar do limite
  configurável.
- Reprovação por frequência (regra parametrizável, ligada/desligada).
- Relatório de frequência por aluno/turma.

#### RF16 — Repetir o Exame `[Fase 4]`
- Solicitação/registro de **segunda chamada** ou **avaliação de recuperação**.
- Política configurável: quem pode, quantas vezes, nota máxima, se substitui a
  original.
- Rastreabilidade: nota original vs nota da recuperação, com auditoria.

### 3.2 Ciclo de vida da matrícula

#### RF06 — Gerenciamento de Matrícula `[Fase 2]`
Coração do funil: `lead → pré-matrícula → aprovação → matrícula`.
- Captura do lead vindo do WhatsApp/formulário.
- Formulário customizável; vínculo a curso + turma (respeita vagas/lista de espera).
- Fluxo de aprovação (revisar/aprovar/recusar) e emissão da 1ª cobrança.
- **Rematrícula** em novo módulo/período.

#### RF15 — Trancar o Curso (Suspensão de matrícula) `[Fase 3]`
- Solicitar/registrar trancamento **sem perder o vínculo/progresso**.
- Política configurável: quantidade e prazo máximo de trancamentos, janela em que
  é permitido.
- Estado do aluno = "trancado"; **reabertura/retorno** posterior à mesma vaga
  quando houver turma.
- Efeito no financeiro: pausa de cobranças enquanto trancado (regra configurável).

#### RF11 — Transferência de Curso `[Fase 3]`
- Mover o aluno para **outra turma do mesmo curso** (ex.: outra sede/horário),
  preservando notas/frequência/progresso.
- Verificar vaga na turma de destino; registrar histórico da transferência.
- *(Ver §7 — pode se sobrepor a RF12/RF13; confirmar a definição.)*

#### RF13 — Mudança de Curso `[Fase 3]`
- Trocar o aluno para um **curso diferente**, com **aproveitamento** dos módulos
  equivalentes já concluídos.
- Recalcular grade pendente e cobranças; registrar histórico.

#### RF12 — Mudança de Horário `[Fase 3]`
- Mover o aluno para outra turma do **mesmo curso/módulo**, só mudando o horário.
- Checagem de vaga e conflito de agenda; registro da alteração.

#### RF14 — Repetir Módulo `[Fase 3/4]`
- Rematricular o aluno em um **módulo já cursado** (reprovado por nota/frequência
  ou por opção).
- Nova turma para aquele módulo; gera cobrança conforme política.
- Histórico preserva as duas passagens pelo módulo.

### 3.3 Relacionamento e entregáveis ao aluno

#### RF08 — Responsável atribuído ao Aluno `[Fase 3]`
- Vínculo **responsável ↔ aluno** (N:N).
- Distinção responsável **de contato** vs **financeiro** (quem recebe cobrança).
- Identificação de responsáveis com pendência financeira (integra RF07).

#### RF05 — Portal do Aluno (e Responsável) `[Fase 4]`
Acesso self-service com **controle por papel**.
- Notas, frequência, boletim, horários e avisos.
- Situação financeira: faturas, comprovantes, próximos vencimentos.
- Download de **certificados** e documentos; material/links de aula.
- Solicitações self-service (trancamento, mudança de horário) com fluxo de aprovação.

#### RF19 — Certificados `[Fase 4]`
- Geração de certificado (PDF) ao concluir curso/módulo, com dados dinâmicos e
  template da marca.
- Código/URL de **verificação de autenticidade**.
- Regras de elegibilidade (nota + frequência + situação financeira quitada).

### 3.4 Domínio Financeiro

#### RF07 — Faturamento dos Cursos `[Fase 2 → 3]`
- Geração de faturas/mensalidades a partir da matrícula/curso (S/).
- **Régua de cobrança**: lembretes automáticos antes/depois do vencimento
  (e-mail/WhatsApp).
- Gestão de inadimplência e relatórios financeiros.
- Cobrança recorrente (mensalidades) via tokenização da pasarela.

#### RF18 — Pasarela de Pagos (integração em etapas) `[Fase 2+]`
- **Etapa 1 (Fase 2):** checkout embutido de **uma** pasarela (ex.: Culqi, pela
  integração rápida) aceitando **tarjeta + Yape/Plin**; link/botão de pagamento.
- **Etapas seguintes:** webhooks de confirmação, **conciliação automática**,
  tokenização para recorrência, e opcionalmente **PagoEfectivo** (efectivo) e/ou
  segunda pasarela.
- *Arquitetura:* usar o **checkout embutido/tokenização** da pasarela para o
  sistema **nunca tocar dado de cartão** (a responsabilidade de segurança do
  cartão fica na pasarela).

#### RF17 — Motor de Leitura de Comprovantes `[Fase 2]`
Automatiza a conferência de pagamentos por Yape/Plin/transferência.
- Entrada: imagem/PDF do comprovante (upload no portal ou via WhatsApp).
- **OCR** extrai: valor, data/hora, código de operação, pagador, recebedor, meio.
- **Conciliação** com a fatura em aberto (valor + janela temporal + destinatário).
- Anti-fraude: sinalizar comprovante suspeito/adulterado; cruzar com extrato/API
  da carteira quando disponível; **fila de revisão manual** para divergências.
- Estados: reconhecido / parcial / divergente / suspeito → aprovação.
- **Idempotência:** o mesmo comprovante não baixa duas faturas.

### 3.5 Comunicação

#### RF20a — E-mail transacional `[Fase 2]`
- Disparo automático no fim do formulário / na aprovação da matrícula / no
  comprovante aceito.
- Template com variáveis; provedor atrás de interface trocável; **fila com retry**
  e log de entrega; idempotência.

#### RF20b — Módulo de Correio `[Fase 5]`
- Comunicação em massa: campanhas, comunicados, avisos.
- Segmentação (por curso/turma/status) e templates reutilizáveis.

### 3.6 Plataforma

- **RF21 — Site institucional `[Fase 1]`**: páginas + captura de lead que alimenta o funil.
- **RF22 — Backoffice administrativo `[Fase 3]`**: painel único da secretaria para
  todos os cadastros e operações acima (autonomia operacional).
- **RF23 — Painel de indicadores `[Fase 6]`**: KPIs (matrículas, inadimplência,
  ocupação de turmas, evasão).
- **RF24 — App/PWA mobile `[Fase 6]`**: instalação no celular do portal do aluno.
- **RF25 — Migração de dados `[Fase 0 → 7]`**: inventário das fontes na Fase 0,
  execução e validação na Fase 7.

---

## 4. Requisitos Não-Funcionais

- **RBAC** (papéis: admin/secretaria, professor, aluno, responsável) — pré-requisito
  do Portal e do Diário.
- **Proteção de dados pessoais**: controle de acesso, minimização e trilha de
  auditoria (quem alterou nota/matrícula/fatura).
- **Multi-sede / multi-tenant** (se houver mais de uma unidade): isolamento de
  dados — decidir cedo, é caro adaptar depois.
- **Segurança de pagamento**: dado de cartão só via checkout embutido/tokenização
  da pasarela (o backend não armazena cartão).
- **Idempotência e retry** em todas as integrações externas (e-mail, pasarela,
  comprovantes, WhatsApp).
- **Teste de intrusão** antes do go-live (Fase 7); backup e exportação de dados.
- **i18n**: es-PE e formatação de moeda em Soles.

---

## 5. Modelo de domínio (entidades núcleo)

```
Lead ──> (converte) Aluno
Aluno ──< ResponsavelVinculo >── Responsavel
Curso ──< Modulo ──< Turma ──> Professor
Turma ──< Matricula >── Aluno
Matricula ──< Fatura ──< Pagamento ──< Comprovante
Turma ──< Sessao ──< RegistroFrequencia >── Aluno
Turma ──< Avaliacao ──< Nota >── Aluno
Aluno ──< Certificado
Matricula ──< EventoAcademico   (trancamento, transferência, mudança, repetição)
```

Entidades: `Lead`, `Aluno`, `Responsavel`, `Curso`, `Modulo`, `Turma`,
`Professor`, `Matricula`, `Sessao`, `RegistroFrequencia`, `Avaliacao`, `Nota`,
`Fatura`, `Pagamento`, `Comprovante`, `Certificado`, `EventoAcademico`,
`MensagemEnviada`.

> **Dica de modelagem:** trate trancamento/transferência/mudança/repetição como
> um **`EventoAcademico`** com tipo + payload, não como flags espalhadas na
> matrícula. Fica auditável e extensível.

---

## 6. Benchmark (referências de features, sem amarra local)

SIS de código aberto/mercado usados como checklist de escopo — só como referência
de funcionalidade: **OpenEduCat**, **Fedena**, **rosariosis**, **DreamClass**,
**Gradelink**. Cobrem enrollment, gradebook, frequência, portal do aluno/
responsável, billing e comunicação.

---

## 7. Decisões em aberto (confirmar antes de fechar escopo)

1. **Transferência de curso × mudança de curso × mudança de horário** — as três se
   sobrepõem. Proposta deste doc: horário = mesma turma/curso, outro horário;
   transferência = outra turma do mesmo curso; mudança = outro curso. Confirmar.
   *Pista do processo atual (ver `REGRAS-NEGOCIO.md` §5):* "traspaso" hoje é
   gratuito e distinto de "cambio de horário" (pago, só para Inglês Básico
   Regular, e só antes do início do módulo ou até a 3ª aula); "cambio de curso"
   não aparece como procedimento nomeado no processo atual — pode ser um conceito
   novo da plataforma, não uma prática já existente.
2. **Certificado**: por curso completo, por módulo, ou ambos? Exige quitação
   financeira? *Processo atual emite só ao final do curso (não por módulo), sem
   menção a quitação financeira como condição — mas o processo atual não cobre
   inadimplência, então isso pode não ter sido testado.*
3. **Responsável**: aplica-se a menores, a responsável financeiro de adultos, ou
   ambos?
4. **Pasarela**: qual entra na Etapa 1 (Culqi tem a integração mais rápida)?
5. **Recorrência**: mensalidade é cobrança recorrente tokenizada ou boletos/links
   avulsos por mês?
6. ⚠️ **Conflito com regra fechada de "pagamento único, sem parcelamento, sem
   desconto" (`CLAUDE.md` §1):** o processo atual vende o Inglês Básico por
   módulo (S/20/mês) e tem promoções de continuação (ver `REGRAS-NEGOCIO.md`
   §4). Confirmar com o cliente se esse modelo é para descontinuar na migração
   ou se precisa virar exceção documentada — **não implementar nenhuma das duas
   coisas sem essa confirmação.**
7. **Procedimentos administrativos pagos** (mudança de horário, congelamento,
   repetir módulo, constância de matrícula — ver `REGRAS-NEGOCIO.md` §5): fluxo
   de pagamento avulso, fora da matrícula original. Confirmar se usam o mesmo
   `payments`/RF18 ou se são um domínio à parte no backoffice.

---

*rev. 3 — contexto Peru, sem tratar de legislação. Regras de negócio detalhadas
movidas para `REGRAS-NEGOCIO.md`. Ajustar §7 antes de detalhar as fases.*