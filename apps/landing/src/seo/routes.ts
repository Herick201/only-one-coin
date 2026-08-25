import { courseSlugs } from "../i18n/ui";

// Paths that exist AND deserve to be indexed, written in the default locale
// without prefix. The sitemap and llms.txt both read from here, so a new page
// is declared once instead of being forgotten by one of them.
//
// Deliberately absent: /blog and /community (placeholder "muy pronto" pages —
// they carry `noindex` until they have real content) and the header links that
// live in `apps/app`, not here (/login, /enrollment).
export const indexablePaths: string[] = [
  "/",
  "/about",
  "/contact",
  "/courses",
  ...courseSlugs.map((slug) => `/courses/${slug}`),
  "/faq",
  "/preuniversitario",
  "/privacy-policy",
  "/terms-and-conditions",
];

/** Pages that exist for the record, not for traffic. */
const legalPaths = new Set(["/privacy-policy", "/terms-and-conditions"]);

/** Relative priority hint for the sitemap. Home > courses > the rest > legal. */
export function sitemapPriority(path: string): string {
  if (path === "/") return "1.0";
  if (path.startsWith("/courses")) return "0.8";
  if (legalPaths.has(path)) return "0.3";
  return "0.5";
}
