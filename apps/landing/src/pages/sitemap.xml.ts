import type { APIRoute } from "astro";
import { languages, htmlLang, type Lang } from "../i18n/ui";
import { withLang } from "../i18n/utils";
import { indexablePaths, sitemapPriority } from "../seo/routes";

const LANGS = Object.keys(languages) as Lang[];

/** Same shape the canonical tag uses: absolute, no trailing slash but the root. */
function absolute(site: URL, lang: Lang, path: string): string {
  const localized = withLang(lang, path).replace(/(.)\/$/, "$1");
  return new URL(localized, site).href;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error("astro.config `site` is required to build the sitemap");

  const entries = indexablePaths.flatMap((path) =>
    LANGS.map((lang) => {
      // Every localized URL carries the full alternate set (including itself)
      // plus x-default — that is what tells Google these are translations of
      // one page and not three competing duplicates.
      const alternates = LANGS.map(
        (alt) =>
          `      <xhtml:link rel="alternate" hreflang="${htmlLang[alt]}" href="${escapeXml(
            absolute(site, alt, path),
          )}" />`,
      ).join("\n");

      return `  <url>
    <loc>${escapeXml(absolute(site, lang, path))}</loc>
${alternates}
      <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(
        absolute(site, "es", path),
      )}" />
    <changefreq>weekly</changefreq>
    <priority>${sitemapPriority(path)}</priority>
  </url>`;
    }),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
