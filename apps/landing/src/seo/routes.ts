import { courseSlugs } from "../i18n/ui";

// Paths that exist AND deserve to be indexed, written in the default locale
// without prefix. The sitemap and llms.txt both read from here, so a new page
// is declared once instead of being forgotten by one of them.
//
// Deliberately absent: /blog and /comunidad (placeholder "muy pronto" pages —
// they carry `noindex` until they have real content) and the header links that
// have no page yet (/nosotros, /contacto, /mi-cuenta).
export const indexablePaths: string[] = [
  "/",
  "/cursos",
  ...courseSlugs.map((slug) => `/cursos/${slug}`),
  "/preguntas-frecuentes",
];

/** Relative priority hint for the sitemap. Home > courses > the rest. */
export function sitemapPriority(path: string): string {
  if (path === "/") return "1.0";
  if (path.startsWith("/cursos")) return "0.8";
  return "0.5";
}
