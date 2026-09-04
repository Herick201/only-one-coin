# Open Finance no Peru — avaliação de integração

**Data:** 03/09/2026
**Objetivo:** responder se, para o Peru, "qualquer pessoa integra" com Open Finance/Open Banking, o que isso exige, quais APIs existem hoje e quanto custa.

---

## Veredito em uma frase

**Não existe hoje, no Peru, uma API pública regulatória de Open Finance que qualquer empresa possa simplesmente acessar.** O regime geral está em fase de diagnóstico na SBS, com troca real de dados só prevista para **2027–2029**. O que existe de fato utilizável agora são (a) **agregadores comerciais privados** — cobertura real limitada a um único player confirmado (Prometeo) — e (b) o trilho de **interoperabilidade de pagamentos do BCRP** (Yape/Plin/bancos), que resolve outro problema: mover dinheiro entre contas, não abrir dado bancário de terceiro para consulta.

Mais relevante pro seu caso específico: **quase toda solução que eliminaria o print de comprovante (TAYPI, LigoPay, Yape Empresas, Kushki, Niubiz) exige rotear o pagamento por um QR/checkout de comércio — ou seja, virar uma pasarela de pago dentro do fluxo**, o que o `CLAUDE.md` §2 lista explicitamente como fora de escopo do Only One Coin. Isso não invalida a pesquisa, mas muda a pergunta de "dá pra integrar" para "dá pra integrar sem contradizer a decisão já fechada de não ter pasarela".

---

## 1. Status regulatório — "Open Finance" formal ainda não existe

Não há lei específica de *Finanzas Abiertas* em vigor. O que existe:

- **SBS** criou um Departamento de Finanzas Abiertas (out/2025) e publicou uma **Hoja de Ruta** em fev/2026, com cronograma declarado: diagnóstico (2026) → regulação e padrões (2026–2027) → troca real de dados entre entidades (2027–2029) → expansão a outros setores (a partir de 2029). Operacionalidade plena esperada só para **início de 2028**.
- A única peça normativa **já aprovada** dentro desse guarda-chuva é o **Reglamento de Banking as a Service (BaaS)** (Res. SBS N° 01747-2026, aprovado 6/7/2026) — descrito como "uma forma específica de Open Finance", não o regime geral.
- Uma tentativa legislativa anterior (Proyecto de Ley 1584/2021-CR) nunca virou lei.

**Nota de transparência da pesquisa:** não foi possível confirmar (a) capital mínimo exato para registro como ESP no BCRP, (b) se o regulamento de iniciadores de pagos (previsto para Q2/2026) foi de fato publicado, nem (c) se o direito de portabilidade de dados (PL 7870/2020) foi promulgado.

## 2. Quem é obrigado a participar, e quem pode integrar

Nada de mandato geral ainda — isso só chega na fase de regulação (2026–2027). O que já é mandatório é adjacente ao open finance, não o open finance em si:

- **Interoperabilidade de billeteras** (Circular BCRP N° 0024-2022): obrigatória desde 31/3/2023 para Yape/BCP, Plin/BBVA-Scotiabank-Interbank e demais entidades reguladas de pagamento.
- **Novo Reglamento del Sistema Nacional de Pagos** (Circular BCRP N° 0022-2025, vigente 1/4/2026): cria a categoria **ESP (Entidades de Servicios de Pago)**, com prazos escalonados de autorização/registro por volume transacionado em 2025 (limiares em S/60M e S/100M).

**Dois caminhos para um terceiro (empresa comum) integrar hoje:**

1. **Via BaaS** — não precisa de licença bancária própria: associa-se contratualmente a um banco/emissora de dinheiro eletrônico já supervisionado, que carrega a responsabilidade regulatória. Deve declarar ao usuário que não é supervisionado pela SBS, não pode ter contratos simultâneos com múltiplos provedores BaaS pro mesmo serviço, nem subcontratar o serviço recebido.
2. **Via ESP (BCRP)** — exige **autorização** (plano de negócios de 3 anos, demonstrações auditadas, políticas de risco) ou **registro** mais leve dependendo do papel na infraestrutura de pagamento. Exige constituição/domicílio no Peru.

Não foi encontrado um caminho de "qualquer empresa com RUC, sem processo formal" para acessar dado financeiro de terceiro de forma regulada — fora desses dois regimes, o caminho prático é **acordo bilateral com um agregador comercial privado**.

## 3. O trilho paralelo que já funciona: interoperabilidade Yape/Plin

Tecnicamente parte do mesmo movimento de "abertura" do sistema financeiro peruano, mas resolve outro problema — mover dinheiro entre contas/apps, não consultar saldo/extrato de terceiro:

- Já em Fase 4 de implementação — **iniciação de pagamento a partir de qualquer app**, prevista para 2026, com >186 milhões de transações interoperáveis/mês no 1º semestre de 2025.
- **Não existe hoje API pública/semi-pública** para um terceiro comum consultar ou confirmar pagamento Yape/Plin/transferência de forma direta. A conexão à Câmara de Compensación Electrónica (CCE) é restrita a entidades reguladas.
- O regulamento de **iniciadores de pagos** do BCRP (que resolveria isso) estava previsto para Q2/2026 — publicação efetiva **não confirmada** até a data desta pesquisa.

## 4. Provedores de API disponíveis hoje

### Agregadores de dados bancários (open finance "clássico")

| Provedor | Cobertura Peru | O que oferece | Preço conhecido |
|---|---|---|---|
| **Prometeo** | BCP, BBVA, Interbank, Scotiabank, BanBif, Pichincha (~80% dos bancos peruanos já em 2022/23) | Extrato/saldo, validação de conta, iniciação de pagamento conta-a-conta | Não público — cobrança por chamada, faixa reportada US$ 0,14–0,50/call (fora do Peru, decrescente por volume) |
| **Belvo** | Nenhuma confirmada — só México, Brasil, Colômbia | Peru citado como mercado "de interesse futuro" | Sandbox grátis; produção a partir de US$ 1.000/mês |
| **Finerio Connect** | Não confirmada (parceria com Nisum cita Peru como alvo) | Agregação de dados | Não público |
| **Fintoc** | Nenhuma — só Chile e México | — | N/A |

### Confirmação de pagamento Yape/Plin — sempre via papel de comércio

| Provedor | Cobertura | O que oferece | Preço |
|---|---|---|---|
| **Yape Empresas** (BCP) | Yape | QR de comércio + webhook de confirmação | 2,95% sobre recebido; exige RUC + conta BCP |
| **Izipay** (Plin Interbank) | Plin | Checkout com token, teto S/5.000 | Não público |
| **Culqi** | Yape (tokenizado) | Token de 5 min, teto S/2.000/transação | Gateway padrão |
| **Kushki** | Yape, Plin, cartões | Gateway unificado | 3,44% + IGV |
| **Niubiz** | Yape, Plin, cartões | Gateway/POS (34% do volume já é Yape/Plin) | ~3,25% + S/0,25 |
| **Yuno** | Yape, Plin, cartões | Orquestração multi-gateway numa API só | Não público |
| **TAYPI** | Yape, Plin (QR interoperável) | Verifica direto com o banco, sem print, liquidação T+1 | 2,50% + S/0,20 + IGV, sem mensalidade |
| **LigoPay** | Yape, Plin, banca móvel, conecta direto à CCE/BCR | Cobrança + dispersão + validação em tempo real | Não público |
| **BiPe Alerta** | Yape, Plin | Webhook simples de notificação de pagamento | Não público, doc técnica escassa |

**Todos os itens da segunda tabela, exceto potencialmente LigoPay, roteiam o pagamento por um checkout/QR de comércio — isto é, seriam pasarela de pago no fluxo, hoje fora de escopo do projeto.**

## 5. Custos — ordem de grandeza

- **Setup/mensalidade fixa:** Belvo cobra a partir de US$ 1.000/mês (produção); Prometeo e demais não publicam.
- **Por chamada/transação:** Prometeo US$ 0,14–0,50/call (fora do Peru); gateways de pagamento (Kushki, Niubiz, TAYPI) cobram 2,5%–3,44% + taxa fixa por transação — modelo de adquirência, não de consulta de dado.
- **Requisitos não financeiros:** pessoa jurídica é premissa implícita em todo onboarding (nenhum provedor formaliza "precisa de RUC", mas nenhum atende pessoa física); PCI-DSS/ISO 27001 não é exigido para agregadores de **dado** (só relevante se tocar em dado de cartão); onboarding de produção leva ~1–2 semanas com agregador, 4–8 semanas com banco direto.
- **Free tier de produção:** não existe — sandbox é grátis, produção é sempre contrato comercial mesmo em volume baixo.
- **Comparação com o que vocês já usam (Gemini Flash-Lite lendo o print):** OCR/IA custa frações de centavo por imagem (~US$ 0,0001–0,0002). Qualquer agregador ou gateway pesquisado fica **3 a 4 ordens de grandeza mais caro por unidade** — e ainda assim resolve um problema diferente (verificar do lado do banco vs. ler o que o aluno enviou).

## 6. A tensão com o escopo do Only One Coin

Vale registrar com clareza, porque veio direto da pesquisa e toca uma decisão já fechada no `CLAUDE.md`:

