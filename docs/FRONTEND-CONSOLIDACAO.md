# `landing` + `app` num projeto só? — avaliação em aberto

**Não decidido.** Levantado na sessão de deploy (31/08/2026), só pra registrar
a avaliação — nada aqui se implementa sem confirmação explícita
(`CLAUDE.md` §9/§10). Landing em Astro e app em Next.js App Router continuam
stack fechada (`CLAUDE.md` §3) até essa confirmação acontecer.

## Contexto

Hoje são dois projetos Vercel (`apps/landing` Astro, `apps/app` Next.js)
costurados por um redirect na borda (`apps/landing/middleware.ts`,
`docs/ARCHITECTURE.md` §5.2 — hospedagem trocada de Netlify pra Vercel nesta
mesma sessão) — quem clica num CTA da landing troca de domínio
(`onlyonecoin.edu.pe` → `aula.onlyonecoin.edu.pe`) por baixo do 302. Pediram
pra avaliar consolidar isso num projeto só, porque hoje "parece uma bagunça".

## Três caminhos, do menor custo pro maior

**Caminho A — manter como está (2 projetos + redirect de borda).** O que já
está implementado nesta sessão.
- Prós: zero risco, cada stack faz o que é melhor nela (Astro pra
  conteúdo/SEO estático leve da landing, Next.js pro app dinâmico com sessão
  e dados) — decisão já fechada, testada, com telas construídas em cima dela
  (`README.md` "Estado atual").
- Contras: troca de domínio visível na barra de endereço ao sair da landing
  pro app; dois projetos Vercel, duas envs, dois pipelines de build.

**Caminho B — Vercel Multi-Zones (rewrite), mesmo domínio, mesmos dois
codebases.** Um dos dois projetos (a landing, hoje quem já concentra o
roteamento) declara *rewrites* pros paths do app (`/enrollment`, `/login`,
`/portal`, `/backoffice`) apontando pra URL de deploy do projeto do
`apps/app`, em vez de um redirect 302 — o Vercel serve os dois como se fossem
um site só, sem troca de domínio visível. É o padrão que a própria Vercel usa
pra costurar site de marketing + dashboard (documentado como "Multi-Zones").
- Prós: resolve a sensação de "duas coisas soltas" sem tocar em uma linha da
  stack fechada — Astro continua Astro, Next.js continua Next.js, cada um
  builda e deploya sozinho. Troca só o `middleware.ts` atual (redirect) por
  um rewrite — custo baixo.
- Contras: cookie de sessão same-site ainda precisa do mesmo cuidado que já
  existe hoje (proxy same-origin do Better Auth, `docs/ARCHITECTURE.md`
  §5.6); link entre zonas não ganha prefetch automático do Next (mas hoje já
  são apenas links relativos simples, então não piora nada).

**Caminho C — um projeto só, um framework só (reabre a stack fechada).**
- **C1 — tudo em Astro.** Portar portal + backoffice (Next.js App Router,
  sessão via Better Auth, 13 rotas de painel com formulário/tabela/fila de
  revisão) pra Astro com ilhas React + adapter SSR. Astro faz SSR, mas o
  modelo dele foi pensado pra conteúdo majoritariamente estático com
  interatividade pontual — um backoffice inteiro é o oposto do caso de uso
  em que ele brilha. Reescreveria tudo que já está implementado (layout, i18n
  trilíngue, telas mockadas, wiring de auth — `README.md` "Estado atual").
- **C2 — tudo em Next.js.** A landing (SEO/JSON-LD/sitemap/hreflang já
  implementados, geo edge function, i18n próprio do Astro) vira páginas
  estáticas dentro do App Router de `apps/app`. Menos radical que C1 — Next.js
  lida bem com conteúdo estático — mas ainda é reescrever a landing inteira
  dentro de outro framework, perdendo o motivo original de ter escolhido
  Astro pro site público (build mais leve, foco em conteúdo).
- Custo alto nos dois casos: é reescrita de uma parte inteira do produto já
  construída, não um ajuste de deploy.

## Recomendação (não decisão)

Caminho B — resolve o incômodo real (UX de troca de domínio, ares de "duas
coisas soltas") pelo menor custo, sem reabrir nada que já está fechado e
funcionando. C só se justificaria por um motivo diferente (ex.: querer um
time só mexendo num framework só), não pela questão de organização levantada
aqui.
