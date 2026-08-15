# Arquitetura

Detalhe de apoio ao que está fechado no `CLAUDE.md`. Este documento não substitui o `CLAUDE.md` — quando os dois divergirem, `CLAUDE.md` vence.

A seção de autorização/RBAC tem origem no documento de arquitetura pré-implementação (apresentação ao cliente, ago/2026). O capítulo de opções de hospedagem/custo desse documento **não** está refletido aqui — hospedagem de `apps/api` segue em aberto (ver `CLAUDE.md` §5, seção "Domínio e fila").

---

## 1. Estrutura do monorepo

pnpm workspaces com dois grupos, no mesmo padrão do diagrama do `CLAUDE.md` §3: `apps/*` é o que roda como processo/deploy próprio; `packages/*` é código compartilhado, sem processo próprio — ninguém faz `pnpm dev` dentro de um `package`.

| Pacote | Papel | Depende de | Status |
| --- | --- | --- | --- |
| `apps/landing` (`@ooc/landing`) | Site público, Astro estático | Nenhum pacote interno | Implementado |
| `apps/app` (`@ooc/app`) | Next.js App Router — portal do aluno + backoffice | Nenhum pacote interno hoje | Mockup, sem acesso a dado real |
| `apps/api` (`@ooc/api`) | Fastify — expõe `@ooc/domain` via HTTP, roda os workers de `@ooc/queue` | `@ooc/domain`, `@ooc/queue` | Scaffold rodando local, persistência em memória |
| `packages/domain` (`@ooc/domain`) | DDD puro — entidades, usecases, portas de repositório | Nenhum (núcleo — não depende de nada do monorepo) | Scaffold com contexto de exemplo |
| `packages/queue` (`@ooc/queue`) | Contrato de fila compartilhado (schemas zod, producers) | Nenhum pacote interno (só `bullmq`/`ioredis`/`zod`) | Scaffold com job de exemplo |
| `packages/db`, `notifications`, `ocr`, `i18n`, `shared` | Reservados no diagrama do `CLAUDE.md` §3 | — | Ainda não criados |

**Regra de dependência:** `apps/*` depende de `packages/*`, nunca o contrário. Dentro de `packages/*`, `@ooc/domain` é o núcleo — todo o resto pode depender dele, ele não depende de nenhum outro pacote do monorepo (nem de `@ooc/queue`, nem de infra). Hoje só `apps/api` importa `@ooc/domain` e `@ooc/queue`; `apps/app` é candidato futuro a importar `@ooc/queue` como produtor de job (ver `CLAUDE.md` §5), mas ainda não faz isso.

**Único ponto de acesso ao banco:** só `apps/api` (e seus workers) têm credencial de Postgres — reforça a decisão de autorização na aplicação da seção 2 abaixo. `apps/app` nunca fala direto com o banco.

---

## 2. Caminho A vs. Caminho B — por que autorização na aplicação

Duas filosofias válidas de mercado para onde a regra "quem pode ver o quê" é aplicada:

| | Caminho A — regra no banco (RLS) | Caminho B — regra na aplicação |
| --- | --- | --- |
| Onde vive a regra | Policy declarativa por tabela, no Postgres | Middleware/usecase, no código do backend |
| Vantagem | Defesa mais próxima do dado | Modelo mental mais familiar; banco nunca fica exposto direto à internet |
| Risco principal | Policy mal escrita vaza dado **silenciosamente**, sem erro visível | Falha de autorização é bug de API comum — risco e ferramental conhecidos |
| Exige da equipe | Domínio real de RLS + suíte de teste específica pra isso | Disciplina normal de teste de autorização por rota |

**Decisão fechada: Caminho B.** Dois motivos, não um só:

1. Enquanto o backend era Supabase, o banco ficava exposto direto ao cliente via PostgREST — RLS era a única barreira possível. Sem Supabase, todo acesso passa por `apps/api` (Fastify); o banco nunca é tocado pelo browser. A barreira de RLS deixa de ser a única linha de defesa disponível — a aplicação já é essa linha.
2. RLS exige disciplina de teste que a equipe não tem consolidada hoje. A opção mais segura é sempre a que a equipe consegue operar corretamente, não a teoricamente mais forte.