- O fluxo atual (`CLAUDE.md` §1) é: aluno paga por Yape/Plin/transferência **fora da plataforma**, sobe o comprovante, IA lê. Isso funciona porque não depende de nenhuma conta bancária da própria Asociación estar conectada a nada.
- Qualquer solução que **elimina** o print (TAYPI, Yape Empresas, Kushki, Niubiz) faz isso transformando a Asociación num comércio com QR/checkout próprio — ou seja, **pasarela de pago dentro da plataforma**, explicitamente fora de escopo (`CLAUDE.md` §2).
- A única linha que **não** cruza essa fronteira é ler o **extrato da própria conta bancária da Asociación** via um agregador de dados (Prometeo, por exemplo) e casar transferências recebidas com matrículas pendentes automaticamente — isso é leitura de dado, não processamento de pagamento. Mas dois problemas práticos: (1) cobre só transferência bancária tradicional, não Yape/Plin pessoal, que é como a maioria paga hoje; (2) custo por chamada é ordens de grandeza acima do OCR atual, para resolver só uma fração do problema.

**Isso não é uma recomendação de mudar nada agora** — é a fronteira que a pesquisa revelou. Se a ideia for ir além disso (virar comércio Yape/Plin, adotar TAYPI/LigoPay/Kushki), isso muda o fluxo de negócio descrito no `CLAUDE.md` §1 e precisa ser conversado antes, não decidido em código.

## 7. Recomendação

1. **Curto prazo:** nenhuma ação. Não há API pública madura no Peru, e as alternativas privadas custam ordens de grandeza mais que o OCR atual pra resolver o mesmo problema (ou menos — a maioria só cobre banco, não Yape/Plin pessoal).
2. **Se quiser reduzir a fila de revisão humana sem mudar o fluxo de negócio:** o ganho mais barato continua sendo afinar o pipeline de OCR (`CLAUDE.md` §5), não trocar por open finance.
3. **Se a Asociación abrir conta bancária dedicada e o volume de transferência bancária (não Yape/Plin) crescer:** vale uma conversa comercial com **Prometeo**, hoje o único agregador com cobertura confirmada de bancos peruanos, para reconciliação automática — sem virar pasarela.
4. **Revisitar em 2027–2028:** é quando a SBS projeta troca real de dados via Finanzas Abiertas — reavaliar quando o regime geral (não só BaaS) estiver regulamentado, porque hoje qualquer decisão seria sobre uma peça que ainda pode mudar de forma.

---

### Fontes principais
Regulação: [SBS — Hoja de Ruta Finanzas Abiertas](https://www.sbs.gob.pe/Portals/0/Hoja-de-Ruta-FA.pdf) · [El Comercio](https://elcomercio.pe/economia/peru/sbs-alista-el-diseno-de-las-finanzas-abiertas-en-el-peru-como-avanza-este-sistema-y-que-escenarios-evalua-la-entidad-noticia/) · [Infobae — BaaS aprovado](https://www.infobae.com/peru/2026/07/06/adios-a-los-bancos-sbs-aprueba-nuevo-reglamento-baas-y-usuarios-en-peru-podran-solicitar-creditos-desde-fintech-y-apps/) · [BCRP — Interoperabilidade](https://www.bcrp.gob.pe/sistema-de-pagos/interoperabilidad/estrategia-de-interoperabilidad-de-los-pagos-minoristas.html) · [IUPANA — regime ESP](https://iupana.com/2026/02/09/psp-peru-nuevo-actor-regulado-carga-responsabilidades-alinearse-estandar-financiero/)

Provedores: [Prometeo](https://prometeoapi.com/en) · [Ecommercenews Peru](https://www.ecommercenews.pe/ecosistema-ecommerce/2023/prometeo-conecto-80-por-ciento-de-bancos-peruanos.html/) · [Yape FAQ](https://www.yape.com.pe/preguntas-frecuentes/yape-negocios/como-puedo-verificar-que-he-recibido-un-pago-por-yape) · [TAYPI](https://taypi.pe/blog/guia-completa-webhooks-pagos-tiempo-real/) · [LigoPay](https://ligopay.pe/api/) · [Kushki — tarifas](https://www.kushkipagos.com/commissions-fee) · [Yuno — case PeruRail](https://y.uno/newsroom/perurail-selects-yuno-as-payment-orchestration-partner-to-drive-efficiency-and-regional-growth)

Custos: [Belvo — pricing](https://belvo.com/plans-and-pricing/) · [Google AI — Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) · [Shinkansen — infraestrutura de pagos Perú](https://blog.shinkansen.finance/la-infraestructura-de-pagos-en-peru-lo-que-todo-cfo-tiene-que-saber-2/)

*(lista completa de fontes disponível sob pedido — cada agente de pesquisa registrou a lista integral usada)*
