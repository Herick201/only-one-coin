// Netlify Edge Function — coarse geo for the language finder.
// Reads only the country the request already carries at the edge (no external
// service, no PII stored, no logging). Used by LanguageFinder to suggest a
// starting language. See CLAUDE.md §8 (privacy) and §escopo.
import type { Context } from "https://edge.netlify.com";

export default (_request: Request, context: Context): Response => {
  const country = context.geo?.country;
  return new Response(
    JSON.stringify({
      country: country?.code ?? null,
      countryName: country?.name ?? null,
    }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        // Coarse and non-identifying, but keep it off shared caches to be safe.
        "cache-control": "private, max-age=0, no-store",
      },
    },
  );
};

export const config = { path: "/api/geo" };
