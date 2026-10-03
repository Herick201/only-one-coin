/**
 * Prefixo de todas as chaves de fila no Redis.
 *
 * O Redis é compartilhado entre os projetos (NR-Labs/services), e cada um
 * entra com um user de ACL restrito ao próprio prefixo — o nosso é `ooc`,
 * limitado a `~ooc:*` e `&ooc:*`. Chave fora do prefixo não dá chave errada,
 * dá `NOPERM`: o servidor recusa.
 *
 * Tem que ser a opção `prefix` do BullMQ, nunca o `keyPrefix` do ioredis — o
 * BullMQ lança na conexão se achar `keyPrefix`, porque os scripts Lua dele
 * montam os nomes de chave por conta própria e não passariam pelo prefixo do
 * client.
 */
export const QUEUE_PREFIX = "ooc";
