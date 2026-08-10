// @ts-check
import { defineConfig } from "astro/config";

// Static output — site público (Astro estático), conforme CLAUDE.md.
// Trilíngue: español (PE) padrão sem prefixo, /en e /pt prefixados.
export default defineConfig({
  site: "https://onlyonecoin.edu.pe",
  server: { port: 4321 },
  i18n: {
    defaultLocale: "es",
    locales: ["es", "en", "pt"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
