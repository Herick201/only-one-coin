# Migração de DNS para Cloudflare

**Data:** 03/09/2026
**Objetivo:** cortar os nameservers de `onlyonecoin.edu.pe` para o Cloudflare sem downtime, com atenção especial a não interromper o e-mail (Google Workspace) em nenhum instante da propagação.

**Status:** plano — corte ainda não executado. Ver bloqueadores na seção 2.

---

## Veredito em uma frase

O corte de nameserver no registrador não é o que causa downtime — copiar a zona errado é. Se a zona no Cloudflare responder **exatamente igual** à zona atual (mesmo IP, mesmo MX, mesmo SPF) antes de qualquer nameserver mudar, não existe instante em que um resolvedor no mundo receba resposta diferente, esteja ele batendo no DNS antigo ou já no Cloudflare. Existem dois bloqueadores reais para começar (seção 2), e o `.pe` é ccTLD — vale contar com a delegação levando mais tempo pra propagar que um domínio genérico.

---

## 1. Diagnóstico do que existe hoje

Levantado por consulta pública (`dig`/`whois`) em 03/09/2026, antes de qualquer acesso a painel — cobre só o que é visível de fora.

- **Domínio:** `onlyonecoin.edu.pe`
- **Registrador:** NIC.PE. Titular: Jimmy Berrocal (`jberrocal@gmail.com`).
- **DNS que resolve ao vivo:** `ns1-4.bersoft.pe`.
- **E-mail em produção hoje:** **Google Workspace** (MX aponta pros `ASPMX.L.GOOGLE.COM`) — não o Zoho Mail Lite listado no `CLAUDE.md` §3 como decisão fechada para a caixa de staff. Esse é o provedor planejado para a plataforma nova, ainda não implementado; o domínio real está 100% no Workspace.
- **Site (root + www):** aponta para `185.181.252.84`, hospedagem compartilhada (provável WordPress atual — coerente com `CLAUDE.md` §1, "site público reescrito, substituindo WordPress").

### Registros encontrados

| Tipo | Nome | Valor | Tratamento no Cloudflare |
|---|---|---|---|
| A | `@` | `185.181.252.84` | DNS only |
| CNAME | `www` | `onlyonecoin.edu.pe` | DNS only |
| MX | `@` | `1 ASPMX.L.GOOGLE.COM` | DNS only — sempre (Cloudflare não permite proxy em MX) |
| MX | `@` | `5 ALT1` / `5 ALT2.L.GOOGLE.COM` | DNS only |
| MX | `@` | `10 ALT3` / `10 ALT4.L.GOOGLE.COM` | DNS only |
| TXT | `@` | `v=spf1 ip4:185.181.252.82 include:spf.mysecurecloudhost.com +a +mx +ip4:192.250.231.249 +ip4:192.250.231.251 +ip4:173.208.96.116 ~all` | copiar literal, char a char |
| TXT | `@` | `google-site-verification=w6RQTzq…` | copiar literal |
| TXT | `_dmarc` | ausente | gap, não bloqueia o corte |
| TXT | `google._domainkey` | ausente no seletor padrão | gap, não bloqueia o corte |
| CAA | `@` | ausente | gap, não bloqueia o corte |
| — | `aula.onlyonecoin.edu.pe` | ainda não existe | fora de escopo (projeto ainda não está no ar) |

Faltam no levantamento público: qualquer registro só visível dentro do painel atual (`webmail`, `autodiscover`, `ftp`, `cpanel` — típicos de hospedagem cPanel). Precisam ser confirmados antes do corte.

## 2. Bloqueadores em aberto

1. **WHOIS e resolução ao vivo divergem.** O WHOIS do NIC.PE lista `ns1/ns2.mysecurecloudhost.com` como nameservers, mas toda consulta real resolve através de `ns1-4.bersoft.pe`. Antes de replicar a zona, é preciso confirmar qual painel efetivamente edita os registros — copiar do lugar errado é o risco central deste plano.
2. **Escopo do e-mail a confirmar.** Este plano assume que a migração de DNS **preserva o Google Workspace como está**, e que a troca para o Zoho Mail Lite (`CLAUDE.md` §3) é uma frente separada, posterior. Se não for esse o caso, o cronograma abaixo muda.
3. **Acesso à conta NIC.PE** do titular (Jimmy Berrocal), necessário para o corte de nameserver em si.

## 3. Por que dá pra fazer sem downtime

- **Antes do corte:** baixar o TTL de todos os registros na zona atual para ~300s. É essa TTL curta que evita cache velho segurando uma resposta por horas depois da troca.
- **Zona espelhada:** o Cloudflare recebe uma cópia idêntica da zona — mesmo IP, mesmo MX, mesmo SPF — antes de qualquer nameserver mudar.
- **Durante a propagação:** alguns resolvedores já veem Cloudflare, outros ainda veem o DNS antigo. Como a resposta é idêntica nos dois, o visitante nunca percebe a diferença.

## 4. Estratégia — fases, não datas

**Fase 1 — Acesso e zona completa.** Resolver os bloqueadores da seção 2: identificar quem tem acesso ao painel de `ns1-4.bersoft.pe`, puxar o zone file completo (não só o que é visível por consulta pública), confirmar acesso à conta NIC.PE, confirmar que o Workspace fica como está. Nada das fases seguintes começa sem isso.

**Fase 2 — Baixar TTL na zona atual.** Todo registro (A, MX, TXT) para ~300s, ainda na zona antiga. É o que dá janela de propagação curta na fase de corte — sem isso, resolvedores guardam a resposta velha em cache por horas.

**Fase 3 — Montar e validar a zona no Cloudflare.** Adicionar o domínio, deixar o scanner automático rodar e depois conferir registro a registro contra o zone file puxado na Fase 1. MX e o TXT do SPF entram **DNS only** — nunca proxiados; o A/CNAME do site também fica DNS only por enquanto, já que ligar o proxy laranja é decisão separada, não misturar com o corte.

**Fase 4 — Corte de nameserver no NIC.PE.** Trocar os NS do domínio para os dois que o Cloudflare atribuir. Nenhum conteúdo de registro muda nesse passo — só a delegação; a zona já é espelho da atual, então não existe janela de resposta errada.

**Fase 5 — Monitorar a propagação.** Consultar contra `1.1.1.1` e `8.8.8.8` direto, de redes diferentes, até ver o Cloudflare respondendo nos dois. Mandar e-mail de teste nos dois sentidos (enviar e receber) repetidamente — é o sinal mais direto de que o Workspace não parou. Carregar o site de fora para confirmar que o A/CNAME resolve igual.

**Fase 6 — Estabilizar.** Confirmar via WHOIS que o NIC.PE já mostra os nameservers do Cloudflare, subir a TTL de volta a um valor normal, manter o DNS antigo ativo (não cancelar) por um período como rede de segurança antes de qualquer limpeza.

## 5. Antes de considerar pronto

- Zero divergência entre a zona antiga e a zona no Cloudflare, registro por registro — inclusive os que só aparecem dentro do painel.
- MX nunca proxiado; SPF copiado literal, sem quebra de linha ou caractere alterado.
- E-mail testado nos dois sentidos (enviar e receber) depois do corte, não só antes.
- WHOIS confirma o Cloudflare como autoritativo antes de qualquer limpeza no DNS antigo.
- DMARC e DKIM ausentes hoje ficam registrados como melhoria futura, fora do escopo desta janela.
