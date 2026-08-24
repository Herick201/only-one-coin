import { Fredoka, Poppins } from 'next/font/google'

/**
 * The landing's typography, on the public checkout.
 *
 * `globals.css` says the app is one family — Inter — because portal and
 * backoffice are working tools: tables, amounts, long sessions. The checkout is
 * not that. It is the screen somebody reaches straight from the marketing site,
 * still deciding whether to trust it with a payment, and a font change on that
 * hop reads as having been handed off to a different company.
 *
 * So this is a deliberate, scoped exception: Fredoka for display and Poppins
 * for body, the same pair the landing loads, applied only under
 * `/enrollment`. Portal and backoffice keep Inter.
 *
 * Applied through `.className` rather than a CSS variable on purpose: the
 * `--font-sans` token is declared on `:root` (see the note in `globals.css`),
 * and a variable injected on a wrapper further down would not reach it.
 */
export const display = Fredoka({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
})

export const body = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})
