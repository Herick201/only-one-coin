/**
 * The panel's tab look, in one place: a row of browser-style tabs sitting on
 * the line that opens the content below them. The selected one is a white card
 * whose bottom edge paints over that line, so it reads as the sheet you are
 * looking at rather than as a label with an underline.
 *
 * Shared by the section tabs (real routes) and by the in-page strips that cut
 * one list two ways. They behave differently — one navigates, the other is
 * state — but a panel with two different-looking tab rows reads as two panels.
 *
 * Classes only, no copy and no markup: the caller owns whether its tab is a
 * link or a button (CLAUDE.md §4).
 */

/**
 * `overflow-x-auto` porque num telefone três ou quatro abas não cabem em 343px,
 * e sem isto elas empurram o documento inteiro (CLAUDE.md §5). A rolagem é a
 * própria dica: a aba seguinte fica meio cortada na borda, que é o que faz a
 * pessoa arrastar. A barra some — a fatia cortada já diz que tem mais.
 */
export const tabStripClass =
  '-mt-2 flex items-end gap-1 overflow-x-auto border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

export function tabClass(active: boolean): string {
  return `-mb-px flex min-h-tap shrink-0 items-center gap-1.5 whitespace-nowrap rounded-t-lg border px-3.5 py-2 text-sm font-semibold transition ${
    active
      ? 'border-line border-b-white bg-white text-brand-blue shadow-[0_-2px_6px_rgba(15,23,42,0.06)]'
      : 'border-transparent bg-slate-100 text-muted-foreground hover:bg-slate-200/70 hover:text-ink'
  }`
}
