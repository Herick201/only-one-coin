// @ts-check
import { defineConfig } from "astro/config";
import appRedirects from "./integrations/app-redirects.mjs";

// Static output — site público (Astro estático), conforme CLAUDE.md.
// Trilíngue: español (PE) padrão sem prefixo, /en e /pt prefixados.
export default defineConfig({
  site: "https://onlyonecoin.edu.pe",
  server: { port: 4321 },
  // Costura local com `apps/app` (matrícula + portal). Em produção quem faz
  // isso é o Vercel (`middleware.ts`); a integration só existe no dev server.
  integrations: [appRedirects()],
  i18n: {
    defaultLocale: "es",
    locales: ["es", "en", "pt"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