Isso não proíbe usar RLS depois como camada **extra** de defesa em profundidade — só que ela nunca é o mecanismo de aceite documentado. O mecanismo de aceite é sempre o teste de autorização da aplicação (`CLAUDE.md` §8, item 5 do portão de CI).

---

## 3. RBAC — papéis, escopo e fase

| Papel | Onde acessa | Fase | Pode | Nunca pode |
| --- | --- | --- | --- | --- |
| `admin` | Backoffice | MVP | Gestão completa, cria/promove outros papéis, configura regras | — (toda ação é auditada, sem exceção) |
| `coordinator` | Backoffice | MVP | Gerencia turmas, períodos, matrículas, relatórios acadêmicos | Não cria nem promove usuários |
| `treasury` | Backoffice | MVP | Revisão financeira, conciliação de pagamentos, aprovação individual | Sem acesso a dado acadêmico não financeiro |
| `student` | Portal do aluno | MVP | Vê os próprios dados, status de matrícula, materiais, certificados | Nunca acessa dado de outro aluno, nem manipulando URL |
| `guardian` | Portal do aluno | MVP | Dá consentimento, acompanha dados do(s) menor(es) sob sua responsabilidade | Vinculado explicitamente ao(s) estudante(s); não é papel genérico |
| `mass_approver` | Backoffice | **Fase 2** | Aprovação em lote de casos já validados com alta confiança pela IA | No MVP, aprovação é sempre individual por `treasury`/`coordinator`. Aprovação em lote sempre gera auditoria individual por caso, nunca um log agregado |
| `teacher` (docente) | Backoffice (visão restrita) | **Fase 2** | Vê e edita **apenas as próprias turmas** (frequência, notas) | Não vê aluno/turma de outro docente — checagem no usecase, não escondida na tela |

`mass_approver` e `teacher` não bloqueiam o lançamento: aprovação em lote é otimização de operação em escala, e gestão de frequência/notas pode ficar fora do primeiro lançamento se o produto inicial for só matrícula + acesso liberado. `guardian` fica no MVP porque consentimento do responsável é exigência legal desde o dia um (público menor de idade), não conveniência.

Todo papel implementado sem exceção segue a regra dura de anti-escalada de privilégio do `CLAUDE.md` §8 ("Gestão de cargos") — não repetida aqui.

---

## 4. Segurança — checklist mínimo do MVP

A maior parte já está coberta pelos mecanismos do `CLAUDE.md` §6/§8 (tabela "Erros proibidos" + seção "Segurança"). Itens do documento de origem que valem destacar por não terem mecanismo 1:1 ainda escrito:

- Anti-enumeração de conta (login/recuperação de senha respondem igual pra conta existente e inexistente) — já coberto, `CLAUDE.md` §8.
- Reautenticação por senha (não MFA completo) para ação sensível (promoção de papel, aprovação financeira) — já é o mecanismo descrito em `CLAUDE.md` §8 pra promoção de staff.
- Storage de comprovante privado, signed URL curto, acesso registrado — já coberto.

### Pendente de confirmação — não decidido ainda

O documento de origem propõe rebaixar dois itens hoje fechados no `CLAUDE.md` para Fase 2, achando que a versão MVP mais barata já cobre o risco:

- **MFA completo** (`admin`, `treasury`) — hoje `CLAUDE.md` §8 lista como obrigatório e fechado. Proposta: reautenticação por senha cobre o MVP, MFA completo (app autenticador) entra depois, quando houver tempo de engenharia pra operar sem gerar fricção de suporte (recuperação de acesso perdido, etc.).
- **Captcha** (Cloudflare Turnstile) — hoje `CLAUDE.md` §3 lista como stack fechada. Proposta: começar só com rate limit por IP, evoluir pra captcha se houver abuso real observado em produção.

**Isso não está decidido.** `CLAUDE.md` continua valendo como está até essa confirmação acontecer — ver seção 9 do `CLAUDE.md` ("avise antes de executar" quando um pedido contradiz o que está fechado).
