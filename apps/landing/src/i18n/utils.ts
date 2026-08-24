import { content, courseSlugs, defaultLang, type CourseSlug, type Lang } from "./ui";
import { legalContent } from "./legal";

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

/**
 * Short title for the browser tab. The home page is the brand alone; every
 * other page is the name it carries in the menu ("Nosotros", "Blog", the
 * course name). The long, keyword-rich title stays on og:title and on the
 * search snippet — it never had room in a tab anyway.
 */
export function tabTitle(url: URL, lang: Lang): string {
  const t = content[lang];
  const parts = url.pathname.split("/").filter(Boolean);
  const path = (PREFIXED as string[]).includes(parts[0]) ? parts.slice(1) : parts;
  const first = path[0] ?? "";
  const second = path[1] ?? "";

  switch (first) {
    case "":
      return t.meta.siteName;
    case "about":
      return t.nav.about;
    case "courses":
      return (courseSlugs as readonly string[]).includes(second)
        ? t.courses.list[second as CourseSlug]
        : t.nav.courses;
    case "faq":
      return t.nav.faq;
    case "blog":
      return t.nav.blog;
    case "community":
      return t.nav.community;
    case "contact":
      return t.nav.contact;
    case "terms-and-conditions":
      return legalContent[lang].terms.title;
    case "privacy-policy":
      return legalContent[lang].privacy.title;
    // A page nobody mapped falls back to the brand rather than to an empty tab.
    default:
      return t.meta.siteName;
  }
}
