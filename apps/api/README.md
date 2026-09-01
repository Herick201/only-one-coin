# @ooc/api

Processo Node separado do Next.js (`apps/app`). Expõe `@ooc/domain` via HTTP
(Fastify) e roda os workers que consomem `@ooc/queue` (Redis/BullMQ).

Esboço baseado no template `Psykka/template-ddd` — ver `packages/domain/README.md`
para o que foi mantido e o que mudou em relação a ele.

## Um entrypoint só

- `src/index.ts` — servidor HTTP (Fastify) e os workers de fila (BullMQ) no
  mesmo processo (`pnpm dev`).

Já existiu um `src/worker.ts` separado, pensado pra escalar/reiniciar API e
workers de forma independente — mas isso só se justifica se a hospedagem
permitir escalar cada um à parte. Como `apps/api` roda no Fly.io como VM
*always-on* única, a separação não se justificava; fundido num entrypoint só
(sessão 31/08/2026, `CLAUDE.md` §3).

Só existe script de `dev` por enquanto — build de produção (bundling,
`dist/`, etc.) fica pra quando definirmos onde e como `apps/api` é hospedado
(ver pendência abaixo).

## Estrutura

```
src/
  config.ts             # env validada com zod no boot (NODE_ENV, PORT, HOST, REDIS_URL)
  container.ts           # composition root — monta logger, repositórios e usecases de @ooc/domain
  app.ts                  # build do Fastify (zod type provider, swagger fora de produção, rotas) — usa container.logger via loggerInstance, genReqId gera UUID real
  http/
    RootRoute.ts             # rota raiz
    HealthCheckRoute.ts       # /health
    example/CreateExampleRoute.ts   # exemplo de rota chamando um usecase
  workers/
    send-email.worker.ts       # consome a fila send-email de @ooc/queue — hoje só loga (stub)
  infra/
    logger.ts                     # pino compartilhado (container.logger) — mesma instância usada pelo Fastify (request.log) e por futuros repositórios/workers
    persistence/example/InMemoryExampleRepository.ts   # implementação em memória do IExampleRepository (stub deliberado)
    plugins/swagger.ts           # plugin do @fastify/swagger + swagger-ui
    plugins/errorHandler.ts       # setErrorHandler global — mapeia HttpError (@ooc/domain) e erro de validação zod pro envelope de ErrorResponseSchema
  shared/http/RouteBuilder.ts     # builder fluente de rota (method/body/params/query/response/handler) — específico de HTTP, por isso não mora em @ooc/domain
  shared/http/ErrorResponseSchema.ts  # schema zod do contrato público de erro ({ status, reason, path, errorId }) — sem message livre (CLAUDE.md §4)
```

## Pendências conhecidas (fora do escopo deste scaffold)

- **Build/deploy**: hospedagem decidida (Fly.io, VM always-on, `CLAUDE.md` §3),
  falta o script de build de produção (bundling, `dist/`, Dockerfile) e o
  `fly.toml` — parte do trabalho desta sessão de deploy.
- **Persistência real**: `InMemoryExampleRepository` é só pra rodar local. A
  troca por acesso real a banco depende do provedor gerenciado de Postgres,
  que voltou a ser uma decisão em aberto (ver `CLAUDE.md` §3 — "Decisão em
  aberto — provedor de backend").
- **Envio de e-mail real**: `send-email.worker.ts` só loga o payload — falta
  `packages/notifications` (adapter Brevo) pra completar.
