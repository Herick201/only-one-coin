import { content, defaultLang, type Lang } from "./ui";

const PREFIXED: Lang[] = ["en", "pt"];

/** Resolve the active locale from the request URL (default has no prefix). */
export function getLangFromUrl(url: URL): Lang {
  const seg = url.pathname.split("/")[1];
  return (PREFIXED as string[]).includes(seg) ? (seg as Lang) : defaultLang;
}

/** Translation object for a locale. */
export function useTranslations(lang: Lang) {
  return content[lang];
}

/** Prefix an internal path with the locale (default locale stays unprefixed). */
export function withLang(lang: Lang, path: string): string {
  const clean = "/" + path.replace(/^\/+/, "");
  if (lang === defaultLang) return clean;
  return clean === "/" ? `/${lang}/` : `/${lang}${clean}`;
}

/** Format a PEN amount for display: "S/80", "S/69.90" (pt uses a comma). */
export function formatPEN(amount: number, lang: Lang): string {
  const num = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `S/${lang === "pt" ? num.replace(".", ",") : num}`;
}

/** Same path as the current URL, but in `target` locale (for the switcher). */
export function switchLangPath(url: URL, target: Lang): string {
  const parts = url.pathname.split("/");
  const rest = (PREFIXED as string[]).includes(parts[1])
    ? "/" + parts.slice(2).join("/")
    : url.pathname;
  return withLang(target, rest || "/");
}
