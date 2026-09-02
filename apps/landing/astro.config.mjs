// @ts-check
import { defineConfig } from "astro/config";
import appRedirects from "./integrations/app-redirects.mjs";

// Static output — site público (Astro estático), conforme CLAUDE.md.
// Trilíngue: español (PE) padrão sem prefixo, /en e /pt prefixados.
export default defineConfig({
  site: "https://onlyonecoin.edu.pe",
  server: { port: 4321 },
  // A CSP do vercel.json é `script-src 'self'`, sem 'unsafe-inline'. O Astro
  // inlina script pequeno por padrão (abaixo de assetsInlineLimit) e o browser
  // bloqueia todos em produção — header sem hover, carousel morto. Zero força
  // todo script de componente a sair como arquivo em /_astro/, que a CSP
  // permite. Dev não inlina, então o bug só existia no build publicado.
  vite: { build: { assetsInlineLimit: 0 } },
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
