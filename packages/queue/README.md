# @ooc/queue

Contrato de fila compartilhado entre quem **produz** jobs (ex.: `apps/app`,
quando um pagamento é aprovado) e quem **consome** (`apps/api`, workers
BullMQ). Existir como pacote separado evita que os dois lados dupliquem nome
de fila e schema de payload.

Roda sobre o **Redis self-hospedado no Fly.io** (`redis-nrlabs`, no repo
NR-Labs/services), alcançado pela rede privada da org.

Todas as chaves ficam sob o prefixo `ooc:` (`QUEUE_PREFIX`, em `src/prefix.ts`):
o user de ACL `ooc` só autoriza `~ooc:*` e `&ooc:*`, então chave fora do prefixo
volta `NOPERM` em vez de ir pro lugar errado. O prefixo tem que ser a opção
`prefix` do BullMQ — o `keyPrefix` do ioredis não serve, o BullMQ lança na
conexão se encontrar.

O rate limit/idempotência de borda **continua no Upstash**: a borda da Vercel
não alcança a rede privada do Fly (ver `CLAUDE.md`, seção 3).

## Estrutura

```
src/
  connection.ts     # factory da conexão Redis a partir de uma REDIS_URL (recebida por parâmetro — quem valida env é o app que consome)
  jobs/               # um arquivo por tipo de job: nome da fila + zod schema do payload (ex.: send-email.job.ts)
  producers/            # helpers tipados que fazem `queue.add(...)` — quem publica importa daqui, nunca monta o payload à mão
  index.ts
```

## Regra

Este pacote não valida env nem lê `process.env` diretamente — quem faz boot
(`apps/api`, e futuramente `apps/app`) valida a `REDIS_URL` com zod e passa
adiante. Mantém a regra do `CLAUDE.md` de nunca ter `localhost` fixo nem env
lida fora do boot.
