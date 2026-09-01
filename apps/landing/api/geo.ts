// Vercel Edge Function — coarse geo for the language finder.
// Reads only the country the request already carries at the edge (no external
// service, no PII stored, no logging). Used by LanguageFinder to suggest a
// starting language. See CLAUDE.md §8 (privacy) and §escopo.
import { geolocation } from "@vercel/functions";

export const config = { runtime: "edge" };

export default {
  fetch(request: Request): Response {
    const { country } = geolocation(request);
    return new Response(JSON.stringify({ country: country ?? null }), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        // Coarse and non-identifying, but keep it off shared caches to be safe.
        "cache-control": "private, max-age=0, no-store",
      },
    });
  },
};
