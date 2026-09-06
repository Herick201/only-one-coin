import type { CSSProperties } from 'react'

/**
 * Rótulos das colunas para a tabela que vira lista no celular.
 *
 * A regra de empilhamento é CSS (`globals.css`, "Tabela densa vira lista"):
 * abaixo de 48rem de coluna, cada `<tr>` vira um item e cada `<td>` mostra o
 * nome da própria coluna. O que o CSS não tem como saber é qual é esse nome —
 * o `<thead>` está escondido nessa largura. Então quem monta a tabela entrega
 * os mesmos títulos que já imprime no cabeçalho, e eles viajam na `<table>`
 * como `--stack-col-1..N`.
 *
 * Uma coluna sem título — a que só carrega o botão da linha — entra como
 * string vazia e a célula empilha sem etiqueta.
 *
 * Uso: `<table className="table-stack" style={stackLabels([...])}>`, com o
 * wrapper de rolagem levando `table-scroll`. No painel isso já vem pronto pelo
 * `TableShell`; aqui fora, é este par de classes.
 */
export function stackLabels(columns: string[]): CSSProperties {
  return Object.fromEntries(
    columns.map((label, index) => [
      `--stack-col-${index + 1}`,
      /* O `content` do CSS recebe uma string entre aspas, então as aspas fazem
         parte do valor. Um título com aspas dentro quebraria a declaração — o
         browser descarta só essa propriedade e a célula empilha sem etiqueta,
         mas é barato evitar. */
      `"${label.replace(/["\\]/g, '')}"`,
    ]),
  ) as CSSProperties
}
